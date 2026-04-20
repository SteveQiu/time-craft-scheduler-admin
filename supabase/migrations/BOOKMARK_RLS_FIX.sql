-- Fix RLS policy for bookmarks INSERT
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can create their own bookmarks"
ON public.bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Test INSERT manually (copy your user ID if needed)
-- INSERT INTO bookmarks (user_id, bookmarked_user_id) 
-- VALUES (auth.uid(), '276a81aa-0d96-4992-9105-23c3cbb4c092')
-- RETURNING *;
