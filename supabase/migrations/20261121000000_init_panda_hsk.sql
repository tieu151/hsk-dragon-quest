CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'Học viên Panda' CHECK (char_length(trim(display_name)) BETWEEN 1 AND 60),
  avatar_url TEXT NOT NULL DEFAULT '🐼',
  current_hsk_level INT NOT NULL DEFAULT 1 CHECK (current_hsk_level BETWEEN 1 AND 9),
  daily_goal_minutes INT NOT NULL DEFAULT 15 CHECK (daily_goal_minutes BETWEEN 5 AND 480),
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  hide_on_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  migrated_from_local BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  coins BIGINT NOT NULL DEFAULT 0 CHECK (coins >= 0),
  current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_study_date DATE,
  journey_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  placement_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vocab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL CHECK (char_length(trim(word_id)) > 0),
  hsk_level INT NOT NULL DEFAULT 1 CHECK (hsk_level BETWEEN 1 AND 9),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered')),
  correct_count INT NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  wrong_count INT NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  srs_streak INT NOT NULL DEFAULT 0 CHECK (srs_streak >= 0),
  srs_ease NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (srs_ease >= 1.30),
  srs_interval_days INT NOT NULL DEFAULT 0 CHECK (srs_interval_days >= 0),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  added_to_notebook_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_review ON public.vocab_progress (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_level ON public.vocab_progress (user_id, hsk_level, status);

CREATE TABLE IF NOT EXISTS public.custom_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_deck_id TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_deck_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_decks_user ON public.custom_decks (user_id);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hsk_level INT NOT NULL CHECK (hsk_level BETWEEN 1 AND 9),
  exam_code TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'mock' CHECK (exam_type IN ('mock', 'placement', 'chapter_test')),
  skill_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  draft_state JSONB,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exam_code)
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_status ON public.exam_attempts (user_id, status, hsk_level);

CREATE TABLE IF NOT EXISTS public.pronunciation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_text TEXT NOT NULL,
  pinyin TEXT,
  overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  tone_score NUMERIC(5,2) CHECK (tone_score BETWEEN 0 AND 100),
  syllable_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_user_created ON public.pronunciation_results (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_content_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'listening', 'reading_story', 'grammar', 'writing')),
  content_id TEXT NOT NULL,
  hsk_level INT NOT NULL DEFAULT 1 CHECK (hsk_level BETWEEN 1 AND 9),
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_position_seconds INT NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_content_user ON public.learning_content_progress (user_id, content_type, hsk_level);

CREATE TABLE IF NOT EXISTS public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges (user_id);

CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_minutes INT NOT NULL DEFAULT 0 CHECK (study_minutes >= 0),
  words_learned INT NOT NULL DEFAULT 0 CHECK (words_learned >= 0),
  words_reviewed INT NOT NULL DEFAULT 0 CHECK (words_reviewed >= 0),
  skill_accuracy JSONB NOT NULL DEFAULT '{"listening":{"correct":0,"total":0},"reading":{"correct":0,"total":0},"writing":{"correct":0,"total":0},"speaking":{"correct":0,"total":0}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.daily_stats (user_id, stat_date DESC);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_ref TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TIME NOT NULL DEFAULT '20:00:00',
  push_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.leaderboard_scores AS
SELECT
  p.display_name,
  p.avatar_url,
  up.level,
  up.xp,
  up.current_streak
FROM public.profiles p
JOIN public.user_progress up ON up.user_id = p.id
WHERE p.hide_on_leaderboard = FALSE
ORDER BY up.xp DESC, up.level DESC
LIMIT 50;

GRANT SELECT ON public.leaderboard_scores TO anon, authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'user_progress', 'vocab_progress', 'custom_decks',
    'exam_attempts', 'pronunciation_results', 'learning_content_progress',
    'badges', 'user_badges', 'daily_stats', 'content_reports',
    'feedback', 'notification_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Học viên Panda'
  );
  v_avatar := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''), '🐼');

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, left(v_name, 60), v_avatar)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.badges (code, name, description, icon, criteria) VALUES
  ('first_word', 'Khởi Đầu Thuận Lợi', 'Học thuộc từ vựng tiếng Trung đầu tiên', '🌱', '{"mastered_words": 1}'),
  ('vocab_50', 'Tích Tiểu Thành Đại', 'Thuộc lòng 50 từ vựng HSK', '📚', '{"mastered_words": 50}'),
  ('vocab_300', 'Bậc Thầy Từ Vựng', 'Thuộc lòng 300 từ vựng HSK', '🎓', '{"mastered_words": 300}'),
  ('streak_3', 'Bền Bỉ 3 Ngày', 'Duy trì chuỗi học tập 3 ngày liên tiếp', '🔥', '{"streak": 3}'),
  ('streak_7', 'Chiến Binh Tuần Lễ', 'Duy trì chuỗi học tập 7 ngày liên tiếp', '⚡', '{"streak": 7}'),
  ('xp_1000', 'Ngôi Sao Panda', 'Đạt mốc 1.000 điểm kinh nghiệm XP', '⭐', '{"xp": 1000}'),
  ('exam_pass_1', 'Vượt Vũ Môn', 'Thi đạt kỳ thi thử HSK đầu tiên', '🏆', '{"passed_exams": 1}')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_progress_select_own" ON public.user_progress;
CREATE POLICY "user_progress_select_own" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_progress_update_safe_cols" ON public.user_progress;
CREATE POLICY "user_progress_update_safe_cols" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE (level, xp, coins, current_streak, longest_streak) ON public.user_progress FROM authenticated;

DROP POLICY IF EXISTS "vocab_progress_all_own" ON public.vocab_progress;
CREATE POLICY "vocab_progress_all_own" ON public.vocab_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_decks_all_own" ON public.custom_decks;
CREATE POLICY "custom_decks_all_own" ON public.custom_decks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "exam_attempts_all_own" ON public.exam_attempts;
CREATE POLICY "exam_attempts_all_own" ON public.exam_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pronunciation_all_own" ON public.pronunciation_results;
CREATE POLICY "pronunciation_all_own" ON public.pronunciation_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_content_all_own" ON public.learning_content_progress;
CREATE POLICY "learning_content_all_own" ON public.learning_content_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "badges_public_read" ON public.badges;
CREATE POLICY "badges_public_read" ON public.badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_stats_all_own" ON public.daily_stats;
CREATE POLICY "daily_stats_all_own" ON public.daily_stats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "content_reports_own" ON public.content_reports;
CREATE POLICY "content_reports_own" ON public.content_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_insert_any" ON public.feedback;
CREATE POLICY "feedback_insert_any" ON public.feedback FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "feedback_select_own" ON public.feedback;
CREATE POLICY "feedback_select_own" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_settings_all_own" ON public.notification_settings;
CREATE POLICY "notification_settings_all_own" ON public.notification_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-recordings', 'voice-recordings', false, 5242880, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "voice_storage_owner_all" ON storage.objects;
CREATE POLICY "voice_storage_owner_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.internal_evaluate_badges(p_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mastered INT;
  v_streak INT;
  v_xp BIGINT;
  v_passed INT;
BEGIN
  SELECT COUNT(*) INTO v_mastered FROM public.vocab_progress WHERE user_id = p_uid AND status = 'mastered';
  SELECT current_streak, xp INTO v_streak, v_xp FROM public.user_progress WHERE user_id = p_uid;
  SELECT COUNT(*) INTO v_passed FROM public.exam_attempts WHERE user_id = p_uid AND status = 'submitted' AND passed = TRUE;

  IF v_mastered >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'first_word') ON CONFLICT DO NOTHING;
  END IF;
  IF v_mastered >= 50 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'vocab_50') ON CONFLICT DO NOTHING;
  END IF;
  IF v_mastered >= 300 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'vocab_300') ON CONFLICT DO NOTHING;
  END IF;
  IF COALESCE(v_streak, 0) >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'streak_3') ON CONFLICT DO NOTHING;
  END IF;
  IF COALESCE(v_streak, 0) >= 7 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'streak_7') ON CONFLICT DO NOTHING;
  END IF;
  IF COALESCE(v_xp, 0) >= 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'xp_1000') ON CONFLICT DO NOTHING;
  END IF;
  IF v_passed >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_code) VALUES (p_uid, 'exam_pass_1') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_record_study_reward(
  p_xp_delta INT DEFAULT 0,
  p_coins_delta INT DEFAULT 0,
  p_study_minutes INT DEFAULT 0,
  p_words_learned INT DEFAULT 0,
  p_words_reviewed INT DEFAULT 0
)
RETURNS public.user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_xp INT := GREATEST(0, LEAST(COALESCE(p_xp_delta, 0), 500));
  v_coins INT := GREATEST(0, LEAST(COALESCE(p_coins_delta, 0), 200));
  v_mins INT := GREATEST(0, LEAST(COALESCE(p_study_minutes, 0), 180));
  v_learned INT := GREATEST(0, LEAST(COALESCE(p_words_learned, 0), 200));
  v_reviewed INT := GREATEST(0, LEAST(COALESCE(p_words_reviewed, 0), 500));
  v_row public.user_progress;
  v_new_streak INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_row FROM public.user_progress WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_progress (user_id) VALUES (v_uid) RETURNING * INTO v_row;
  END IF;

  IF v_row.last_study_date = v_today THEN
    v_new_streak := GREATEST(1, v_row.current_streak);
  ELSIF v_row.last_study_date = (v_today - 1) THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE public.user_progress
  SET
    xp = v_row.xp + v_xp,
    coins = v_row.coins + v_coins,
    level = FLOOR((v_row.xp + v_xp) / 100)::INT + 1,
    current_streak = v_new_streak,
    longest_streak = GREATEST(v_row.longest_streak, v_new_streak),
    last_study_date = v_today
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  INSERT INTO public.daily_stats (user_id, stat_date, study_minutes, words_learned, words_reviewed)
  VALUES (v_uid, v_today, v_mins, v_learned, v_reviewed)
  ON CONFLICT (user_id, stat_date) DO UPDATE SET
    study_minutes = public.daily_stats.study_minutes + EXCLUDED.study_minutes,
    words_learned = public.daily_stats.words_learned + EXCLUDED.words_learned,
    words_reviewed = public.daily_stats.words_reviewed + EXCLUDED.words_reviewed;

  PERFORM public.internal_evaluate_badges(v_uid);
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_record_study_reward(INT, INT, INT, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_submit_exam_attempt(
  p_hsk_level INT,
  p_exam_code TEXT,
  p_exam_type TEXT,
  p_skill_scores JSONB,
  p_total_score NUMERIC,
  p_max_score NUMERIC,
  p_passed BOOLEAN,
  p_duration_seconds INT,
  p_answers JSONB
)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_attempt public.exam_attempts;
  v_bonus_xp INT;
  v_bonus_coins INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_max_score <= 0 OR p_total_score < 0 OR p_total_score > p_max_score THEN
    RAISE EXCEPTION 'Invalid exam score bounds';
  END IF;

  INSERT INTO public.exam_attempts (
    user_id, hsk_level, exam_code, exam_type, skill_scores,
    total_score, max_score, passed, duration_seconds, draft_state, answers, status, submitted_at
  )
  VALUES (
    v_uid, p_hsk_level, p_exam_code, COALESCE(p_exam_type, 'mock'), COALESCE(p_skill_scores, '{}'::jsonb),
    p_total_score, p_max_score, COALESCE(p_passed, FALSE), GREATEST(0, COALESCE(p_duration_seconds, 0)),
    NULL, COALESCE(p_answers, '{}'::jsonb), 'submitted', now()
  )
  ON CONFLICT (user_id, exam_code) DO UPDATE SET
    skill_scores = EXCLUDED.skill_scores,
    total_score = EXCLUDED.total_score,
    max_score = EXCLUDED.max_score,
    passed = EXCLUDED.passed,
    duration_seconds = EXCLUDED.duration_seconds,
    draft_state = NULL,
    answers = EXCLUDED.answers,
    status = 'submitted',
    submitted_at = now()
  RETURNING * INTO v_attempt;

  v_bonus_xp := CASE WHEN p_passed THEN 120 ELSE 40 END;
  v_bonus_coins := CASE WHEN p_passed THEN 25 ELSE 8 END;
  PERFORM public.rpc_record_study_reward(v_bonus_xp, v_bonus_coins, GREATEST(1, COALESCE(p_duration_seconds, 60) / 60), 0, 0);

  RETURN v_attempt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_submit_exam_attempt(INT, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, BOOLEAN, INT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_migrate_local_data(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile JSONB := COALESCE(p_payload->'profile', '{}'::jsonb);
  v_srs JSONB := COALESCE(p_payload->'srs', '{}'::jsonb);
  v_decks JSONB := COALESCE(p_payload->'customDecks', '[]'::jsonb);
  v_exams JSONB := COALESCE(p_payload->'examHistory', '[]'::jsonb);
  v_k TEXT;
  v_v JSONB;
  v_item JSONB;
  v_streak INT;
  v_reviews INT;
  v_status TEXT;
  v_migrated_words INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET
    display_name = COALESCE(NULLIF(trim(v_profile->>'name'), ''), display_name),
    avatar_url = COALESCE(NULLIF(trim(v_profile->>'avatar'), ''), avatar_url),
    current_hsk_level = LEAST(9, GREATEST(1, COALESCE((v_profile->>'activeWorld')::INT, current_hsk_level))),
    migrated_from_local = TRUE
  WHERE id = v_uid;

  UPDATE public.user_progress
  SET
    xp = GREATEST(xp, GREATEST(0, COALESCE((v_profile->>'xp')::BIGINT, 0))),
    coins = GREATEST(coins, GREATEST(0, COALESCE((v_profile->>'coins')::BIGINT, 0))),
    current_streak = GREATEST(current_streak, GREATEST(0, COALESCE((v_profile->>'streak')::INT, 0))),
    longest_streak = GREATEST(longest_streak, GREATEST(0, COALESCE((v_profile->>'streak')::INT, 0))),
    level = FLOOR(GREATEST(xp, GREATEST(0, COALESCE((v_profile->>'xp')::BIGINT, 0))) / 100)::INT + 1
  WHERE user_id = v_uid;

  FOR v_k, v_v IN SELECT * FROM jsonb_each(v_srs)
  LOOP
    v_streak := GREATEST(0, COALESCE((v_v->>'streak')::INT, 0));
    v_reviews := GREATEST(1, COALESCE((v_v->>'reviews')::INT, 1));
    v_status := CASE WHEN v_streak >= 3 THEN 'mastered' ELSE 'learning' END;

    INSERT INTO public.vocab_progress (
      user_id, word_id, status, correct_count, srs_streak, srs_interval_days, last_reviewed_at
    )
    VALUES (
      v_uid, v_k, v_status, v_streak, v_streak,
      CASE WHEN v_streak >= 3 THEN 7 ELSE 1 END,
      now()
    )
    ON CONFLICT (user_id, word_id) DO UPDATE SET
      srs_streak = GREATEST(public.vocab_progress.srs_streak, EXCLUDED.srs_streak),
      correct_count = GREATEST(public.vocab_progress.correct_count, EXCLUDED.correct_count),
      status = CASE
        WHEN GREATEST(public.vocab_progress.srs_streak, EXCLUDED.srs_streak) >= 3 THEN 'mastered'
        ELSE 'learning'
      END;

    v_migrated_words := v_migrated_words + 1;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_decks)
  LOOP
    INSERT INTO public.custom_decks (user_id, client_deck_id, title, words)
    VALUES (
      v_uid,
      COALESCE(v_item->>'id', md5(v_item::text)),
      COALESCE(NULLIF(trim(v_item->>'title'), ''), 'Bộ thẻ cũ'),
      COALESCE(v_item->'words', '[]'::jsonb)
    )
    ON CONFLICT (user_id, client_deck_id) DO NOTHING;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_exams)
  LOOP
    INSERT INTO public.exam_attempts (
      user_id, hsk_level, exam_code, exam_type, total_score, max_score, passed, status, submitted_at
    )
    VALUES (
      v_uid,
      LEAST(9, GREATEST(1, COALESCE((v_item->>'level')::INT, 1))),
      COALESCE(NULLIF(v_item->>'examId', ''), 'LEGACY-' || md5(v_item::text)),
      'mock',
      GREATEST(0, COALESCE((v_item->>'score')::NUMERIC, 0)),
      GREATEST(1, COALESCE((v_item->>'maxScore')::NUMERIC, 100)),
      COALESCE((v_item->>'passed')::BOOLEAN, FALSE),
      'submitted',
      now()
    )
    ON CONFLICT (user_id, exam_code) DO NOTHING;
  END LOOP;

  PERFORM public.internal_evaluate_badges(v_uid);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'migrated_words', v_migrated_words
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_migrate_local_data(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_export_my_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'exported_at', now(),
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_uid),
    'progress', (SELECT to_jsonb(up) FROM public.user_progress up WHERE up.user_id = v_uid),
    'vocab_progress', COALESCE((SELECT jsonb_agg(to_jsonb(vp)) FROM public.vocab_progress vp WHERE vp.user_id = v_uid), '[]'::jsonb),
    'custom_decks', COALESCE((SELECT jsonb_agg(to_jsonb(cd)) FROM public.custom_decks cd WHERE cd.user_id = v_uid), '[]'::jsonb),
    'exam_attempts', COALESCE((SELECT jsonb_agg(to_jsonb(ea)) FROM public.exam_attempts ea WHERE ea.user_id = v_uid), '[]'::jsonb),
    'pronunciation_results', COALESCE((SELECT jsonb_agg(to_jsonb(pr)) FROM public.pronunciation_results pr WHERE pr.user_id = v_uid), '[]'::jsonb),
    'learning_content_progress', COALESCE((SELECT jsonb_agg(to_jsonb(lc)) FROM public.learning_content_progress lc WHERE lc.user_id = v_uid), '[]'::jsonb),
    'badges', COALESCE((SELECT jsonb_agg(to_jsonb(ub)) FROM public.user_badges ub WHERE ub.user_id = v_uid), '[]'::jsonb),
    'daily_stats', COALESCE((SELECT jsonb_agg(to_jsonb(ds)) FROM public.daily_stats ds WHERE ds.user_id = v_uid), '[]'::jsonb),
    'notification_settings', (SELECT to_jsonb(ns) FROM public.notification_settings ns WHERE ns.user_id = v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_export_my_data() TO authenticated;