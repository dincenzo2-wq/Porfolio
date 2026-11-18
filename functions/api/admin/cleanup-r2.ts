/**
 * Cloudflare Pages Function: /api/admin/cleanup-r2
 * Compares all objects stored under `uploads/` in Cloudflare R2 against every URL
 * referenced in Cloudflare D1 (`portfolio_content`).
 *
 * Safety Rules:
 * - Fail-safe: Aborts immediately if D1 cannot be read or has no valid record.
 * - 30-Minute Grace Period: NEVER deletes objects uploaded within the last 30 minutes
 *   so freshly captured frames / uploaded assets in `/admin` that haven't been saved
 *   to D1 yet are 100% protected.
 * - GET  /api/admin/cleanup-r2 -> Dry-run report (lists orphaned files & size, deletes nothing)
 * - POST /api/admin/cleanup-r2 -> Deletes orphaned files older than 30 minutes and returns report
 */

interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded?: Date | string;
}

interface Env {
  DB?: {
    prepare: (query: string) => {
      bind: (...args: any[]) => {
        first: <T = any>() => Promise<T | null>;
      };
    };
  };
  R2_BUCKET?: {
    list: (options?: { prefix?: string; cursor?: string; limit?: number }) => Promise<{
      objects: R2ObjectSummary[];
      truncated: boolean;
      cursor?: string;
    }>;
    delete: (keys: string | string[]) => Promise<void>;
  };
  BUCKET?: {
    list: (options?: { prefix?: string; cursor?: string; limit?: number }) => Promise<{
      objects: R2ObjectSummary[];
      truncated: boolean;
      cursor?: string;
    }>;
    delete: (keys: string | string[]) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes safety window

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Extracts normalized R2 object key (`uploads/...`) from any URL or path string.
 */
function extractR2KeyFromUrl(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const match = trimmed.match(/(?:^|\/)(uploads\/[^?#\s"']+)/i);
  if (!match || !match[1]) return null;

  try {
    return decodeURIComponent(match[1]).replace(/^\/+/, '');
  } catch {
    return match[1].replace(/^\/+/, '');
  }
}

/**
 * Collects EVERY R2 `uploads/...` key referenced anywhere in the D1 portfolio payload:
 * - profile.heroBgUrl, profile.showreelUrl, profile.heroPosterUrl, profile.portraitUrl
 * - profile.brandLogos[]
 * - projects[].coverImage, projects[].videoUrl
 * - stills[].src
 * - Plus a recursive deep scan over all strings so no future field is ever missed.
 */
function collectUsedR2Keys(data: any): Set<string> {
  const used = new Set<string>();

  const register = (val: unknown) => {
    if (typeof val !== 'string') return;
    const key = extractR2KeyFromUrl(val);
    if (key) used.add(key);
  };

  if (!data || typeof data !== 'object') return used;

  // 1. Explicit known media fields
  if (data.profile && typeof data.profile === 'object') {
    register(data.profile.heroBgUrl);
    register(data.profile.showreelUrl);
    register(data.profile.heroPosterUrl);
    register(data.profile.portraitUrl);
    if (Array.isArray(data.profile.brandLogos)) {
      for (const logo of data.profile.brandLogos) register(logo);
    }
  }

  if (Array.isArray(data.projects)) {
    for (const proj of data.projects) {
      if (!proj || typeof proj !== 'object') continue;
      register(proj.coverImage);
      register(proj.videoUrl);
    }
  }

  if (Array.isArray(data.stills)) {
    for (const still of data.stills) {
      if (!still || typeof still !== 'object') continue;
      register(still.src);
    }
  }

  // 2. Recursive safety sweep across the entire D1 JSON document
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      if (node.includes('uploads/')) register(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === 'object') {
      for (const val of Object.values(node as Record<string, unknown>)) {
        visit(val);
      }
    }
  };
  visit(data);

  return used;
}

/**
 * Resolves the upload timestamp (epoch ms) of an R2 object, checking both R2 metadata
 * (`obj.uploaded`) and the leading epoch prefix in `uploads/YYYY-MM/<epoch>_...` if present.
 */
function getObjectUploadedMs(obj: R2ObjectSummary): number {
  let metaMs = 0;
  if (obj.uploaded) {
    const parsed = obj.uploaded instanceof Date ? obj.uploaded.getTime() : Date.parse(String(obj.uploaded));
    if (!Number.isNaN(parsed) && parsed > 0) {
      metaMs = parsed;
    }
  }

  // Also check epoch prefix in key (e.g. uploads/2026-11/1794981483388_...)
  let keyMs = 0;
  const keyMatch = obj.key.match(/\/(\d{13})_/);
  if (keyMatch && keyMatch[1]) {
    const parsed = Number(keyMatch[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      keyMs = parsed;
    }
  }

  // Take the most recent valid timestamp to be strictly conservative (safer against accidental deletion)
  return Math.max(metaMs, keyMs);
}

async function runCleanup(env: Env, dryRun: boolean) {
  const bucket = env.R2_BUCKET || env.BUCKET;
  if (!bucket) {
    return new Response(
      JSON.stringify({ success: false, error: 'R2 bucket binding (R2_BUCKET / BUCKET) is not configured.' }),
      { status: 503, headers: CORS_HEADERS }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ success: false, error: 'D1 database binding (DB) is not configured. Aborting R2 cleanup safely.' }),
      { status: 503, headers: CORS_HEADERS }
    );
  }

  // 1. Read live portfolio record from D1 (fail-safe: abort if unreadable or missing)
  const record = await env.DB.prepare('SELECT * FROM portfolio_content WHERE id = ?')
    .bind('main')
    .first<any>();

  const rawJson = record?.data_json || record?.payload;
  if (!rawJson) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No portfolio_content record found in D1. Aborting R2 cleanup to prevent accidental deletion.',
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let parsedData: any;
  try {
    parsedData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to parse D1 portfolio JSON. Aborting R2 cleanup safely.',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const usedKeys = collectUsedR2Keys(parsedData);

  // 2. Paginate through ALL objects in R2 under `uploads/`
  const allObjects: R2ObjectSummary[] = [];
  let cursor: string | undefined;
  let guard = 0;

  do {
    const listed = await bucket.list({
      prefix: 'uploads/',
      cursor,
      limit: 500,
    });
    if (Array.isArray(listed.objects)) {
      allObjects.push(...listed.objects);
    }
    cursor = listed.truncated ? listed.cursor : undefined;
    guard++;
  } while (cursor && guard < 100);

  // 3. Classify every object: activeUsed | protectedRecent (< 30 min) | orphanedToDelete
  const nowMs = Date.now();
  const activeUsed: Array<{ key: string; size: number; sizeFormatted: string }> = [];
  const protectedRecent: Array<{
    key: string;
    size: number;
    sizeFormatted: string;
    ageMinutes: number;
  }> = [];
  const orphaned: Array<{
    key: string;
    size: number;
    sizeFormatted: string;
    uploadedAt: string | null;
    ageMinutes: number | null;
  }> = [];

  for (const obj of allObjects) {
    if (usedKeys.has(obj.key)) {
      activeUsed.push({
        key: obj.key,
        size: obj.size,
        sizeFormatted: formatBytes(obj.size),
      });
      continue;
    }

    const uploadedMs = getObjectUploadedMs(obj);
    const ageMs = uploadedMs > 0 ? nowMs - uploadedMs : Number.POSITIVE_INFINITY;

    // 30-minute safety guard: protect anything uploaded within the last 30 minutes
    // (also protects objects with clock skew where ageMs < 0)
    if (ageMs < GRACE_PERIOD_MS) {
      protectedRecent.push({
        key: obj.key,
        size: obj.size,
        sizeFormatted: formatBytes(obj.size),
        ageMinutes: Math.max(0, Math.round(ageMs / 60000)),
      });
      continue;
    }

    orphaned.push({
      key: obj.key,
      size: obj.size,
      sizeFormatted: formatBytes(obj.size),
      uploadedAt: uploadedMs > 0 ? new Date(uploadedMs).toISOString() : null,
      ageMinutes: Number.isFinite(ageMs) ? Math.round(ageMs / 60000) : null,
    });
  }

  const totalOrphanedBytes = orphaned.reduce((sum, item) => sum + item.size, 0);
  const deletedKeys: string[] = [];

  // 4. Execute deletion if not dry-run (in batches of 100 keys)
  if (!dryRun && orphaned.length > 0) {
    const keysToDelete = orphaned.map((o) => o.key);
    for (let i = 0; i < keysToDelete.length; i += 100) {
      const batch = keysToDelete.slice(i, i + 100);
      await bucket.delete(batch);
      deletedKeys.push(...batch);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      mode: dryRun ? 'dry-run' : 'deleted',
      gracePeriodMinutes: 30,
      summary: {
        totalR2ObjectsScanned: allObjects.length,
        d1ReferencedKeysCount: usedKeys.size,
        activeUsedCount: activeUsed.length,
        protectedRecentCount: protectedRecent.length,
        orphanedCount: orphaned.length,
        deletedCount: deletedKeys.length,
        freedBytes: dryRun ? 0 : totalOrphanedBytes,
        reclaimableBytes: totalOrphanedBytes,
        reclaimableFormatted: formatBytes(totalOrphanedBytes),
      },
      activeUsed,
      protectedRecent,
      orphaned,
      deletedKeys,
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    return await runCleanup(context.env, true);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error scanning R2 bucket' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    let dryRun = false;
    try {
      const body = (await context.request.json()) as { dryRun?: boolean } | null;
      if (body && body.dryRun === true) dryRun = true;
    } catch {
      // Empty body defaults to executing cleanup
    }
    return await runCleanup(context.env, dryRun);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error cleaning up R2 bucket' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
