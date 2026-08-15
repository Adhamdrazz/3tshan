import { neon } from '@neondatabase/serverless';


// =========================================================
// Database Connection
// =========================================================

const sql = neon(process.env.DATABASE_URL);


// =========================================================
// Main API Handler
// =========================================================

export default async function handler(req, res) {

    // =======================================================
    // CORS
    // =======================================================

    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept'
    );


    // =======================================================
    // OPTIONS
    // =======================================================

    if (req.method === 'OPTIONS') {

        return res.status(200).json({
            success: true
        });

    }


    // =======================================================
    // GET
    // =======================================================

    if (req.method === 'GET') {

        try {

            const result = await sql`
                SELECT
                    id,
                    name,
                    type,
                    temp_status,
                    price_type,
                    latitude,
                    longitude,
                    photo_url,
                    status,
                    created_at
                FROM water_sources
                ORDER BY created_at DESC
            `;


            return res.status(200).json({

                success: true,

                data: result

            });

        } catch (error) {

            console.error(
                'GET water sources error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'حدث خطأ أثناء تحميل مصادر المياه.',

                error:
                    error.message

            });

        }

    }


    // =======================================================
    // POST
    // =======================================================

    if (req.method === 'POST') {

        try {

            // -------------------------------------------------
            // Get Request Body
            // -------------------------------------------------

            let body = req.body;


            // Vercel may sometimes provide body as string
            if (typeof body === 'string') {

                try {

                    body = JSON.parse(body);

                } catch (parseError) {

                    return res.status(400).json({

                        success: false,

                        message:
                            'بيانات JSON غير صحيحة.'

                    });

                }

            }


            body = body || {};


            console.log(
                'POST body:',
                body
            );


            // -------------------------------------------------
            // Extract Data
            // -------------------------------------------------

            const {
                name,
                type,
                temp_status,
                price_type,
                latitude,
                longitude,
                photo_url
            } = body;


            // -------------------------------------------------
            // Validate Required Fields
            // -------------------------------------------------

            if (
                !type ||
                !temp_status ||
                !price_type ||
                latitude === undefined ||
                latitude === null ||
                longitude === undefined ||
                longitude === null
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Missing required fields'

                });

            }


            // -------------------------------------------------
            // Validate Coordinates
            // -------------------------------------------------

            const latitudeNumber =
                Number(latitude);

            const longitudeNumber =
                Number(longitude);


            if (
                Number.isNaN(latitudeNumber) ||
                Number.isNaN(longitudeNumber)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'إحداثيات الموقع غير صحيحة.'

                });

            }


            // -------------------------------------------------
            // Insert Into Database
            // -------------------------------------------------

            const result = await sql`
                INSERT INTO water_sources (
                    name,
                    type,
                    temp_status,
                    price_type,
                    latitude,
                    longitude,
                    photo_url,
                    status
                )
                VALUES (
                    ${name || null},
                    ${type},
                    ${temp_status},
                    ${price_type},
                    ${latitudeNumber},
                    ${longitudeNumber},
                    ${photo_url || null},
                    'pending'
                )
                RETURNING
                    id,
                    name,
                    type,
                    temp_status,
                    price_type,
                    latitude,
                    longitude,
                    photo_url,
                    status,
                    created_at
            `;


            // -------------------------------------------------
            // Success
            // -------------------------------------------------

            return res.status(201).json({

                success: true,

                data: result[0]

            });

        } catch (error) {

            console.error(
                'POST water source error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'حدث خطأ أثناء إضافة مصدر المياه.',

                error:
                    error.message

            });

        }

    }


    // =======================================================
    // Method Not Allowed
    // =======================================================

    res.setHeader(
        'Allow',
        'GET, POST, OPTIONS'
    );


    return res.status(405).json({

        success: false,

        message:
            'Method not allowed'

    });

}
