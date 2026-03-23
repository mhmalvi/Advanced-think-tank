-- ============================================================================
-- Migration 007: Allow anonymous read access to stories
-- Stories are public intelligence briefs - no auth needed to view them.
-- Run this in the Supabase SQL Editor with the service_role key.
-- ============================================================================

-- Allow anon users to read stories (public dashboard)
CREATE POLICY "Anyone can view stories"
  ON public.stories FOR SELECT TO anon
  USING (true);

-- Also allow anon to read articles (for story source references)
CREATE POLICY "Anyone can view articles"
  ON public.articles FOR SELECT TO anon
  USING (true);
