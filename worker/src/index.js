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

            // AUTO-MIGRATION: Force ensure all columns exist on production
            const columns = [
                "categories", "footerSubHeader", "footerMainTitle", "footerEmail", 
                "footerPhone", "footerLocation", "footerCoords", "footerVimeo", 
                "footerBehance", "footerYoutube"
            ];
            for (const col of columns) {
                try {
                    await env.DB.prepare(`ALTER TABLE settings ADD COLUMN ${col} TEXT`).run();
                } catch (e) { /* Column likely exists */ }
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
                // Using explicit columns to avoid any mapping issues
                const sql = `UPDATE settings SET 
                    name = ?, profession = ?, slogan = ?, avatar = ?, accentColor = ?, 
                    categories = ?, footerSubHeader = ?, footerMainTitle = ?, 
                    footerEmail = ?, footerPhone = ?, footerLocation = ?, 
                    footerCoords = ?, footerVimeo = ?, footerBehance = ?, 
                    footerYoutube = ? 
                    WHERE id = 1`;
                
                await env.DB.prepare(sql).bind(
                    s.name || '', s.profession || '', s.slogan || '', s.avatar || '', s.accentColor || '#F59E0B', 
                    JSON.stringify(s.categories || []), 
                    s.footerSubHeader || '', s.footerMainTitle || '', s.footerEmail || '', s.footerPhone || '',
                    s.footerLocation || '', s.footerCoords || '', s.footerVimeo || '', s.footerBehance || '', s.footerYoutube || ''
                ).run();
                
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // DROPBOX TOKEN PROXY
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

            // UPLOAD THUMBNAIL TO R2
            if (url.pathname === '/api/upload-thumbnail' && request.method === 'POST') {
                if (!env.BUCKET) throw new Error("R2 Bucket binding 'BUCKET' not found.");
                const formData = await request.formData();
                const file = formData.get('file');
                if (!file) return new Response('No file uploaded', { status: 400, headers: corsHeaders });
                const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
                const filename = `${Date.now()}_${safeName}`;
                await env.BUCKET.put(filename, file.stream(), { httpMetadata: { contentType: file.type } });
                let publicUrl = env.R2_PUBLIC_DOMAIN ? `${env.R2_PUBLIC_DOMAIN}/${filename}` : `${url.origin}/api/media/${filename}`;
                return new Response(JSON.stringify({ url: publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // SERVE MEDIA FROM R2
            if (url.pathname.startsWith('/api/media/')) {
                if (!env.BUCKET) throw new Error("R2 Bucket binding 'BUCKET' not found.");
                const filename = url.pathname.replace('/api/media/', '');
                const object = await env.BUCKET.get(filename);
                if (object === null) return new Response('Object Not Found', { status: 404, headers: corsHeaders });
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
