-- Cloudflare D1 SQL Schema for Portfolio CMS
-- Execute using: npx wrangler d1 execute portfolio-db --file=./functions/schema.sql

-- 1. Table: site_content (Stores unified payload document for fast read/write)
CREATE TABLE IF NOT EXISTS portfolio_content (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data_json TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Structured Relational Projects Table (Optionally queried directly)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  client_or_agency TEXT NOT NULL,
  category TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  grid_span TEXT DEFAULT 'col-span-12 md:col-span-6',
  year TEXT NOT NULL,
  duration TEXT NOT NULL,
  deliverable_role TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  video_url TEXT,
  agency_brief TEXT NOT NULL,
  turnaround_time TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stills Table
CREATE TABLE IF NOT EXISTS stills (
  id TEXT PRIMARY KEY,
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  row_group TEXT NOT NULL DEFAULT 'top',
  year TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 4. Initial Indexing
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_stills_row ON stills(row_group);
