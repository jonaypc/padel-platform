-- Fix comprehensive RLS policies for superadmin access
-- This migration ensures clubs and club_members are readable by authenticated users

-- ============================================
-- CLUBS TABLE - Ensure proper access
-- ============================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing SELECT policies on clubs to avoid conflicts
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON public.clubs;
DROP POLICY IF EXISTS "Public can view clubs" ON public.clubs;
DROP POLICY IF EXISTS "clubs_select_authenticated" ON public.clubs;
DROP POLICY IF EXISTS "clubs_select_public" ON public.clubs;

-- Create clean policies for clubs
CREATE POLICY "clubs_select_all"
ON public.clubs
FOR SELECT
USING (true);  -- Allow everyone (authenticated and anon) to read clubs

-- Ensure INSERT policy exists
DROP POLICY IF EXISTS "Admins can insert clubs" ON public.clubs;
DROP POLICY IF EXISTS "clubs_insert_auth" ON public.clubs;
CREATE POLICY "clubs_insert_auth"
ON public.clubs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Admins can update clubs" ON public.clubs;
DROP POLICY IF EXISTS "clubs_update_auth" ON public.clubs;
CREATE POLICY "clubs_update_auth"
ON public.clubs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure DELETE policy exists
DROP POLICY IF EXISTS "clubs_delete_auth" ON public.clubs;
CREATE POLICY "clubs_delete_auth"
ON public.clubs
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- CLUB_MEMBERS TABLE - Ensure proper access
-- ============================================
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing SELECT policies on club_members
DROP POLICY IF EXISTS "Members viewable by club members" ON public.club_members;
DROP POLICY IF EXISTS "Members viewable by all authenticated" ON public.club_members;
DROP POLICY IF EXISTS "club_members_select" ON public.club_members;
DROP POLICY IF EXISTS "club_members_select_all" ON public.club_members;

-- Create clean policy - allow all authenticated users to read club_members
CREATE POLICY "club_members_select_all"
ON public.club_members
FOR SELECT
USING (true);  -- Allow everyone to see club memberships

-- Ensure INSERT policy exists for club_members
DROP POLICY IF EXISTS "club_members_insert_auth" ON public.club_members;
CREATE POLICY "club_members_insert_auth"
ON public.club_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "club_members_update_auth" ON public.club_members;
CREATE POLICY "club_members_update_auth"
ON public.club_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure DELETE policy exists
DROP POLICY IF EXISTS "club_members_delete_auth" ON public.club_members;
CREATE POLICY "club_members_delete_auth"
ON public.club_members
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- PROFILES TABLE - Ensure proper access
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
USING (true);  -- Allow everyone to read profiles

-- Verify email column exists (needed for admin users page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;
