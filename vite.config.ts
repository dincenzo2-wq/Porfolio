import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

// Development mock middleware for Cloudflare Pages Functions (/api/content & /api/upload)
function cloudflareDevApiPlugin(): Plugin {
  let inMemoryContent: any = null;

  return {
    name: 'cloudflare-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
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

        // 1. GET /api/content
        if (req.url === '/api/content' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              success: inMemoryContent !== null,
              data: inMemoryContent,
              fallback: inMemoryContent === null,
              source: 'Vite Dev Mock (Cloudflare Pages Function Stand-in)',
            })
          );
        }

        // 2. POST /api/content
        if (req.url === '/api/content' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              inMemoryContent = JSON.parse(body);
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  message: 'Đã lưu thành công vào Cloudflare D1 (Chế độ Dev)!',
                  updated_at: new Date().toISOString(),
                })
              );
            } catch (e: any) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: e?.message }));
            }
          });
          return;
        }

        // 3. POST /api/upload
        if (req.url === '/api/upload' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';

            // Return base64 WebP preview in dev mode
            let previewUrl = '';
            if (contentType.includes('multipart/form-data')) {
              // Basic multipart boundary search or fallback
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
                source: 'Cloudflare R2 Dev Simulator',
              })
            );
          });
          return;
        }

        // 4. GET /api/admin/video-proxy or /api/video-proxy?url=...
        if ((req.url?.startsWith('/api/admin/video-proxy') || req.url?.startsWith('/api/video-proxy')) && req.method === 'GET') {
          const parsedReqUrl = new URL(req.url, 'http://localhost:3000');
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

        // 5. DELETE /api/upload
        if (req.url?.startsWith('/api/upload') && req.method === 'DELETE') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, message: 'Deleted file in dev mode' }));
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
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
