/**
 * Cloudflare Pages Function: /media/[[path]]
 * Streams image assets stored in Cloudflare R2 bucket directly.
 */

interface Env {
  R2_BUCKET?: any;
  BUCKET?: any;
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

  const rawPath = context.params.path;
  const key = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');

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
