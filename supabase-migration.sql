-- ============================================================
-- MIGRATION: Update database untuk putri (hapus gender, update sesi & setoran)
-- ============================================================

-- 1. Hapus kolom gender dari tabel santri (semua santri adalah putri)
ALTER TABLE santri DROP COLUMN IF EXISTS gender;

-- 2. Update constraint session di tabel absensi (putri: Shubuh, Ashar, Isya)
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_session_check;
ALTER TABLE absensi ADD CONSTRAINT absensi_session_check
CHECK (session IN ('Shubuh', 'Ashar', 'Isya'));

-- 3. Update data absensi: hapus atau update session 'Maghrib' jika ada
UPDATE absensi SET session = 'Isya' WHERE session = 'Maghrib';

-- 4. Tambah kolom session ke tabel tahfidz
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'Shubuh';
UPDATE tahfidz SET session = 'Shubuh' WHERE session IS NULL;

-- 5. Tambah constraint session di tabel tahfidz
ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_session_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_session_check
CHECK (session IN ('Shubuh', 'Ashar', 'Isya'));

-- 6. Tambah kolom setoran_level ke tabel tahfidz
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS setoran_level TEXT;

-- 7. Tambah constraint setoran_level di tabel tahfidz
ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_setoran_level_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_setoran_level_check
CHECK (setoran_level IN ('yanbua', 'binnadzhor', 'bilghoib') OR setoran_level IS NULL);

-- 8. Pastikan kolom setoran_mode ada dengan constraint yang benar
ALTER TABLE tahfidz ADD COLUMN IF NOT EXISTS setoran_mode TEXT DEFAULT 'per_halaman';
UPDATE tahfidz SET setoran_mode = 'per_halaman' WHERE setoran_mode IS NULL;
ALTER TABLE tahfidz DROP CONSTRAINT IF EXISTS tahfidz_setoran_mode_check;
ALTER TABLE tahfidz ADD CONSTRAINT tahfidz_setoran_mode_check
CHECK (setoran_mode IN ('per_juz', 'per_halaman'));

-- 9. Update tahfidz_level di santri agar include 'yanbua'
ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_tahfidz_level_check;
ALTER TABLE santri ADD CONSTRAINT santri_tahfidz_level_check
CHECK (tahfidz_level IN ('yanbua', 'binnadzhor', 'bilghoib'));

-- 10. Update default tahfidz_level menjadi 'yanbua' untuk santri baru
ALTER TABLE santri ALTER COLUMN tahfidz_level SET DEFAULT 'yanbua';
UPDATE santri SET tahfidz_level = 'yanbua' WHERE tahfidz_level IS NULL OR tahfidz_level = 'binnadzhor';

-- 11. Tambah kolom type ke santri jika belum ada
ALTER TABLE santri ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Mukim'
  CHECK (type IN ('Mukim', 'Non-Mukim'));

-- 12. Update unique constraint untuk absensi
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_santri_id_date_key;
ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_santri_date_session_unique;
CREATE UNIQUE INDEX IF NOT EXISTS absensi_santri_date_session_unique
  ON absensi (santri_id, date, session);

-- 13. Update agenda
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS time TIME DEFAULT '08:00';
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 14. Update policies untuk agenda
DROP POLICY IF EXISTS "agenda_pengajar_all" ON agenda;
CREATE POLICY "agenda_pengajar_all" ON agenda FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

-- Konten website: hero slider & galeri
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

-- 15. Update policies untuk santri (agar pengajar bisa menaikkan tingkat santri)
DROP POLICY IF EXISTS "santri_pengajar_update" ON santri;
CREATE POLICY "santri_pengajar_update" ON santri FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pengajar')
);

-- 16. HELPER FUNCTION: delete_user untuk menghapus auth.users oleh admin
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menghapus akun.';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
