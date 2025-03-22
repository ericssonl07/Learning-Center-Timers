-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Superusers can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own timers" ON timers;
DROP POLICY IF EXISTS "Users can insert own timers" ON timers;
DROP POLICY IF EXISTS "Users can update own timers" ON timers;
DROP POLICY IF EXISTS "Users can delete own timers" ON timers;

-- Create simplified policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create simplified policies for timers
CREATE POLICY "Users can read own timers"
  ON timers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timers"
  ON timers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timers"
  ON timers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timers"
  ON timers FOR DELETE
  USING (auth.uid() = user_id);

-- Update the get_profile_by_id function to be more robust
CREATE OR REPLACE FUNCTION get_profile_by_id(p_user_id UUID)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record profiles;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = p_user_id;
  RETURN profile_record;
END;
$$;

-- Update the get_timers_for_user function to handle superuser access
CREATE OR REPLACE FUNCTION get_timers_for_user(p_user_id UUID, p_is_superuser BOOLEAN)
RETURNS SETOF timers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_is_superuser THEN
    -- Superuser can see all timers
    RETURN QUERY SELECT * FROM timers ORDER BY start_time;
  ELSE
    -- Regular user can only see their approved timers
    RETURN QUERY 
      SELECT * FROM timers 
      WHERE user_id = p_user_id AND status = 'approved'
      ORDER BY start_time;
  END IF;
END;
$$;

-- Update the get_pending_timers function
CREATE OR REPLACE FUNCTION get_pending_timers()
RETURNS SETOF timers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
    SELECT * FROM timers 
    WHERE status = 'requested'
    ORDER BY created_at;
END;
$$;

-- Update the get_pending_superusers function
CREATE OR REPLACE FUNCTION get_pending_superusers()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
    SELECT * FROM profiles 
    WHERE role = 'superuser' AND status = 'pending'
    ORDER BY created_at;
END;
$$;

-- Update the approve_timer function
CREATE OR REPLACE FUNCTION approve_timer(p_timer_id UUID)
RETURNS timers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_timestamp BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  timer_record timers;
BEGIN
  -- Update the timer status
  UPDATE timers 
  SET 
    status = 'approved',
    is_active = CASE WHEN now_timestamp >= start_time THEN TRUE ELSE FALSE END
  WHERE id = p_timer_id
  RETURNING * INTO timer_record;
  
  -- Return the updated timer
  RETURN timer_record;
END;
$$;

-- Update the approve_superuser function
CREATE OR REPLACE FUNCTION approve_superuser(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET status = 'active'
  WHERE id = p_user_id AND role = 'superuser';
END;
$$;

