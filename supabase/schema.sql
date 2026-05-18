-- ============================================================
-- Trendspotter — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- profiles
-- Automatically created when a user signs up via Supabase Auth
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- trends
-- Stores daily scraped YouTube trending video data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trends (
  id              BIGSERIAL PRIMARY KEY,
  video_id        TEXT NOT NULL,
  title           TEXT NOT NULL,
  channel_name    TEXT,
  view_count      BIGINT NOT NULL DEFAULT 0,
  like_count      BIGINT NOT NULL DEFAULT 0,
  comment_count   BIGINT NOT NULL DEFAULT 0,
  trending_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  thumbnail_url   TEXT,
  has_sponsorship BOOLEAN NOT NULL DEFAULT FALSE,
  date_fetched    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries for the same video on the same day
  UNIQUE (video_id, date_fetched)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trends_date_fetched    ON public.trends (date_fetched DESC);
CREATE INDEX IF NOT EXISTS idx_trends_trending_score  ON public.trends (trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trends_video_id        ON public.trends (video_id);
CREATE INDEX IF NOT EXISTS idx_trends_title_search    ON public.trends USING gin(to_tsvector('english', title));

-- ============================================================
-- saved_items
-- Users can bookmark trending videos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items (user_id);

-- ============================================================
-- error_logs
-- Pipeline errors are written here for debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS public.error_logs (
  id         BIGSERIAL PRIMARY KEY,
  source     TEXT NOT NULL,
  message    TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- profiles: users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- trends: publicly readable (no auth required for browsing)
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trends are publicly readable"
  ON public.trends FOR SELECT
  USING (true);

-- saved_items: users can only see and manage their own saves
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved items"
  ON public.saved_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved items"
  ON public.saved_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved items"
  ON public.saved_items FOR DELETE
  USING (auth.uid() = user_id);

-- error_logs: only service role can write (no user-facing RLS needed)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Done!
-- ============================================================
