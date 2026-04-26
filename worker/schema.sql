-- Table for projects
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    year TEXT,
    youtubeId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for profile and settings (storing as JSON blobs for flexibility)
DROP TABLE IF EXISTS config;
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Initial data (optional)
INSERT INTO config (key, value) VALUES ('profile', '{"bio": "Director & Editor", "skills": [], "experience": []}');
INSERT INTO config (key, value) VALUES ('settings', '{"name": "TRẦN QUỐC VINH", "profession": "EDITOR", "accentColor": "#E21D1D"}');
