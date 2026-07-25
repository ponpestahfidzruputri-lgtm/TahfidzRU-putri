import { supabase } from '../lib/supabase';
import type { AbsensiSession } from '../constants/absensi';

const sanitizeSantriPayload = (data: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {
    name: String(data.name || '').trim(),
    nis: String(data.nis || '').trim(),
    class_name: String(data.class_name || '').trim() || null,
    type: data.type || 'Mukim',
    wali_id: data.wali_id ? data.wali_id : null,
    tahfidz_level: data.tahfidz_level || 'binnadzhor',
  };
  const email = String(data.email || '').trim();
  if (email) payload.email = email;
  const photo = data.photo_url;
  if (typeof photo === 'string' && photo.length > 0 && photo.length < 5_000_000) {
    payload.photo_url = photo;
  }
  return payload;
};

// Generic CRUD operations handler
const handleResponse = async (promise: any) => {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }
    return data;
  } catch (err: any) {
    console.error('Network/Request Error:', err);
    // Specifically handle "Failed to fetch" to provide a cleaner developer experience
    if (err.message === 'Failed to fetch') {
      throw new Error('Gagal menghubungi server. Pastikan koneksi internet aktif dan konfigurasi Supabase sudah benar.');
    }
    throw err;
  }
};

export const dataService = {
  // Santri
  getSantriList: () => handleResponse(supabase.from('santri').select('*').order('name')),
  getSantriById: (id: string) => handleResponse(supabase.from('santri').select('*').eq('id', id).single()),
  createSantri: (data: any) =>
    handleResponse(supabase.from('santri').insert(sanitizeSantriPayload(data)).select().single()),
  updateSantri: (id: string, data: any) =>
    handleResponse(supabase.from('santri').update(sanitizeSantriPayload(data)).eq('id', id).select().single()),
  deleteSantri: (id: string) => handleResponse(supabase.from('santri').delete().eq('id', id)),

  // Absensi
  getAbsensiList: (date?: string, session?: AbsensiSession) => {
    let query = supabase.from('absensi').select('*, santri(name, nis, class_name)');
    if (date) query = query.eq('date', date);
    if (session) query = query.eq('session', session);
    return handleResponse(query);
  },
  getAbsensiBySantri: (santriId: string) => handleResponse(
    supabase.from('absensi')
      .select('*')
      .eq('santri_id', santriId)
  ),
  saveAbsensi: async (absensiData: any[]) => {
    if (absensiData.length === 0) return null;
    const date = absensiData[0].date;
    const session = absensiData[0].session || 'Shubuh';
    const santriIds = absensiData.map(a => a.santri_id);

    await supabase
      .from('absensi')
      .delete()
      .eq('date', date)
      .eq('session', session)
      .in('santri_id', santriIds);

    return handleResponse(supabase.from('absensi').insert(absensiData));
  },

  // Tahfidz
  getTahfidzLogs: (santriId?: string) => {
    let query = supabase.from('tahfidz').select('*, santri(name)');
    if (santriId) query = query.eq('santri_id', santriId);
    return handleResponse(query.order('created_at', { ascending: false }));
  },
  createTahfidz: (data: any) => handleResponse(supabase.from('tahfidz').insert(data)),
  updateTahfidz: (id: string, data: any) => handleResponse(supabase.from('tahfidz').update(data).eq('id', id)),
  deleteTahfidz: (id: string) => handleResponse(supabase.from('tahfidz').delete().eq('id', id)),

  getAbsensiRecap: async (period: 'month' | 'year', year: number, month?: number) => {
    let startDate: string;
    let endDate: string;
    if (period === 'month') {
      const m = month ?? new Date().getMonth() + 1;
      const paddedM = String(m).padStart(2, '0');
      // Get the last day of the month correctly
      const lastDay = new Date(year, m, 0).getDate();
      startDate = `${year}-${paddedM}-01`;
      endDate = `${year}-${paddedM}-${String(lastDay).padStart(2, '0')}`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }
    const { data, error } = await supabase
      .from('absensi')
      .select('*, santri(name, nis, class_name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getTahfidzRecap: async (period: 'month' | 'year', year: number, month?: number) => {
    let startTs: string;
    let endTs: string;
    if (period === 'month') {
      const m = month ?? new Date().getMonth() + 1;
      const paddedM = String(m).padStart(2, '0');
      const lastDay = new Date(year, m, 0).getDate();
      startTs = `${year}-${paddedM}-01T00:00:00`;
      endTs = `${year}-${paddedM}-${String(lastDay).padStart(2, '0')}T23:59:59`;
    } else {
      startTs = `${year}-01-01T00:00:00`;
      endTs = `${year}-12-31T23:59:59`;
    }
    const { data, error } = await supabase
      .from('tahfidz')
      .select('*, santri(name, nis, class_name)')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Profiles (User Management)
  getProfiles: () => handleResponse(supabase.from('profiles').select('*')),
  getWaliList: () => handleResponse(supabase.from('profiles').select('*').eq('role', 'wali').eq('is_approved', true).order('full_name')),
  updateProfile: (id: string, data: any) => handleResponse(supabase.from('profiles').update(data).eq('id', id)),
  deleteUser: (id: string) => handleResponse(supabase.rpc('delete_user', { user_id: id })),
  
  // Keuangan
  getTransactions: (santriId?: string) => {
    let query = supabase.from('transactions').select('*, santri(name)');
    if (santriId) query = query.eq('santri_id', santriId);
    return handleResponse(query.order('date', { ascending: false }));
  },
  createTransaction: (data: any) => handleResponse(supabase.from('transactions').insert(data)),
  updateTransaction: (id: string, data: any) => handleResponse(supabase.from('transactions').update(data).eq('id', id)),
  deleteTransaction: (id: string) => handleResponse(supabase.from('transactions').delete().eq('id', id)),

  // Nilai & Kurikulum
  getKurikulum: () => handleResponse(supabase.from('kurikulum').select('*').order('subject')),
  createKurikulum: (data: any) => handleResponse(supabase.from('kurikulum').insert(data)),
  updateKurikulum: (id: string, data: any) => handleResponse(supabase.from('kurikulum').update(data).eq('id', id)),
  deleteKurikulum: (id: string) => handleResponse(supabase.from('kurikulum').delete().eq('id', id)),

  getNilai: (santriId: string) => handleResponse(
    supabase.from('nilai')
      .select('*, kurikulum(subject)')
      .eq('santri_id', santriId)
      .order('created_at', { ascending: false })
  ),
  createNilai: (data: any) => handleResponse(supabase.from('nilai').insert(data)),
  updateNilai: (id: string, data: any) => handleResponse(supabase.from('nilai').update(data).eq('id', id)),
  deleteNilai: (id: string) => handleResponse(supabase.from('nilai').delete().eq('id', id)),

  // Agenda
  normalizeAgenda: (items: any[]) => (items || []).map((item: any) => ({
    ...item,
    date: typeof item.date === 'string' ? item.date.split('T')[0] : String(item.date || '')
  })),
  getAgenda: () => handleResponse(
    supabase.from('agenda').select('*').order('date', { ascending: true })
  ).then(data => dataService.normalizeAgenda(data)),
  createAgenda: (data: any) => handleResponse(supabase.from('agenda').insert(data)),
  updateAgenda: (id: string, data: any) => handleResponse(supabase.from('agenda').update(data).eq('id', id)),
  deleteAgenda: (id: string) => handleResponse(supabase.from('agenda').delete().eq('id', id)),

  // Hero Slides (beranda)
  getHeroSlides: (activeOnly = true) => {
    let query = supabase.from('hero_slides').select('*').order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    return handleResponse(query);
  },
  createHeroSlide: (data: any) => handleResponse(supabase.from('hero_slides').insert(data).select().single()),
  updateHeroSlide: (id: string, data: any) => handleResponse(supabase.from('hero_slides').update(data).eq('id', id).select().single()),
  deleteHeroSlide: (id: string) => handleResponse(supabase.from('hero_slides').delete().eq('id', id)),

  // Galeri
  getGaleriItems: (activeOnly = true) => {
    let query = supabase.from('galeri_items').select('*').order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    return handleResponse(query);
  },
  createGaleriItem: (data: any) => handleResponse(supabase.from('galeri_items').insert(data).select().single()),
  updateGaleriItem: (id: string, data: any) => handleResponse(supabase.from('galeri_items').update(data).eq('id', id).select().single()),
  deleteGaleriItem: (id: string) => handleResponse(supabase.from('galeri_items').delete().eq('id', id)),

  uploadKontenMedia: async (file: File, folder: 'hero' | 'galeri') => {
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(isVideo ? 'Video maksimal 50 MB' : 'Foto maksimal 5 MB');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from('konten').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (!error) {
      const { data } = supabase.storage.from('konten').getPublicUrl(path);
      return data.publicUrl;
    }

    if (!isVideo && file.size <= 2 * 1024 * 1024) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsDataURL(file);
      });
    }

    throw error;
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    let santriCount = 0;
    let userCount = 0;
    let recentTahfidz: any[] = [];
    let pendingTransactions = 0;
    let upcomingAgenda: any[] = [];

    try {
      const { count } = await supabase.from('santri').select('*', { count: 'exact', head: true });
      santriCount = count || 0;
    } catch (err) { console.warn('Dashboard: santri count failed', err); }

    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      userCount = count || 0;
    } catch (err) { console.warn('Dashboard: profiles count failed', err); }

    try {
      const { data } = await supabase.from('tahfidz').select('*, santri(name)').limit(5).order('created_at', { ascending: false });
      recentTahfidz = data || [];
    } catch (err) { console.warn('Dashboard: tahfidz fetch failed', err); }

    try {
      const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      pendingTransactions = count || 0;
    } catch (err) { console.warn('Dashboard: transactions count failed', err); }

    try {
      const { data } = await supabase.from('agenda').select('*').gte('date', new Date().toISOString().split('T')[0]).limit(3).order('date');
      upcomingAgenda = dataService.normalizeAgenda(data);
    } catch (err) { console.warn('Dashboard: agenda fetch failed', err); }

    return {
      santriCount,
      userCount,
      recentTahfidz,
      pendingTransactions,
      upcomingAgenda
    };
  }
};
