import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

// Live Cloudflare Pages & D1/R2 Remote Proxy Middleware for local development
function cloudflareDevApiPlugin(): Plugin {
  let inMemoryContent: any = null;
  const CF_REMOTE_ORIGIN = (process.env.VITE_CF_REMOTE_ORIGIN || 'https://vtproduction.pages.dev').replace(/\/$/, '');

  return {
    name: 'cloudflare-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // 0. Stream media from Cloudflare R2 via remote proxy: /media/*
        if (url.startsWith('/media/')) {
          try {
            const remoteMediaUrl = `${CF_REMOTE_ORIGIN}${url}`;
            const fetchHeaders: Record<string, string> = {};
            if (req.headers['range']) {
              fetchHeaders['range'] = req.headers['range'] as string;
            }
            const mediaRes = await fetch(remoteMediaUrl, {
              headers: Object.keys(fetchHeaders).length ? fetchHeaders : undefined,
            });
            res.statusCode = mediaRes.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            const copyHeaders = [
              'content-type',
              'content-length',
              'etag',
              'cache-control',
              'accept-ranges',
              'content-range',
            ];
            copyHeaders.forEach((h) => {
              const val = mediaRes.headers.get(h);
              if (val) res.setHeader(h, val);
            });
            if (mediaRes.body) {
              const { Readable } = await import('stream');
              Readable.fromWeb(mediaRes.body as any).pipe(res);
            } else {
              res.end();
            }
            return;
          } catch (err: any) {
            console.warn('[Vite Media Proxy] Failed to proxy media from remote:', err?.message);
            res.statusCode = 404;
            return res.end('Media not found');
          }
        }

        if (!url.startsWith('/api/')) {
          return next();
        }

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        // 1. GET /api/content -> Live Cloudflare D1
        if (url === '/api/content' && req.method === 'GET') {
          try {
            const remoteRes = await fetch(`${CF_REMOTE_ORIGIN}/api/content`, {
              headers: { Accept: 'application/json' },
            });
            if (remoteRes.ok) {
              const remoteData = await remoteRes.json();
              if (remoteData && remoteData.success) {
                inMemoryContent = remoteData.data;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    ...remoteData,
                    source: `${remoteData.source || 'Cloudflare D1'} (Live Remote D1)`,
                  })
                );
              }
            }
            console.warn(`[Vite CF Proxy] Remote /api/content status: ${remoteRes.status}`);
          } catch (err: any) {
            console.warn('[Vite CF Proxy] Live D1 fetch error, using local fallback:', err?.message);
          }

          // Fallback if remote is offline
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              success: inMemoryContent !== null,
              data: inMemoryContent,
              fallback: inMemoryContent === null,
              source: 'Vite Dev Fallback (Remote D1 unreachable)',
            })
          );
        }

        // 2. POST /api/content -> Live Cloudflare D1
        if (url === '/api/content' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              // Forward directly to live Cloudflare D1
              const remoteRes = await fetch(`${CF_REMOTE_ORIGIN}/api/content`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: body,
              });

              const result = await remoteRes.json();
              try {
                inMemoryContent = JSON.parse(body);
              } catch {}

              res.statusCode = remoteRes.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(result));
            } catch (err: any) {
              console.warn('[Vite CF Proxy] Live D1 POST error, saving locally:', err?.message);
              try {
                inMemoryContent = JSON.parse(body);
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: true,
                    message: 'Đã lưu tạm vào bộ nhớ dev (Remote D1 không phản hồi)',
                    updated_at: new Date().toISOString(),
                    fallback: true,
                  })
                );
              } catch (e: any) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: e?.message }));
              }
            }
          });
          return;
        }

        // 3. POST /api/upload -> Live Cloudflare R2
        if (url === '/api/upload' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || 'application/octet-stream';

            // Enforce 15MB upload limit
            const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
            if (buffer.length > MAX_UPLOAD_BYTES) {
              const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: false,
                  error: `Dung lượng file vượt quá giới hạn 15MB (${sizeMB}MB). Vui lòng nén video dưới 15MB.`,
                })
              );
            }

            try {
              // Forward multipart upload directly to Cloudflare Pages /api/upload (which puts to R2)
              const remoteRes = await fetch(`${CF_REMOTE_ORIGIN}/api/upload`, {
                method: 'POST',
                headers: {
                  'Content-Type': contentType,
                },
                body: buffer,
              });

              const result = await remoteRes.json();
              res.statusCode = remoteRes.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify(result));
            } catch (err: any) {
              console.warn('[Vite CF Proxy] Remote R2 upload failed, using local fallback:', err?.message);
              let previewUrl = '';
              if (contentType.includes('multipart/form-data')) {
                const str = buffer.toString('binary');
                const match = str.match(/Content-Type: image\/(?:webp|jpeg|png)\r\n\r\n([\s\S]*?)----/);
                if (match && match[1]) {
                  const b64 = Buffer.from(match[1], 'binary').toString('base64');
                  previewUrl = `data:image/webp;base64,${b64}`;
                }
              }
              if (!previewUrl) {
                previewUrl = `data:image/webp;base64,${buffer.toString('base64')}`;
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  url: previewUrl,
                  key: `uploads/dev_${Date.now()}.webp`,
                  source: 'Cloudflare R2 Dev Simulator (Fallback)',
                })
              );
            }
          });
          return;
        }

        // 4. DELETE /api/upload -> Live Cloudflare R2
        if (url.startsWith('/api/upload') && req.method === 'DELETE') {
          try {
            const remoteRes = await fetch(`${CF_REMOTE_ORIGIN}${url}`, {
              method: 'DELETE',
            });
            const result = await remoteRes.json();
            res.statusCode = remoteRes.status;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, message: 'Deleted file in dev mode (fallback)' }));
          }
        }

        // 5. GET /api/admin/video-proxy or /api/video-proxy?url=...
        if ((url.startsWith('/api/admin/video-proxy') || url.startsWith('/api/video-proxy')) && req.method === 'GET') {
          const parsedReqUrl = new URL(url, 'http://localhost:3000');
          const targetUrl = parsedReqUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            return res.end('Missing "url" query parameter');
          }

          try {
            const parsedTarget = new URL(targetUrl, 'http://localhost:3000');
            const forwardHeaders: Record<string, string> = {
              'User-Agent':
                (req.headers['user-agent'] as string) ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            };
            if (req.headers.range) {
              forwardHeaders['Range'] = req.headers.range as string;
            }

            const fetchRes = await fetch(parsedTarget.toString(), {
              headers: forwardHeaders,
              redirect: 'follow',
            });

            res.statusCode = fetchRes.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
            res.setHeader('Accept-Ranges', 'bytes');

            const copyHeaders = [
              'content-type',
              'content-length',
              'content-range',
              'last-modified',
              'etag',
            ];
            copyHeaders.forEach((h) => {
              const val = fetchRes.headers.get(h);
              if (val) res.setHeader(h, val);
            });

            if (fetchRes.body) {
              const { Readable } = await import('stream');
              Readable.fromWeb(fetchRes.body as any).pipe(res);
            } else {
              res.end();
            }
          } catch (proxyErr: any) {
            res.statusCode = 502;
            return res.end(`Dev Proxy Error: ${proxyErr?.message}`);
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflareDevApiPlugin()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'motion/react'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Enable polling on Windows subst/network mapped drives to guarantee file change detection
      watch: process.env.DISABLE_HMR === 'true' ? null : { usePolling: true, interval: 300 },
    },
  };
});
