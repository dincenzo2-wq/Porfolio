/**
 * Cloudflare Pages Function: /api/admin/video-proxy
 * Streaming proxy supporting HTTP Range (206 Partial Content) with CORS headers.
 * Enables admin video scrubbing and canvas frame extraction without CORS tainting.
 */

interface Env {}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request } = context;
    const requestUrl = new URL(request.url);
    const targetUrl = requestUrl.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing "url" query parameter', {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
      });
    }

    // Validate URL scheme (handles both absolute and relative URLs resolved against origin)
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl, request.url);
      if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response('Invalid target URL', {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
      });
    }

    // Forward range and other essential headers
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        request.headers.get('User-Agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      forwardHeaders['Range'] = rangeHeader;
    }

    // Fetch target with stream passthrough
    const targetResponse = await fetch(parsedTarget.toString(), {
      method: request.method,
      headers: forwardHeaders,
      redirect: 'follow',
    });

    // Build response headers with CORS and Range headers exposed
    const responseHeaders = new Headers();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => {
      responseHeaders.set(k, v);
    });

    const copyHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];

    copyHeaders.forEach((h) => {
      const val = targetResponse.headers.get(h);
      if (val) {
        responseHeaders.set(h, val);
      }
    });

    if (!responseHeaders.has('accept-ranges')) {
      responseHeaders.set('accept-ranges', 'bytes');
    }

    // Stream body directly without buffering into worker RAM
    return new Response(targetResponse.body, {
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(`Proxy Error: ${err?.message || 'Unknown error'}`, {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  }
}
