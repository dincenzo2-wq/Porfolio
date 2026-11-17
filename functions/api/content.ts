/**
 * Cloudflare Pages Function: /api/content
 * Connects directly to Cloudflare D1 to read and update portfolio content.
 */

interface Env {
  DB?: {
    prepare: (query: string) => {
      bind: (...args: any[]) => {
        first: <T = any>() => Promise<T | null>;
        run: () => Promise<{ success: boolean }>;
        all: <T = any>() => Promise<{ results: T[] }>;
      };
    };
  };
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context: { env: Env }) {
  try {
    const { env } = context;

    if (!env.DB) {
      // If D1 is not bound yet, return signal so client uses default / localStorage
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          message: 'Cloudflare D1 is not bound to DB. Using local cache / default fallback.',
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Try reading from portfolio_content table
    const record = await env.DB.prepare(
      'SELECT data_json, updated_at FROM portfolio_content WHERE id = ?'
    )
      .bind('main')
      .first<{ data_json: string; updated_at: string }>();

    if (record && record.data_json) {
      const data = JSON.parse(record.data_json);
      return new Response(
        JSON.stringify({
          success: true,
          data,
          updated_at: record.updated_at,
          source: 'Cloudflare D1',
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        fallback: true,
        message: 'No record found in D1. Ready for initial save.',
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error querying Cloudflare D1',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = await request.json();

    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty JSON payload' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!env.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          fallback: true,
          message: 'D1 binding DB is not attached. Data stored locally.',
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const jsonString = JSON.stringify(body);
    const now = new Date().toISOString();

    // Ensure table exists
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS portfolio_content (
        id TEXT PRIMARY KEY DEFAULT 'main',
        data_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ).bind().run();

    // Upsert payload into D1
    await env.DB.prepare(
      `INSERT INTO portfolio_content (id, data_json, updated_at)
       VALUES ('main', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         data_json = excluded.data_json,
         updated_at = excluded.updated_at`
    )
      .bind(jsonString, now)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Đã lưu thành công vào Cloudflare D1!',
        updated_at: now,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error updating Cloudflare D1',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
