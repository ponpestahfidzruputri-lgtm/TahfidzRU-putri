-- ============================================================
-- MIGRATION: Update tabel untuk mendukung setoran 3 sesi (Shubuh, Ashar, Maghrib)
-- dan hapus gender karena semua santri adalah putra (laki-laki)
-- Jalankan di Supabase SQL Editor jika database sudah ada sebelumnya
-- ============================================================

-- 1. Update kolom type di tabel santri
ALTER TABLE santri ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Mukim';

ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_type_check;
ALTER TABLE santri ADD CONSTRAINT santri_type_check
  CHECK (type IN ('Mukim', 'Non-Mukim'));

-- 2. Update kolom session & type di tabel absensi (Subuh, Dzuhur, Ashar, Maghrib, Isya, Shubuh)
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'Subuh';
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'tahfidz';

UPDATE absensi SET type = 'tahfidz' WHERE type IS NULL;

-- Drop constraint lama jika ada dan buat constraint baru yang mendukung Sholat Berjamaah 5 Waktu & type
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_session_check;
ALTER TABLE absensi ADD CONSTRAINT absensi_session_check
  CHECK (session IN ('Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Shubuh'));

ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_type_check;
ALTER TABLE absensi ADD CONSTRAINT absensi_type_check
  CHECK (type IN ('berjamaah', 'tahfidz'));

-- Update unique constraint untuk absensi (santri_id, date, session, type)
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_santri_id_date_key;
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_santri_date_session_unique;
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_santri_id_date_session_type_key;
DROP INDEX IF EXISTS absensi_santri_date_session_unique;
CREATE UNIQUE INDEX IF NOT EXISTS absensi_santri_date_session_type_unique
  ON absensi (santri_id, date, session, COALESCE(type, 'tahfidz'));

-- 3. Update kolom session di tabel tahfidz (3 sesi: Shubuh, Ashar, Maghrib)
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'Shubuh';
UPDATE tahfidz SET session = 'Shubuh' WHERE session IS NULL;

ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_session_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_session_check
  CHECK (session IN ('Shubuh', 'Ashar', 'Maghrib'));

-- 4. Update kolom setoran_level di tabel tahfidz (yanbua, binnadzhor, bilghoib)
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS setoran_level TEXT;

ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_setoran_level_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_setoran_level_check
  CHECK (setoran_level IN ('yanbua', 'binnadzhor', 'bilghoib') OR setoran_level IS NULL);

-- 5. Update kolom setoran_mode di tabel tahfidz (per_juz, per_halaman)
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS setoran_mode TEXT DEFAULT 'per_halaman';
UPDATE tahfidz SET setoran_mode = 'per_halaman' WHERE setoran_mode IS NULL;

ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_setoran_mode_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_setoran_mode_check
  CHECK (setoran_mode IN ('per_juz', 'per_halaman'));

-- 6. Update kolom tahfidz_level di tabel santri (yanbua, binnadzhor, bilghoib)
ALTER TABLE santri ADD COLUMN IF NOT EXISTS tahfidz_level TEXT DEFAULT 'yanbua';

ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_tahfidz_level_check;
ALTER TABLE santri ADD CONSTRAINT santri_tahfidz_level_check
  CHECK (tahfidz_level IN ('yanbua', 'binnadzhor', 'bilghoib'));

-- 7. Hapus kolom gender dari tabel santri (semua santri adalah putra)
-- Hapus data santri putri jika ada
DELETE FROM santri WHERE gender = 'P';

-- Hapus constraint gender jika ada
ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_gender_check;

-- Hapus kolom gender
ALTER TABLE santri DROP COLUMN IF EXISTS gender;

-- 8. Update kolom time di tabel agenda
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS time TIME DEFAULT '08:00';

-- 9. Update kolom photo_url di tabel agenda
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 10. Update policy agenda untuk pengajar
DROP POLICY IF EXISTS "agenda_pengajar_all" ON agenda;
CREATE POLICY "agenda_pengajar_all" ON agenda FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

-- 11. Create setoran table untuk fitur baru (jika belum ada)
CREATE TABLE IF NOT EXISTS setoran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
  session TEXT DEFAULT 'Shubuh' CHECK (session IN ('Shubuh', 'Ashar', 'Maghrib')),
  setoran_kind TEXT CHECK (setoran_kind IN ('binnadzhor', 'bilghoib', 'yanbua')),
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setoran_admin_all" ON setoran;
CREATE POLICY "setoran_admin_all" ON setoran FOR ALL USING (is_admin());

-- 12. Konten website: hero slider & galeri
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

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeri_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_slides_select_all" ON hero_slides;
DROP POLICY IF EXISTS "hero_slides_admin_all" ON hero_slides;
CREATE POLICY "hero_slides_select_all" ON hero_slides FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "hero_slides_admin_all" ON hero_slides FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "galeri_items_select_all" ON galeri_items;
DROP POLICY IF EXISTS "galeri_items_admin_all" ON galeri_items;
CREATE POLICY "galeri_items_select_all" ON galeri_items FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "galeri_items_admin_all" ON galeri_items FOR ALL USING (is_admin());

-- 13. Storage bucket untuk konten website
INSERT INTO storage.buckets (id, name, public)
VALUES ('konten', 'konten', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "konten_public_read" ON storage.objects;
DROP POLICY IF EXISTS "konten_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "konten_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "konten_admin_delete" ON storage.objects;

CREATE POLICY "konten_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'konten');
CREATE POLICY "konten_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'konten' AND is_admin());
CREATE POLICY "konten_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'konten' AND is_admin());
CREATE POLICY "konten_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'konten' AND is_admin());

-- ============================================================
-- VERIFIKASI: Jalankan query ini untuk cek hasilnya
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'santri';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tahfidz';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'absensi';
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name LIKE 'tahfidz%';

-- ============================================================
-- MIGRATION: Fitur Uang Jajan & Peran Baru 'Pengurus'
-- ============================================================

-- 1. Perbarui check constraint pada tabel profiles untuk mendukung role 'pengurus'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'pengurus', 'pengajar', 'wali'));

-- 2. Kebijakan RLS untuk tabel santri (Pengurus bisa SELECT data santri)
DROP POLICY IF EXISTS "santri_pengurus_select" ON public.santri;
CREATE POLICY "santri_pengurus_select" ON public.santri FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengurus')
);

-- 3. Kebijakan RLS untuk tabel absensi (Pengurus bisa mengelola absensi)
DROP POLICY IF EXISTS "absensi_pengurus_all" ON public.absensi;
CREATE POLICY "absensi_pengurus_all" ON public.absensi FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengurus')
);

-- 4. Kebijakan RLS untuk tabel transactions (Pengurus bisa mengelola transaksi uang jajan)
DROP POLICY IF EXISTS "transactions_pengurus_all" ON public.transactions;
CREATE POLICY "transactions_pengurus_all" ON public.transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengurus')
);

-- 5. Kebijakan RLS untuk Wali Santri mengajukan & membatalkan top-up pending
DROP POLICY IF EXISTS "transactions_insert_wali" ON public.transactions;
CREATE POLICY "transactions_insert_wali" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.santri WHERE santri.id = transactions.santri_id AND santri.wali_id = auth.uid())
  AND status = 'Pending'
  AND type = 'Uang Masuk'
);

DROP POLICY IF EXISTS "transactions_delete_wali" ON public.transactions;
CREATE POLICY "transactions_delete_wali" ON public.transactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.santri WHERE santri.id = transactions.santri_id AND santri.wali_id = auth.uid())
  AND status = 'Pending'
);

-- 6. Perbarui check constraint pada tabel transactions agar mendukung Uang Masuk & Uang Keluar (selain SPP)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('SPP', 'Uang Masuk', 'Uang Keluar'));


