/**
 * Cloudflare Pages Function: /media/[[path]]
 * Streams image & video assets stored in Cloudflare R2 bucket directly.
 * Requires "/media/*" to be included in public/_routes.json so Cloudflare Pages
 * invokes this Function instead of serving index.html SPA fallback.
 */

interface Env {
  R2_BUCKET?: any;
  BUCKET?: any;
}

function inferContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

function extractKey(rawPath?: string[] | string): string {
  const joined = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');
  try {
    return decodeURIComponent(joined).replace(/^\/+/, '');
  } catch {
    return joined.replace(/^\/+/, '');
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}

export async function onRequestHead(context: {
  request: Request;
  env: Env;
  params: { path?: string[] | string };
}) {
  const bucket = context.env.R2_BUCKET || context.env.BUCKET;
  if (!bucket) {
    return new Response(null, { status: 503 });
  }

  const key = extractKey(context.params.path);
  if (!key) {
    return new Response(null, { status: 400 });
  }

  try {
    const object = typeof bucket.head === 'function' ? await bucket.head(key) : await bucket.get(key);
    if (!object) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === 'function') {
      object.writeHttpMetadata(headers);
    }
    if (!headers.get('content-type')) {
      headers.set('Content-Type', inferContentType(key));
    }
    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }
    if (typeof object.size === 'number') {
      headers.set('Content-Length', String(object.size));
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');

    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 500 });
  }
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
  params: { path?: string[] | string };
}) {
  const bucket = context.env.R2_BUCKET || context.env.BUCKET;
  if (!bucket) {
    return new Response('R2 bucket not bound', { status: 503 });
  }

  const key = extractKey(context.params.path);
  if (!key) {
    return new Response('File key missing', { status: 400 });
  }

  try {
    const rangeHeader = context.request.headers.get('range');
    const object = await bucket.get(
      key,
      rangeHeader ? { range: context.request.headers } : undefined
    );
    if (!object) {
      return new Response('File not found in R2', { status: 404 });
    }

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === 'function') {
      object.writeHttpMetadata(headers);
    }
    if (!headers.get('content-type')) {
      headers.set('Content-Type', inferContentType(key));
    }
    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');

    if (object.range) {
      headers.set(
        'Content-Range',
        `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`
      );
    }

    return new Response(object.body, {
      status: object.range ? 206 : 200,
      headers,
    });
  } catch (err: any) {
    return new Response('Error retrieving from R2: ' + (err?.message || 'unknown'), {
      status: 500,
    });
  }
}
