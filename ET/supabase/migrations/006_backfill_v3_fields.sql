-- ============================================================================
-- Migration 006: Backfill V3 fields on existing sources and articles
-- SAFE: Updates only NULL/empty fields. Does not delete or restructure.
-- Run this in the Supabase SQL Editor with the service_role key.
-- ============================================================================

-- === FIX SOURCE METADATA (region, language) ===

-- Danish sources
UPDATE sources SET region = 'Nordics', language = 'da'
WHERE slug IN ('berlingske', 'borsen', 'boersen', 'dr-nyheder', 'tv2-nyheder', 'finans', 'jyllands-posten', 'politiken')
  AND (region IS NULL OR language = 'en');

-- Nordic (non-Danish)
UPDATE sources SET region = 'Nordics', language = 'no'
WHERE slug = 'ntb' AND region IS NULL;

UPDATE sources SET region = 'Nordics', language = 'en'
WHERE slug = 'reuters-nordic' AND region IS NULL;

-- Global English
UPDATE sources SET region = 'Global'
WHERE slug IN ('bbc', 'ft', 'economist') AND region IS NULL;

-- USA
UPDATE sources SET region = 'USA'
WHERE slug IN ('nyt', 'wsj') AND region IS NULL;

-- EU/Institutional
UPDATE sources SET region = 'EU'
WHERE slug IN ('eu-parliament', 'eurostat') AND region IS NULL;

-- Middle East
UPDATE sources SET region = 'Middle East'
WHERE slug = 'aljazeera' AND region IS NULL;

-- Asia
UPDATE sources SET region = 'Asia'
WHERE slug IN ('scmp', 'nikkei', 'caixin') AND region IS NULL;

-- Bloomberg already has region='Global' but verify
UPDATE sources SET region = 'Global'
WHERE slug = 'bloomberg' AND region IS NULL;

-- Web Search source
UPDATE sources SET region = 'Global'
WHERE slug = 'web-search' AND region IS NULL;

-- === BACKFILL ARTICLES ===

-- Set source_name from sources table
UPDATE articles
SET source_name = s.name
FROM sources s
WHERE articles.source_id = s.id
  AND articles.source_name IS NULL;

-- Set is_processed = true for articles that already have embeddings
UPDATE articles
SET is_processed = true
WHERE embedding_id IS NOT NULL
  AND is_processed = false;

-- Set article region from source region
UPDATE articles
SET region = s.region
FROM sources s
WHERE articles.source_id = s.id
  AND articles.region IS NULL
  AND s.region IS NOT NULL;

-- Set article language from source language
UPDATE articles
SET language = s.language
FROM sources s
WHERE articles.source_id = s.id
  AND articles.language = 'en'
  AND s.language != 'en';

-- === VERIFY ===
-- After running, check:
-- SELECT name, slug, region, language FROM sources ORDER BY name;
-- SELECT count(*) FROM articles WHERE source_name IS NOT NULL;
-- SELECT count(*) FROM articles WHERE is_processed = true;
-- SELECT count(*) FROM articles WHERE region IS NOT NULL;
