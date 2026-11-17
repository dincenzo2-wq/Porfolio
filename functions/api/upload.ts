/**
 * Cloudflare Pages Function: /api/upload
 * Receives WebP images compressed by client (<500KB) and saves to Cloudflare R2 bucket.
 */

interface Env {
  R2_BUCKET?: {
    put: (
      key: string,
      value: ArrayBuffer | ReadableStream,
      options?: { httpMetadata?: { contentType?: string } }
    ) => Promise<any>;
    get?: (key: string) => Promise<any>;
    delete?: (key: string) => Promise<any>;
  };
  BUCKET?: {
    put: (
      key: string,
      value: ArrayBuffer | ReadableStream,
      options?: { httpMetadata?: { contentType?: string } }
    ) => Promise<any>;
    get?: (key: string) => Promise<any>;
    delete?: (key: string) => Promise<any>;
  };
  R2_PUBLIC_URL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type') || '';

    let fileBuffer: ArrayBuffer;
    let fileName = `image_${Date.now()}.webp`;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return new Response(
          JSON.stringify({ success: false, error: 'No file found in form data' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      fileBuffer = await file.arrayBuffer();
      fileName = file.name || fileName;
    } else {
      fileBuffer = await request.arrayBuffer();
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'File data is empty' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Key format: uploads/YYYY/MM/timestamp-random.webp
    const dateStr = new Date().toISOString().slice(0, 7); // e.g. 2026-11
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `uploads/${dateStr}/${Date.now()}_${randomSuffix}_${cleanName}`;

    // If R2 binding is active in Cloudflare Pages
    const r2Bucket = env.R2_BUCKET || env.BUCKET;
    if (r2Bucket) {
      await r2Bucket.put(r2Key, fileBuffer, {
        httpMetadata: {
          contentType: 'image/webp',
        },
      });

      const publicDomain = env.R2_PUBLIC_URL || '';
      const finalUrl = publicDomain
        ? `${publicDomain.replace(/\/$/, '')}/${r2Key}`
        : `/media/${r2Key}`;

      return new Response(
        JSON.stringify({
          success: true,
          url: finalUrl,
          key: r2Key,
          sizeBytes: fileBuffer.byteLength,
          source: 'Cloudflare R2',
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback if R2 is not configured: Return base64 dataUrl
    const bytes = new Uint8Array(fileBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:image/webp;base64,${base64}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: dataUrl,
        key: r2Key,
        sizeBytes: fileBuffer.byteLength,
        source: 'Client/Local Fallback',
        warning: 'Cloudflare R2_BUCKET is not bound yet. Returned base64 preview.',
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error uploading file to Cloudflare R2',
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const fileUrl = url.searchParams.get('url');

    let targetKey = key;
    if (!targetKey && fileUrl) {
      const match = fileUrl.match(/(uploads\/[^?#]+)/);
      if (match) targetKey = match[1];
    }

    const r2Bucket = env.R2_BUCKET || env.BUCKET;
    if (targetKey && r2Bucket?.delete) {
      await r2Bucket.delete(targetKey);
    }

    return new Response(
      JSON.stringify({ success: true, deletedKey: targetKey || null }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error deleting file from R2' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
