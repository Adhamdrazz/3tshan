import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET
    if (req.method === 'GET') {
      const sources = await sql`
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
        data: sources
      });
    }

    // POST
    if (req.method === 'POST') {
      let body = req.body;

      // Parse body if Vercel gives it as text
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON body'
          });
        }
      }

      body = body || {};

      const type = body.type;
      const temp_status = body.temp_status;
      const price_type = body.price_type;
      const latitude = body.latitude;
      const longitude = body.longitude;
      const photo_url = body.photo_url;

      // "name" is optional in the UI, so default it based on type
      // instead of rejecting the request.
      const name =
        body.name && String(body.name).trim()
          ? String(body.name).trim()
          : 'مصدر مياه';

      if (
        !type ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          received: body
        });
      }

      const [source] = await sql`
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
          ${name},
          ${type},
          ${temp_status || null},
          ${price_type || null},
          ${latitude},
          ${longitude},
          ${photo_url || null}
          'pending'
        )
        RETURNING *
      `;

      return res.status(201).json({
        success: true,
        data: source
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
