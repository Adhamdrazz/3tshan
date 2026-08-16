import { neon } from '@neondatabase/serverless';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

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


const sessionCookieName = '3tshan_session';
const oauthStateCookieName = '3tshan_oauth_state';
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function appendCookie(res, cookie) {
    const current = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', current ? (Array.isArray(current) ? [...current, cookie] : [current, cookie]) : [cookie]);
}

function parseCookies(req) {
    const raw = req.headers?.cookie || '';
    return Object.fromEntries(raw.split(';').map(part => part.trim().split('='))
        .filter(([key, value]) => key && value)
        .map(([key, value]) => [key, decodeURIComponent(value)]));
}

function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function getBaseUrl(req) {
    const configured = process.env.APP_URL || process.env.GOOGLE_REDIRECT_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');
    const host = req.headers?.host;
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    return host ? `${protocol}://${host}` : '';
}

function getGoogleRedirectUri(req) {
    return process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/api/water-sources?auth=callback`;
}

function createOAuthState(req) {
    const secret = process.env.AUTH_SECRET || process.env.ADMIN_TOKEN;
    if (!secret) return null;
    const playerId = typeof req.query?.player_id === 'string' ? req.query.player_id.trim().slice(0, 80) : null;
    const payload = Buffer.from(JSON.stringify({ nonce: randomBytes(18).toString('hex'), exp: Date.now() + 10 * 60 * 1000, player_id: playerId })).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function getOAuthStatePayload(state) {
    try {
        const [payload] = String(state || '').split('.');
        return payload ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) : null;
    } catch {
        return null;
    }
}

function verifyOAuthState(state) {
    const secret = process.env.AUTH_SECRET || process.env.ADMIN_TOKEN;
    if (!secret || typeof state !== 'string') return false;
    const [payload, signature] = state.split('.');
    if (!payload || !signature) return false;
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    try {
        const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return Number(value.exp) > Date.now();
    } catch {
        return false;
    }
}

function setSessionCookie(res, token, maxAge = sessionMaxAgeSeconds) {
    appendCookie(res, `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

function setOAuthStateCookie(res, state, maxAge = 600) {
    appendCookie(res, `${oauthStateCookieName}=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
    setSessionCookie(res, '', 0);
}

function redirect(res, location) {
    res.statusCode = 302;
    res.setHeader('Location', location);
    return res.end();
}

async function getCurrentUser(req, sql) {
    const token = parseCookies(req)[sessionCookieName];
    if (!token) return null;
    const rows = await sql`
        SELECT u.id, u.google_sub, u.email, u.name, u.avatar_url
        FROM auth_sessions s
        JOIN app_users u ON u.id = s.user_id
        WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > NOW()
        LIMIT 1
    `;
    return rows[0] || null;
}

async function exchangeGoogleCode(code, redirectUri) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Google token exchange failed');
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userResponse.json();
    if (!userResponse.ok || !user.sub || !user.email || user.email_verified === false) throw new Error('Google user information is invalid');
    return { googleSub: String(user.sub), email: String(user.email).slice(0, 320), name: String(user.name || user.email).slice(0, 200), avatarUrl: String(user.picture || '').slice(0, 2_000) || null };
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

    if (req.method === 'GET' && req.query?.auth === 'google') {
        const state = createOAuthState(req);
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!state || !clientId) return json(res, 503, { success: false, message: 'تسجيل Google غير مهيأ بعد.' });
        setOAuthStateCookie(res, state);
        const params = new URLSearchParams({ client_id: clientId, redirect_uri: getGoogleRedirectUri(req), response_type: 'code', scope: 'openid email profile', state, access_type: 'online', prompt: 'select_account' });
        return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
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
            if (req.query?.auth === 'callback') {
                const { code, state, error: oauthError } = req.query || {};
                const stateCookie = parseCookies(req)[oauthStateCookieName];
                if (oauthError || !code || !stateCookie || stateCookie !== state || !verifyOAuthState(state)) return redirect(res, '/?login=error');
                try {
                    const googleUser = await exchangeGoogleCode(code, getGoogleRedirectUri(req));
                    const statePayload = getOAuthStatePayload(state) || {};
                    const legacyPlayerId = typeof statePayload.player_id === 'string' ? statePayload.player_id : null;
                    const existing = await sql`
                        INSERT INTO app_users (google_sub, email, name, avatar_url)
                        VALUES (${googleUser.googleSub}, ${googleUser.email}, ${googleUser.name}, ${googleUser.avatarUrl})
                        ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
                        RETURNING id, google_sub, email, name, avatar_url, points
                    `;
                    const user = existing[0];
                    if (legacyPlayerId) {
                        await sql`
                            UPDATE app_users
                            SET legacy_player_id = COALESCE(legacy_player_id, ${legacyPlayerId}),
                                points = GREATEST(points, COALESCE((SELECT points FROM player_profiles WHERE player_id = ${legacyPlayerId}), 0)),
                                updated_at = NOW()
                            WHERE id = ${user.id}
                        `;
                        await sql`UPDATE water_sources SET user_id = ${user.id} WHERE player_id = ${legacyPlayerId} AND user_id IS NULL`;
                    }
                    const sessionToken = randomBytes(32).toString('hex');
                    await sql`
                        INSERT INTO auth_sessions (user_id, token_hash, expires_at)
                        VALUES (${user.id}, ${hashToken(sessionToken)}, NOW() + INTERVAL '30 days')
                    `;
                    setSessionCookie(res, sessionToken);
                    return redirect(res, '/?login=success');
                } catch (authError) {
                    console.error('Google OAuth callback error:', authError.message);
                    return redirect(res, '/?login=error');
                }
            }

            if (req.query?.auth === 'me') {
                const user = await getCurrentUser(req, sql);
                if (!user) return json(res, 200, { success: true, authenticated: false, user: null });
                return json(res, 200, { success: true, authenticated: true, user });
            }

            if (req.query?.auth === 'profile') {
                const user = await getCurrentUser(req, sql);
                if (!user) return json(res, 401, { success: false, message: 'يجب تسجيل الدخول لعرض الحساب.' });
                const [sources, summary] = await Promise.all([
                    sql`SELECT id, name, type, status, points_awarded, created_at FROM water_sources WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 50`,
                    sql`SELECT COUNT(*)::int AS total_sources, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_sources, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_sources, COUNT(*) FILTER (WHERE type = 'cooler' AND status = 'approved')::int AS approved_coolers, COUNT(*) FILTER (WHERE type = 'tap' AND status = 'approved')::int AS approved_taps FROM water_sources WHERE user_id = ${user.id}`
                ]);
                const pointsRow = await sql`SELECT points FROM app_users WHERE id = ${user.id}`;
                const points = Number(pointsRow[0]?.points || 0);
                const level = Math.floor(points / 100) + 1;
                return json(res, 200, { success: true, data: { user, points, level, next_level_at: level * 100, points_to_next_level: Math.max(0, level * 100 - points), overview: summary[0] || {}, sources } });
            }

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

        if (req.method === 'POST' && req.query?.auth === 'logout') {
            const token = parseCookies(req)[sessionCookieName];
            if (token) await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
            clearSessionCookie(res);
            return json(res, 200, { success: true });
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
                    const contributor = await sql`SELECT player_id, user_id, points_awarded FROM water_sources WHERE id = ${id}`;
                    const playerId = contributor[0]?.player_id;
                    const userId = contributor[0]?.user_id;
                    const pointsAwarded = Number(contributor[0]?.points_awarded || 0);
                    if ((playerId || userId) && pointsAwarded < 60) {
                        await sql`UPDATE water_sources SET points_awarded = COALESCE(points_awarded, 0) + 50 WHERE id = ${id}`;
                        if (userId) {
                            await sql`UPDATE app_users SET points = points + 50, updated_at = NOW() WHERE id = ${userId}`;
                        } else {
                            await sql`
                                INSERT INTO player_profiles (player_id, points)
                                VALUES (${playerId}, 50)
                                ON CONFLICT (player_id) DO UPDATE SET points = player_profiles.points + 50, updated_at = NOW()
                            `;
                        }
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
        const currentUser = await getCurrentUser(req, sql);
        const userId = currentUser?.id || null;
        let country = null;
        let province = null;

        try {
            ({ country, province } = await reverseGeocode(latitude, longitude));
        } catch (geocodingError) {
            console.error('Reverse geocoding error:', geocodingError.message);
        }

        const result = await sql`
            INSERT INTO water_sources (name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, player_id, user_id, points_awarded, status) VALUES (${name}, ${type}, ${temp_status}, ${price_type}, ${latitude}, ${longitude}, ${country}, ${province}, ${photo_url}, ${note}, ${player_id}, ${userId}, ${player_id || userId ? 10 : 0}, 'pending')
            RETURNING id, name, type, temp_status, price_type, latitude, longitude, country, province, photo_url, note, status, points_awarded, created_at
        `;
        if (userId) {
            await sql`UPDATE app_users SET points = points + 10, updated_at = NOW() WHERE id = ${userId}`;
        } else if (player_id) {
            await sql`
                INSERT INTO player_profiles (player_id, points)
                VALUES (${player_id}, 10)
                ON CONFLICT (player_id) DO UPDATE SET points = player_profiles.points + 10, updated_at = NOW()
            `;
        }
        return json(res, 201, { success: true, data: result[0], points_awarded: userId || player_id ? 10 : 0 });
    } catch (error) {
        console.error(`${req.method} water sources error:`, error);
        return json(res, 500, { success: false, message: 'حدث خطأ أثناء معالجة مصادر المياه.' });
    }
}
