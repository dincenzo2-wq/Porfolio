-- Table for projects
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    year TEXT,
    videoUrl TEXT,
    thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for profile
DROP TABLE IF EXISTS profile;
CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bio TEXT,
    skills TEXT, -- JSON string
    experience TEXT, -- JSON string
    education TEXT -- JSON string
);

-- Table for settings
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    profession TEXT,
    slogan TEXT,
    avatar TEXT,
    accentColor TEXT,
    categories TEXT, -- JSON string
    footerSubHeader TEXT,
    footerMainTitle TEXT,
    footerEmail TEXT,
    footerPhone TEXT,
    footerLocation TEXT,
    footerCoords TEXT,
    footerVimeo TEXT,
    footerBehance TEXT,
    footerYoutube TEXT
);

-- Table for old config (cleanup)
DROP TABLE IF EXISTS config;
