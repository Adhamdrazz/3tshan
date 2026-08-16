import { neon } from '@neondatabase/serverless';

const allowedTypes = new Set(['cooler', 'tap', 'other']);
const allowedTemperatures = new Set(['cold', 'normal', 'not_cold']);
const allowedPrices = new Set(['free', 'paid']);
const maxNameLength = 120;
const maxPhotoUrlLength = 2_000_000;

function json(res, status, payload) {
    return res.status(status).json(payload);
}

function getDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        const error = new Error('DATABASE_URL is not configured');
        error.code = 'DATABASE_NOT_CONFIGURED';
        throw error;
    }
    return neon(databaseUrl);
}

function parseBody(body) {
    if (body && typeof body === 'object') return body;
    if (typeof body !== 'string') return {};
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
}

async function reverseGeocode(latitude, longitude) {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '10');

    const response = await fetch(url, {
        headers: {
            'User-Agent': '3tshan-water-sources/1.0 (contact project owner)',
            'Accept-Language': 'ar,en'
        }
    });

    if (!response.ok) {
        throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const result = await response.json();
    const address = result.address || {};
    return {
        country: address.country || null,
        province: address.state || address.province || address.region || address.county || null
    };
}


function isAdminRequest(req) {
    const configuredToken = process.env.ADMIN_TOKEN;
    const receivedToken = req.headers?.['x-admin-token'];
    const authorization = req.headers?.authorization || '';
    const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    return Boolean(configuredToken && (receivedToken === configuredToken || bearerToken === configuredToken));
}


function validatePayload(body) {
    const payload = parseBody(body);
    if (payload === null) return { error: 'بيانات JSON غير صحيحة.' };

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const type = typeof payload.type === 'string' ? payload.type.trim() : '';
    const tempStatus = typeof payload.temp_status === 'string' ? payload.temp_status : '';
    const priceType = typeof payload.price_type === 'string' ? payload.price_type : '';
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    const photoUrl = payload.photo_url == null ? '' : String(payload.photo_url).trim();
    const note = typeof payload.note === 'string' ? payload.note.trim() : '';
    const playerId = typeof payload.player_id === 'string' ? payload.player_id.trim().slice(0, 80) : '';

    if (!allowedTypes.has(type) && type.length === 0) {
        return { error: 'نوع مصدر المياه غير صحيح.' };
    }
    if (!allowedTypes.has(type) && (type.length > maxNameLength || !/^[\p{L}\p{N}\s،._-]+$/u.test(type))) {
        return { error: 'نوع مصدر المياه غير صحيح.' };
    }
    if (!allowedTemperatures.has(tempStatus)) {
        return { error: 'حالة حرارة المياه غير صحيحة.' };
    }
    if (!allowedPrices.has(priceType)) {
        return { error: 'نوع السعر غير صحيح.' };
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return { error: 'إحداثيات الموقع غير صحيحة.' };
    }
    if (!name) {
        return { error: 'اسم المصدر مطلوب.' };
    }
    if (name.length > maxNameLength) {
        return { error: 'اسم المصدر طويل جدًا.' };
    }
    if (!photoUrl) {
        return { error: 'صورة المصدر مطلوبة.' };
    }
    if (photoUrl.length > maxPhotoUrlLength) {
        return { error: 'حجم الصورة أو رابطها كبير جدًا.' };
    }
    if (!/^https?:\/\//i.test(photoUrl) && !/^data:image\/(jpeg|png|webp);base64,/i.test(photoUrl)) {
        return { error: 'رابط الصورة غير صحيح.' };
    }
    if (note.length > 500) {
        return { error: 'الملاحظة طويلة جدًا.' };
    }

    return {
        value: {
            name: name || null,
            type,
            temp_status: tempStatus,
            price_type: priceType,
            latitude,
            longitude,
            photo_url: photoUrl,
            note,
            player_id: playerId || null
        }
    };
}

export default async function handler(req, res) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Admin-Token');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return json(res, 204, null);
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
        return json(res, 405, { success: false, message: 'Method not allowed' });
    }

    let sql;
    try {
        sql = getDatabase();
    } catch (error) {
        console.error('Database configuration error:', error.code || error.message);
        return json(res, 503, { success: false, message: 'خدمة مصادر المياه غير مهيأة حاليًا.' });
    }

    try {
        if (req.method === 'GET') {
            if (req.query?.auth === '1') {
                if (!isAdminRequest(req)) {
                    return json(res, 401, { success: false, message: 'رمز المشرف غير صحيح.' });
                }
                return json(res, 200, { success: true, message: 'تم التحقق من صلاحية المشرف.' });
            }

                if (req.query?.stats === '1') {
                if (!isAdminRequest(req)) {
                    return json(res, 401, { success: false, message: 'غير مصرح بالوصول إلى الإحصائيات.' });
                }

                const [overview, byCountry, byProvince, byType, byStatus, byTemperature, byPrice, engagement] = await Promise.all([
                    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE type = 'cooler')::int AS coolers, COUNT(*) FILTER (WHERE type = 'tap')::int AS taps, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved, COUNT(*) FILTER (WHERE price_type = 'free')::int AS free, COUNT(*) FILTER (WHERE price_type = 'paid')::int AS paid FROM water_sources`,
                    sql`SELECT COALESCE(country, 'غير محددة') AS country, COUNT(*) FILTER (WHERE type = 'cooler')::int AS coolers, COUNT(*)::int AS total FROM water_sources GROUP BY 1 ORDER BY coolers DESC, total DESC`,
                    sql`SELECT COALESCE(country, 'غير محددة') AS country, COALESCE(province, 'غير محددة') AS province, COUNT(*) FILTER (WHERE type = 'cooler')::int AS coolers, COUNT(*)::int AS total FROM water_sources GROUP BY 1, 2 ORDER BY coolers DESC, total DESC`,
                    sql`SELECT type, COUNT(*)::int AS total FROM water_sources GROUP BY type ORDER BY total DESC`,
                    sql`SELECT status, COUNT(*)::int AS total FROM water_sources GROUP BY status ORDER BY total DESC`,
                    sql`SELECT temp_status, COUNT(*)::int AS total FROM water_sources GROUP BY temp_status ORDER BY total DESC`,
                    sql`SELECT price_type, COUNT(*)::int AS total FROM water_sources GROUP BY price_type ORDER BY total DESC`,
                    sql`SELECT COUNT(*) FILTER (WHERE event_type = 'visit')::int AS visits, COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'visit')::int AS unique_visitors, COUNT(*) FILTER (WHERE event_type <> 'visit')::int AS interactions, COUNT(*) FILTER (WHERE event_type = 'source_add')::int AS source_adds, COUNT(*) FILTER (WHERE event_type = 'source_view')::int AS source_views, COUNT(*) FILTER (WHERE event_type = 'nearest_click')::int AS nearest_clicks FROM site_events`
                ]);

                return json(res, 200, { success: true, data: { overview: overview[0] || {}, byCountry, byProvince, byType, byStatus, byTemperature, byPrice, engagement: engagement[0] || {} } });
            }

            if (req.query?.profile === '1') {
                const playerId = typeof req.query?.player_id === 'string' ? req.query.player_id.trim().slice(0, 80) : '';
                if (!playerId) return json(res, 400, { success: false, message: 'معرف اللاعب مطلوب.' });
                const [profile, sources, summary] = await Promise.all([
                    sql`SELECT player_id, points, created_at, updated_at FROM player_profiles WHERE player_id = ${playerId}`,
                    sql`SELECT id, name, type, status, points_awarded, created_at FROM water_sources WHERE player_id = ${playerId} ORDER BY created_at DESC LIMIT 20`,
                    sql`SELECT COUNT(*)::int AS total_sources, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_sources, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_sources, COUNT(*) FILTER (WHERE type = 'cooler' AND status = 'approved')::int AS approved_coolers, COUNT(*) FILTER (WHERE type = 'tap' AND status = 'approved')::int AS approved_taps FROM water_sources WHERE player_id = ${playerId}`
                ]);
                const points = Number(profile[0]?.points || 0);
                const level = Math.floor(points / 100) + 1;
                const nextLevelAt = level * 100;
                const userSummary = summary[0] || {};
                return json(res, 200, { success: true, data: { profile: profile[0] || { player_id: playerId, points: 0 }, points, level, next_level_at: nextLevelAt, points_to_next_level: Math.max(0, nextLevelAt - points), overview: userSummary, sources } });
            }

            const requestedStatus = req.query?.status;
            const adminRequest = isAdminRequest(req);
            if ((requestedStatus === 'pending' || requestedStatus === 'all') && !adminRequest) {
                return json(res, 401, { success: false, message: 'غير مصرح بالوصول إلى هذه المصادر.' });
            }
            const result = requestedStatus === 'pending'
                    ? await sql`SELECT id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, created_at FROM water_sources WHERE status = 'pending' ORDER BY created_at DESC`
                    : requestedStatus === 'all' && adminRequest
                        ? await sql`SELECT id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, created_at FROM water_sources ORDER BY created_at DESC`
                        : await sql`SELECT id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, created_at FROM water_sources WHERE status = 'approved' ORDER BY created_at DESC`;
            return json(res, 200, { success: true, data: result });
        }

        if (req.method === 'DELETE') {
            if (!isAdminRequest(req)) {
                return json(res, 401, { success: false, message: 'غير مصرح بهذا الإجراء.' });
            }

            const body = parseBody(req.body);
            const id = Number(req.query?.id || body?.id);
            if (!Number.isInteger(id) || id < 1) {
                return json(res, 400, { success: false, message: 'رقم المصدر غير صحيح.' });
            }

            const result = await sql`
                DELETE FROM water_sources
                WHERE id = ${id}
                RETURNING id, name, status
            `;
            if (!result[0]) {
                return json(res, 404, { success: false, message: 'المصدر غير موجود.' });
            }
            return json(res, 200, { success: true, data: result[0], message: 'تم حذف المصدر.' });
        }

        if (req.method === 'PATCH') {
            if (!isAdminRequest(req)) {
                return json(res, 401, { success: false, message: 'غير مصرح بهذا الإجراء.' });
            }

            const body = parseBody(req.body);
            const id = Number(body?.id);
            const status = body?.status;

            if (!Number.isInteger(id) || id < 1 || !['approved', 'rejected', 'pending'].includes(status)) {
                return json(res, 400, { success: false, message: 'بيانات المراجعة غير صحيحة.' });
            }

            const current = await sql`SELECT status FROM water_sources WHERE id = ${id}`;
            if (!current[0]) return json(res, 404, { success: false, message: 'المصدر غير موجود.' });

            const result = await sql`
                UPDATE water_sources
                SET status = ${status}
                WHERE id = ${id}
                    RETURNING id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, created_at
            `;

            // نظام النقاط إضافة مستقلة؛ فشل migration أو جدول اللاعب لا يجب أن يمنع اعتماد/رفض المصدر.
            if (status === 'approved' && current[0].status === 'pending') {
                try {
                    const contributor = await sql`SELECT player_id, points_awarded FROM water_sources WHERE id = ${id}`;
                    const playerId = contributor[0]?.player_id;
                    const pointsAwarded = Number(contributor[0]?.points_awarded || 0);
                    if (playerId && pointsAwarded < 60) {
                        await sql`UPDATE water_sources SET points_awarded = COALESCE(points_awarded, 0) + 50 WHERE id = ${id}`;
                        await sql`
                            INSERT INTO player_profiles (player_id, points)
                            VALUES (${playerId}, 50)
                            ON CONFLICT (player_id) DO UPDATE SET points = player_profiles.points + 50, updated_at = NOW()
                        `;
                    }
                } catch (pointsError) {
                    console.error('Approval points update skipped:', pointsError.message);
                }
            }

            return json(res, 200, { success: true, data: result[0] });
        }

        if (req.method === 'POST' && req.query?.event === '1') {
            const body = parseBody(req.body);
            const allowedEvents = new Set(['visit', 'source_view', 'source_add', 'map_interaction', 'nearest_click']);
            const eventType = typeof body?.event_type === 'string' ? body.event_type : '';
            const sessionId = typeof body?.session_id === 'string' ? body.session_id.slice(0, 80) : null;
            const sourceId = body?.source_id == null ? null : Number(body.source_id);
            if (!allowedEvents.has(eventType) || (sourceId !== null && (!Number.isInteger(sourceId) || sourceId < 1))) {
                return json(res, 400, { success: false, message: 'بيانات التفاعل غير صحيحة.' });
            }
            const result = await sql`INSERT INTO site_events (event_type, session_id, source_id) VALUES (${eventType}, ${sessionId}, ${sourceId}) RETURNING id`;
            return json(res, 201, { success: true, data: result[0] });
        }

        const validated = validatePayload(req.body);
        if (validated.error) return json(res, 400, { success: false, message: validated.error });

        const { name, type, temp_status, price_type, latitude, longitude, photo_url, note, player_id } = validated.value;
        let country = null;
        let province = null;

        try {
            ({ country, province } = await reverseGeocode(latitude, longitude));
        } catch (geocodingError) {
            console.error('Reverse geocoding error:', geocodingError.message);
        }

        const result = await sql`
            INSERT INTO water_sources (name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, player_id, points_awarded, status) VALUES (${name}, ${type}, ${temp_status}, ${price_type}, ${latitude}, ${longitude}, ${country}, ${province}, ${photo_url}, ${note}, ${player_id}, ${player_id ? 10 : 0}, 'pending')
            RETURNING id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, points_awarded, created_at
        `;
        if (player_id) {
            await sql`
                INSERT INTO player_profiles (player_id, points)
                VALUES (${player_id}, 10)
                ON CONFLICT (player_id) DO UPDATE SET points = player_profiles.points + 10, updated_at = NOW()
            `;
        }
        return json(res, 201, { success: true, data: result[0], points_awarded: player_id ? 10 : 0 });
    } catch (error) {
        console.error(`${req.method} water sources error:`, error);
        return json(res, 500, { success: false, message: 'حدث خطأ أثناء معالجة مصادر المياه.' });
    }
}
