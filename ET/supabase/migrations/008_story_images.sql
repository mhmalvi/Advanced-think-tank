-- ============================================================================
-- Migration 008: Add image_url to stories and articles
-- Captures hero images from RSS feeds for visual dashboard.
-- Run this in the Supabase SQL Editor with the service_role key.
-- ============================================================================

-- Add image_url to articles (captured from RSS enclosure/media tags)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to stories (best image from source articles)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS image_url text;
