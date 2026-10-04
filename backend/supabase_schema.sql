-- Jewels 'n' Joys: Customer Profiles & Wishlist Schema for Supabase
-- Idempotent and safe migration script

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" 
        ON public.profiles FOR SELECT 
        USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" 
        ON public.profiles FOR INSERT 
        WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id);
    END IF;
END $$;

-- 2. Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Enable RLS on wishlist_items
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- Wishlist RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can view own wishlist'
    ) THEN
        CREATE POLICY "Users can view own wishlist" 
        ON public.wishlist_items FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can add to own wishlist'
    ) THEN
        CREATE POLICY "Users can add to own wishlist" 
        ON public.wishlist_items FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can delete from own wishlist'
    ) THEN
        CREATE POLICY "Users can delete from own wishlist" 
        ON public.wishlist_items FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Automatic Profile Creation on Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Promotional Banners: RLS and Realtime Configuration
ALTER TABLE IF EXISTS public.promotional_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotional_banner_assets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Public read policy for published banners
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotional_banners' AND policyname = 'Public can view published promotional banners'
    ) THEN
        CREATE POLICY "Public can view published promotional banners" 
        ON public.promotional_banners FOR SELECT 
        USING (status = 'published' AND is_active = true);
    END IF;

    -- Public read policy for assets of published banners
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'promotional_banner_assets' AND policyname = 'Public can view visible promotional banner assets'
    ) THEN
        CREATE POLICY "Public can view visible promotional banner assets" 
        ON public.promotional_banner_assets FOR SELECT 
        USING (is_visible = true);
    END IF;
END $$;

-- Enable Supabase Realtime publication on promotional_banners
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE promotional_banners;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
    WHEN undefined_object THEN
        NULL;
END $$;

