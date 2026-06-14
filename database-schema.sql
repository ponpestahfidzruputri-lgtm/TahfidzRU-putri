-- 1. CLEANUP: Hapus semua kebijakan, trigger, dan fungsi lama secara paksa
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 2. TABLES: Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'wali' CHECK (role IN ('admin', 'pengajar', 'wali')),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS santri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT,
    type TEXT DEFAULT 'Mukim' CHECK (type IN ('Mukim', 'Non-Mukim')),
    gender TEXT CHECK (gender IN ('L', 'P')),
    birth_date DATE,
    address TEXT,
    email TEXT,
    wali_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    photo_url TEXT,
    tahfidz_level TEXT DEFAULT 'yanbua' CHECK (tahfidz_level IN ('yanbua', 'binnadzhor', 'bilghoib')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    session TEXT DEFAULT 'Shubuh' CHECK (session IN ('Shubuh', 'Ashar', 'Isya')),
    status TEXT CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (santri_id, date, session)
);

CREATE TABLE IF NOT EXISTS tahfidz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    surah TEXT NOT NULL,
    from_ayat INTEGER,
    to_ayat INTEGER,
    type TEXT,
    fluency TEXT,
    session TEXT DEFAULT 'Shubuh' CHECK (session IN ('Shubuh', 'Ashar', 'Isya')),
    setoran_level TEXT CHECK (setoran_level IN ('yanbua', 'binnadzhor', 'bilghoib') OR setoran_level IS NULL),
    setoran_mode TEXT DEFAULT 'per_halaman' CHECK (setoran_mode IN ('per_juz', 'per_halaman')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kurikulum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    kurikulum_id UUID REFERENCES kurikulum(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL,
    status TEXT CHECK (status IN ('Pending', 'Paid', 'Cancelled')),
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ijazah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pencapaian TEXT,
    predikat TEXT DEFAULT 'Mumtaz',
    location TEXT DEFAULT 'Cihanjuang, Parongpong',
    left_sign_name TEXT,
    left_sign_title TEXT DEFAULT 'Pengasuh Pesantren',
    right_sign_name TEXT,
    right_sign_title TEXT DEFAULT 'Ketua Program Tahfidz',
    is_published BOOLEAN DEFAULT FALSE,
    issue_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME DEFAULT '08:00',
    location TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    poster_url TEXT,
    alt TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galeri_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Kegiatan' CHECK (category IN ('Kegiatan', 'Fasilitas', 'Kajian')),
    image_url TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY: Aktifkan RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz ENABLE ROW LEVEL SECURITY;
ALTER TABLE kurikulum ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ijazah ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeri_items ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTION: is_admin (Anti-Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4b. HELPER FUNCTION: delete_user (Security Definer untuk hapus akun auth.users oleh admin)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menghapus akun.';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. POLICIES: Bersih dan Aman
CREATE POLICY "allow_select_all_profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "allow_insert_self_profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "allow_update_own_profiles" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "allow_admin_manage_profiles" ON profiles FOR ALL USING (is_admin());

CREATE POLICY "santri_select_auth" ON santri FOR SELECT USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar') OR
    wali_id = auth.uid()
);
CREATE POLICY "santri_admin_all" ON santri FOR ALL USING (is_admin());
CREATE POLICY "santri_pengajar_update" ON santri FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

CREATE POLICY "absensi_select_all" ON absensi FOR SELECT USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar') OR
    EXISTS (SELECT 1 FROM public.santri WHERE id = absensi.santri_id AND wali_id = auth.uid())
);
CREATE POLICY "absensi_admin_all" ON absensi FOR ALL USING (is_admin());
CREATE POLICY "absensi_pengajar_all" ON absensi FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

CREATE POLICY "tahfidz_select_all" ON tahfidz FOR SELECT USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar') OR
    EXISTS (SELECT 1 FROM public.santri WHERE id = tahfidz.santri_id AND wali_id = auth.uid())
);
CREATE POLICY "tahfidz_admin_all" ON tahfidz FOR ALL USING (is_admin());
CREATE POLICY "tahfidz_pengajar_all" ON tahfidz FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

CREATE POLICY "nilai_select_all" ON nilai FOR SELECT USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar') OR
    EXISTS (SELECT 1 FROM public.santri WHERE id = nilai.santri_id AND wali_id = auth.uid())
);
CREATE POLICY "nilai_admin_all" ON nilai FOR ALL USING (is_admin());
CREATE POLICY "nilai_pengajar_all" ON nilai FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

CREATE POLICY "kurikulum_select_all" ON kurikulum FOR SELECT USING (true);
CREATE POLICY "kurikulum_admin_all" ON kurikulum FOR ALL USING (is_admin());

CREATE POLICY "transactions_admin_all" ON transactions FOR ALL USING (is_admin());
CREATE POLICY "transactions_select_wali" ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM santri WHERE santri.id = transactions.santri_id AND santri.wali_id = auth.uid())
);

CREATE POLICY "agenda_select_all" ON agenda FOR SELECT USING (true);
CREATE POLICY "agenda_admin_all" ON agenda FOR ALL USING (is_admin());
CREATE POLICY "agenda_pengajar_all" ON agenda FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

CREATE POLICY "hero_slides_select_all" ON hero_slides FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "hero_slides_admin_all" ON hero_slides FOR ALL USING (is_admin());

CREATE POLICY "galeri_items_select_all" ON galeri_items FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "galeri_items_admin_all" ON galeri_items FOR ALL USING (is_admin());

-- Storage bucket untuk foto/video konten website
INSERT INTO storage.buckets (id, name, public)
VALUES ('konten', 'konten', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "konten_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'konten');
CREATE POLICY "konten_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'konten' AND is_admin());
CREATE POLICY "konten_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'konten' AND is_admin());
CREATE POLICY "konten_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'konten' AND is_admin());

-- 6. TRIGGER: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_approved)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'wali',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TIPS: Promosikan diri jadi admin jika terkunci (JALANKAN MANUAL JIKA PERLU):
-- UPDATE profiles SET role = 'admin', is_approved = true WHERE email = 'YOUR_EMAIL@gmail.com';
