export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            if (!env.DB) {
                throw new Error("D1 Database binding 'DB' not found. Check your wrangler.toml");
            }

            // GET ALL DATA
            if (url.pathname === '/api/all-data') {
                const projects = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
                const profileRow = await env.DB.prepare('SELECT * FROM profile LIMIT 1').first();
                const settingsRow = await env.DB.prepare('SELECT * FROM settings LIMIT 1').first();
                
                // Parse JSON strings from profile table
                let profile = profileRow || {};
                if (typeof profile.skills === 'string') profile.skills = JSON.parse(profile.skills);
                if (typeof profile.experience === 'string') profile.experience = JSON.parse(profile.experience);
                if (typeof profile.education === 'string') profile.education = JSON.parse(profile.education);

                return new Response(JSON.stringify({
                    projects: projects.results || [],
                    profile: profile,
                    settings: settingsRow || {}
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // DROPBOX TOKEN
            if (url.pathname === '/api/dropbox-token' && request.method === 'POST') {
                const DROPBOX_APP_KEY = env.DROPBOX_APP_KEY || "m9sugup87hekz3d";
                const DROPBOX_APP_SECRET = env.DROPBOX_APP_SECRET || "bkzjbiikhirweaf";
                const DROPBOX_REFRESH_TOKEN = env.DROPBOX_REFRESH_TOKEN || "mPd5-2m8NqwAAAAAAAAAAaQnYG84WFDUrfsblY_xK6N_Q8TfZvv99JXvV2aTzKqI";

                const response = await fetch('https://api.dropbox.com/oauth2/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: DROPBOX_REFRESH_TOKEN,
                        client_id: DROPBOX_APP_KEY,
                        client_secret: DROPBOX_APP_SECRET
                    })
                });

                const data = await response.json();
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // SAVE PROJECTS
            if (url.pathname === '/api/projects' && request.method === 'POST') {
                const body = await request.json();
                await env.DB.prepare('DELETE FROM projects').run();
                if (body && body.length > 0) {
                    const statements = body.map(p => 
                        env.DB.prepare('INSERT INTO projects (id, title, category, year, videoUrl, thumbnail, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
                           .bind(String(p.id), p.title, p.category, p.year, p.videoUrl, p.thumbnail || null, JSON.stringify(p.tags || []))
                    );
                    await env.DB.batch(statements);
                }
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // SAVE PROFILE
            if (url.pathname === '/api/profile' && request.method === 'POST') {
                const p = await request.json();
                await env.DB.prepare('INSERT OR REPLACE INTO profile (id, bio, skills, experience, education) VALUES (1, ?, ?, ?, ?)')
                    .bind(p.bio, JSON.stringify(p.skills || []), JSON.stringify(p.experience || []), JSON.stringify(p.education || []))
                    .run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // SAVE SETTINGS
            if (url.pathname === '/api/settings' && request.method === 'POST') {
                const s = await request.json();
                await env.DB.prepare('INSERT OR REPLACE INTO settings (id, name, profession, slogan, avatar, accentColor, categories) VALUES (1, ?, ?, ?, ?, ?, ?)')
                    .bind(s.name, s.profession, s.slogan, s.avatar, s.accentColor, JSON.stringify(s.categories || []))
                    .run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // UPLOAD THUMBNAIL TO R2
            if (url.pathname === '/api/upload-thumbnail' && request.method === 'POST') {
                if (!env.BUCKET) throw new Error("R2 Bucket binding 'BUCKET' not found.");
                
                const formData = await request.formData();
                const file = formData.get('file');
                if (!file) return new Response('No file uploaded', { status: 400, headers: corsHeaders });

                const filename = `${Date.now()}_${file.name}`;
                await env.BUCKET.put(filename, file.stream(), {
                    httpMetadata: { contentType: file.type }
                });

                // Return the local proxy URL since we don't know if they have a public R2 domain
                const publicUrl = `${url.origin}/api/media/${filename}`;
                return new Response(JSON.stringify({ url: publicUrl }), { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }

            // SERVE MEDIA FROM R2
            if (url.pathname.startsWith('/api/media/')) {
                if (!env.BUCKET) throw new Error("R2 Bucket binding 'BUCKET' not found.");
                const filename = url.pathname.replace('/api/media/', '');
                const object = await env.BUCKET.get(filename);

                if (object === null) {
                    return new Response('Object Not Found', { status: 404, headers: corsHeaders });
                }

                const headers = new Headers();
                object.writeHttpMetadata(headers);
                headers.set('etag', object.httpEtag);
                headers.set('Access-Control-Allow-Origin', '*');

                return new Response(object.body, { headers });
            }

            return new Response('Not Found', { status: 404, headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
    },
};
