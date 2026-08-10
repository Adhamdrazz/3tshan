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
      const sources = await sql.query(
        `SELECT
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
        ORDER BY created_at DESC`
      );

      return res.status(200).json({
        success: true,
        data: sources
      });
    }

    // POST
    if (req.method === 'POST') {
      let body = req.body || {};

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

      const {
        name,
        type,
        temp_status,
        price_type,
        latitude,
        longitude,
        photo_url
      } = body;

      if (
        !name ||
        !type ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const result = await sql.query(
        `INSERT INTO water_sources
          (name, type, temp_status, price_type, latitude, longitude, photo_url, status)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          name,
          type,
          temp_status || null,
          price_type || null,
          latitude,
          longitude,
          photo_url || null,
          'pending'
        ]
      );

      return res.status(201).json({
        success: true,
        data: result[0]
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
