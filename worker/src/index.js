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
                const config = await env.DB.prepare('SELECT * FROM config').all();
                
                const data = {
                    projects: projects.results || [],
                    profile: JSON.parse(config.results?.find(r => r.key === 'profile')?.value || '{}'),
                    settings: JSON.parse(config.results?.find(r => r.key === 'settings')?.value || '{}')
                };
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // SAVE PROJECTS
            if (url.pathname === '/api/projects' && request.method === 'POST') {
                const body = await request.json();
                await env.DB.prepare('DELETE FROM projects').run();
                if (body && body.length > 0) {
                    const statements = body.map(p => 
                        env.DB.prepare('INSERT INTO projects (id, title, category, year, youtubeId) VALUES (?, ?, ?, ?, ?)')
                           .bind(String(p.id), p.title, p.category, p.year, p.youtubeId)
                    );
                    await env.DB.batch(statements);
                }
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // SAVE PROFILE
            if (url.pathname === '/api/profile' && request.method === 'POST') {
                const body = await request.json();
                await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
                    .bind('profile', JSON.stringify(body))
                    .run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // SAVE SETTINGS
            if (url.pathname === '/api/settings' && request.method === 'POST') {
                const body = await request.json();
                try {
                    await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
                        .bind('settings', JSON.stringify(body))
                        .run();
                    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                } catch (dbErr) {
                    return new Response(JSON.stringify({ error: dbErr.message, details: "Database write failed" }), { status: 500, headers: corsHeaders });
                }
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
