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

            // AUTO-MIGRATION: Force ensure all projects columns exist on production
            const projectColumns = ["duration", "resolution", "role", "description", "client", "platform"];
            for (const col of projectColumns) {
                try {
                    await env.DB.prepare(`ALTER TABLE projects ADD COLUMN ${col} TEXT`).run();
                } catch (e) { /* Column likely exists */ }
            }

            // GET YOUTUBE INFO
            if (url.pathname === '/api/youtube-info') {
                const queryUrl = url.searchParams.get('url');
                if (!queryUrl) {
                    return new Response(JSON.stringify({ error: "Missing 'url' query parameter." }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const ytId = extractYouTubeId(queryUrl);
                if (!ytId) {
                    return new Response(JSON.stringify({ error: "Invalid YouTube URL or Video ID." }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const targetUrl = `https://www.youtube.com/watch?v=${ytId}`;
                const response = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                if (!response.ok) {
                    return new Response(JSON.stringify({ error: `Failed to fetch YouTube page. Status code: ${response.status}` }), {
                        status: 502,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const html = await response.text();

                // 1. Extract duration
                let durationSeconds = null;
                const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
                if (playerResponseMatch) {
                    try {
                        const lengthSecondsMatch = playerResponseMatch[1].match(/"lengthSeconds"\s*:\s*"(\d+)"/);
                        if (lengthSecondsMatch) {
                            durationSeconds = parseInt(lengthSecondsMatch[1], 10);
                        }
                    } catch (e) {}
                }

                if (durationSeconds === null) {
                    const itemPropMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i) ||
                                          html.match(/<meta\s+content="([^"]+)"\s+itemprop="duration"/i);
                    if (itemPropMatch) {
                        const isoDuration = itemPropMatch[1];
                        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                        if (match) {
                            const hours = parseInt(match[1] || "0", 10);
                            const minutes = parseInt(match[2] || "0", 10);
                            const seconds = parseInt(match[3] || "0", 10);
                            durationSeconds = hours * 3600 + minutes * 60 + seconds;
                        }
                    }
                }

                // Convert to timecode (MM:SS or HH:MM:SS)
                let durationFormatted = "";
                if (durationSeconds !== null) {
                    const hours = Math.floor(durationSeconds / 3600);
                    const minutes = Math.floor((durationSeconds % 3600) / 60);
                    const seconds = durationSeconds % 60;
                    const pad = (num) => String(num).padStart(2, "0");
                    if (hours > 0) {
                        durationFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
                    } else {
                        durationFormatted = `${pad(minutes)}:${pad(seconds)}`;
                    }
                }

                // 2. Extract title (optional bonus!)
                const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                                   html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
                const title = titleMatch ? titleMatch[1] : null;

                return new Response(JSON.stringify({
                    success: true,
                    videoId: ytId,
                    title: title ? title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'") : null,
                    durationSeconds,
                    duration: durationFormatted
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
                        env.DB.prepare('INSERT INTO projects (id, title, category, year, videoUrl, thumbnail, tags, duration, resolution, role, description, client, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                           .bind(
                               String(p.id), 
                               p.title, 
                               p.category, 
                               p.year, 
                               p.videoUrl, 
                               p.thumbnail || null, 
                               JSON.stringify(p.tags || []),
                               p.duration || '',
                               p.resolution || '',
                               p.role || '',
                               p.description || '',
                               p.client || '',
                               p.platform || ''
                           )
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
                    footerCoords = ?, footerFacebook = ?, footerInstagram = ?, footerTiktok = ?
                    WHERE id = 1`;
                
                await env.DB.prepare(sql).bind(
                    s.name || '', s.profession || '', s.slogan || '', s.avatar || '', s.accentColor || '#F59E0B', 
                    JSON.stringify(s.categories || []), 
                    s.footerSubHeader || '', s.footerMainTitle || '', s.footerEmail || '', s.footerPhone || '',
                    s.footerLocation || '', s.footerCoords || '', 
                    s.footerFacebook || '', s.footerInstagram || '', s.footerTiktok || ''
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

function extractYouTubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();

    // If it's just an 11-char alphanumeric string, it's already an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    try {
        if (trimmed.includes("youtube.com/shorts/")) {
            const parts = trimmed.split("youtube.com/shorts/");
            if (parts[1]) {
                const id = parts[1].split(/[?&#]/)[0];
                if (id.length === 11) return id;
            }
        }
        if (trimmed.includes("youtube.com/embed/")) {
            const parts = trimmed.split("youtube.com/embed/");
            if (parts[1]) {
                const id = parts[1].split(/[?&#]/)[0];
                if (id.length === 11) return id;
            }
        }
        if (trimmed.includes("youtu.be/")) {
            const parts = trimmed.split("youtu.be/");
            if (parts[1]) {
                const id = parts[1].split(/[?&#]/)[0];
                if (id.length === 11) return id;
            }
        }
        if (trimmed.includes("v=")) {
            const urlObj = new URL(trimmed);
            const id = urlObj.searchParams.get("v");
            if (id && id.length === 11) return id;
        }
    } catch (e) {}

    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[1] && match[1].length === 11) {
        return match[1];
    }

    return null;
}
