-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES
-- ==========================================

-- Groups: The container for the game
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'blue-sky-99'
  admin_token UUID DEFAULT uuid_generate_v4(),
  access_code TEXT, -- Optional password for joining
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members: Users identified by client-side ID
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_seed TEXT, -- For DiceBear
  is_admin BOOLEAN DEFAULT false,
  completed_chapters INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member Auth: Secure PIN storage (Zero-Knowledge)
-- Access is STRICTLY restricted to RPC functions.
CREATE TABLE IF NOT EXISTS member_auth (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL, -- SHA-256 hash
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles: Member answers/data
CREATE TABLE IF NOT EXISTS profiles (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  answers JSONB NOT NULL -- Format: {"q1": {"val": "...", "isCustom": boolean}}
);

-- Quiz Questions: Generated questions for the game
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  target_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- e.g., 'q1'
  correct_option TEXT NOT NULL,
  distractors TEXT[] NOT NULL -- 3 wrong answers
);

-- Attempts: Tracking game scores
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guesser_id UUID REFERENCES members(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. INDICES (Performance)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_members_group_id ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_group_id ON quiz_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_attempts_guesser_id ON attempts(guesser_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question_id ON attempts(question_id);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_auth ENABLE ROW LEVEL SECURITY; -- Critical: No public policies added
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- PUBLIC ACCESS POLICIES
-- Note: We drop existing policies first to ensure we apply the correct ones
-- and avoid "policy already exists" errors.

-- Groups: Public read (for joining), Public insert (for creating)
DROP POLICY IF EXISTS "Public access for groups" ON groups;
DROP POLICY IF EXISTS "Enable all access for groups" ON groups; -- Legacy cleanup
CREATE POLICY "Public access for groups" ON groups FOR ALL USING (true);

-- Members: Public read/write (needed for lobby/joining)
DROP POLICY IF EXISTS "Public access for members" ON members;
DROP POLICY IF EXISTS "Enable all access for members" ON members; -- Legacy cleanup
CREATE POLICY "Public access for members" ON members FOR ALL USING (true);

-- Profiles: Public access (relies on UUID obscurity for privacy)
DROP POLICY IF EXISTS "Public access for profiles" ON profiles;
DROP POLICY IF EXISTS "Enable all access for profiles" ON profiles; -- Legacy cleanup
CREATE POLICY "Public access for profiles" ON profiles FOR ALL USING (true);

-- Quiz Questions: Public access (gameplay)
DROP POLICY IF EXISTS "Public access for quiz_questions" ON quiz_questions;
DROP POLICY IF EXISTS "Enable all access for quiz_questions" ON quiz_questions; -- Legacy cleanup
CREATE POLICY "Public access for quiz_questions" ON quiz_questions FOR ALL USING (true);

-- Attempts: Public access (gameplay)
DROP POLICY IF EXISTS "Public access for attempts" ON attempts;
DROP POLICY IF EXISTS "Enable all access for attempts" ON attempts; -- Legacy cleanup
CREATE POLICY "Public access for attempts" ON attempts FOR ALL USING (true);

-- NOTE: `member_auth` has NO policies, meaning it is DENY ALL by default.
-- Access is only possible via the SECURITY DEFINER functions below.

-- ==========================================
-- 4. SECURE RPC FUNCTIONS
-- ==========================================

-- Verify PIN
CREATE OR REPLACE FUNCTION verify_pin(input_member_id UUID, input_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM member_auth
    WHERE member_id = input_member_id
    AND pin_hash = input_pin_hash
  );
END;
$$;

-- Set Initial PIN
CREATE OR REPLACE FUNCTION set_pin(input_member_id UUID, input_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow if no PIN exists for this member
  IF EXISTS (SELECT 1 FROM member_auth WHERE member_id = input_member_id) THEN
    RETURN FALSE; -- Already has a PIN
  END IF;
  
  INSERT INTO member_auth (member_id, pin_hash)
  VALUES (input_member_id, input_pin_hash);
  
  RETURN TRUE;
END;
$$;

-- Change PIN
CREATE OR REPLACE FUNCTION change_pin(input_member_id UUID, old_pin_hash TEXT, new_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify old pin matches
  IF NOT EXISTS (
    SELECT 1 FROM member_auth
    WHERE member_id = input_member_id
    AND pin_hash = old_pin_hash
  ) THEN
    RETURN FALSE; -- Incorrect old PIN
  END IF;

  UPDATE member_auth
  SET pin_hash = new_pin_hash,
      created_at = NOW()
  WHERE member_id = input_member_id;
  
  RETURN TRUE;
END;
$$;

-- Check if PIN exists (for legacy user detection)
CREATE OR REPLACE FUNCTION has_pin(input_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM member_auth WHERE member_id = input_member_id);
END;
$$;
