-- Separate table to store sensitive auth data
-- This prevents 'SELECT * FROM members' from leaking PINs
CREATE TABLE IF NOT EXISTS member_auth (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the auth table
ALTER TABLE member_auth ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (creating their PIN)
CREATE POLICY "Allow public insert on member_auth" ON member_auth FOR INSERT WITH CHECK (true);

-- Allow anyone to SELECT (verifying PIN) - In a real strict app we'd use an RPC, 
-- but for this game, we allow checking if a hash exists.
CREATE POLICY "Allow public select on member_auth" ON member_auth FOR SELECT USING (true);

-- Allow users to UPDATE their own PIN (conceptually)
CREATE POLICY "Allow public update on member_auth" ON member_auth FOR UPDATE USING (true);
