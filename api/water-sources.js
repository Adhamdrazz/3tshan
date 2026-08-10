import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(request) {
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // GET - Get all water sources
    if (request.method === 'GET') {
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

      return Response.json(
        {
          success: true,
          data: sources
        },
        {
          status: 200,
          headers: corsHeaders
        }
      );
    }

    // POST - Add new water source
    if (request.method === 'POST') {
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return Response.json(
          {
            success: false,
            message: 'Invalid JSON body'
          },
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const {
        name,
        type,
        temp_status,
        price_type,
        latitude,
        longitude,
        photo_url
      } = body || {};

      // Validate required fields
      if (
        !name ||
        !type ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return Response.json(
          {
            success: false,
            message: 'Missing required fields'
          },
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      // Insert into database
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

      return Response.json(
        {
          success: true,
          data: source
        },
        {
          status: 201,
          headers: corsHeaders
        }
      );
    }

    return Response.json(
      {
        success: false,
        message: 'Method not allowed'
      },
      {
        status: 405,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('API Error:', error);

    return Response.json(
      {
        success: false,
        message: 'Internal server error',
        error: error.message
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
