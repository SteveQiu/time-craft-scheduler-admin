-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bookmarked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, bookmarked_user_id),
    CHECK (user_id != bookmarked_user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_bookmarked_user_id ON public.bookmarks(bookmarked_user_id);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can create bookmarks for themselves
CREATE POLICY "Users can create their own bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- RLS Policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policy: Allow users to view ALL bookmarks (public read for counts/discovery)
CREATE POLICY "Allow public read on bookmarks"
ON public.bookmarks FOR SELECT
USING (true);
