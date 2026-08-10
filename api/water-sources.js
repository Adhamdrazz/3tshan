import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Get all water sources
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

    // POST - Add new water source
    if (req.method === 'POST') {
      const {
        name,
        type,
        temp_status,
        price_type,
        latitude,
        longitude,
        photo_url
      } = req.body || {};

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
          ${photo_url || null},
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
      message: 'Internal server error'
    });
  }
}
