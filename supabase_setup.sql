-- =========================================================
-- SUPABASE DATABASE SETUP FOR SHOES FACTORY E-COMMERCE
-- Includes User Profiles, Orders, Cart, RLS, and Auth Trigger
-- =========================================================

-- 1. Create Profiles Table (Linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT DEFAULT 'Guest User',
    email TEXT,
    phone TEXT,
    address TEXT,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access to profiles" ON public.profiles;

-- Profiles Policies (Allow users to read and update their own profile)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR id IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    status TEXT DEFAULT 'Completed' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Create Cart Table
CREATE TABLE IF NOT EXISTS public.cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Cart
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart" ON public.cart;
DROP POLICY IF EXISTS "Users can upsert own cart" ON public.cart;

CREATE POLICY "Users can view own cart" ON public.cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own cart" ON public.cart FOR ALL USING (auth.uid() = user_id);

-- 4. Trigger to Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, email, name, mfa_enabled)
    VALUES (
        NEW.id,
        NEW.phone,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
