-- AI Token fields for profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_tokens integer DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_token_reset date DEFAULT CURRENT_DATE;

-- Create diet_groups table
CREATE TABLE IF NOT EXISTS public.diet_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    category text DEFAULT 'calorie',
    target_value numeric,
    password text,
    leader_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.diet_groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.diet_groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.diet_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Post Policies
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.diet_groups;
CREATE POLICY "Groups are viewable by everyone" ON public.diet_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create groups" ON public.diet_groups;
CREATE POLICY "Users can create groups" ON public.diet_groups FOR INSERT WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Leaders can update their groups" ON public.diet_groups;
CREATE POLICY "Leaders can update their groups" ON public.diet_groups FOR UPDATE USING (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Leaders can delete their groups" ON public.diet_groups;
CREATE POLICY "Leaders can delete their groups" ON public.diet_groups FOR DELETE USING (auth.uid() = leader_id);

-- Group Members Policies
DROP POLICY IF EXISTS "Members are viewable by everyone" ON public.group_members;
CREATE POLICY "Members are viewable by everyone" ON public.group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leaders can kick users" ON public.group_members;
CREATE POLICY "Leaders can kick users" ON public.group_members FOR DELETE USING (EXISTS (SELECT 1 FROM public.diet_groups WHERE id = group_members.group_id AND leader_id = auth.uid()));

-- Messages Policies
DROP POLICY IF EXISTS "Members can view messages" ON public.group_messages;
CREATE POLICY "Members can view messages" ON public.group_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can insert messages" ON public.group_messages;
CREATE POLICY "Members can insert messages" ON public.group_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- Update tokens function (optional, to use via RPC if needed, or you can just update from frontend)
-- For the frontend, users can update their own tokens
DROP POLICY IF EXISTS "Users can update their own token data" ON public.profiles;
CREATE POLICY "Users can update their own token data" ON public.profiles FOR UPDATE USING (auth.uid() = id);
