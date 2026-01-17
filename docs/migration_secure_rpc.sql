-- Secure RPC functions for PIN management
-- This replaces direct table access to prevent hash leaks

-- 1. Revoke direct access (Optional: You can disable RLS or drop policies manually)
-- We recommend dropping the old policies to enforce security
DROP POLICY IF EXISTS "Allow public insert on member_auth" ON member_auth;
DROP POLICY IF EXISTS "Allow public select on member_auth" ON member_auth;
DROP POLICY IF EXISTS "Allow public update on member_auth" ON member_auth;

-- 2. Verify PIN
CREATE OR REPLACE FUNCTION verify_pin(input_member_id UUID, input_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM member_auth
    WHERE member_id = input_member_id
    AND pin_hash = input_pin_hash
  );
END;
$$;

-- 3. Set Initial PIN
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

-- 4. Change PIN
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

-- 5. Check if PIN exists (for legacy user detection)
CREATE OR REPLACE FUNCTION has_pin(input_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM member_auth WHERE member_id = input_member_id);
END;
$$;
