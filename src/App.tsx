import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Database, ExternalLink } from 'lucide-react';
import { prefetchSantriData, initPrefetchDeps } from './pages/admin/SantriManagement';
import { supabase } from './lib/supabase';
import { dataService } from './services/data';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { PengajarLayout } from './layouts/PengajarLayout';
import { WaliLayout } from './layouts/WaliLayout';
import { PengurusLayout } from './layouts/PengurusLayout';

// Direct Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FiturPage from './pages/FiturPage';
import TentangPage from './pages/TentangPage';
import AgendaPage from './pages/AgendaPage';
import GaleriPage from './pages/GaleriPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import SantriManagement from './pages/admin/SantriManagement';
import AbsensiManagement from './pages/admin/AbsensiManagement';
import AbsensiRecap from './pages/admin/AbsensiRecap';
import LaporanTerpadu from './pages/admin/LaporanTerpadu';
import TahfidzManagement from './pages/admin/TahfidzManagement';
import TahfidzRecap from './pages/admin/TahfidzRecap';
import NilaiManagement from './pages/admin/NilaiManagement';
import AgendaManagement from './pages/admin/AgendaManagement';
import KontenManagement from './pages/admin/KontenManagement';
import UserApproval from './pages/admin/UserApproval';
import TahfidzDiploma from './pages/admin/TahfidzDiploma';
import UangJajanManagement from './pages/admin/UangJajanManagement';

// Pengurus Pages
import PengurusDashboard from './pages/pengurus/PengurusDashboard';

// Pengajar Pages
import PengajarDashboard from './pages/pengajar/PengajarDashboard';
import AbsensiPengajar from './pages/pengajar/AbsensiPengajar';
import TahfidzPengajar from './pages/pengajar/TahfidzPengajar';
import AgendaPengajar from './pages/pengajar/AgendaPengajar';
import NaikkanTingkat from './pages/pengajar/NaikkanTingkat';

// Wali Pages
import WaliDashboard from './pages/wali/WaliDashboard';
import ProfilSantri from './pages/wali/ProfilSantri';
import AgendaWali from './pages/wali/AgendaWali';
import HafalanWali from './pages/wali/HafalanWali';
import AbsensiWali from './pages/wali/AbsensiWali';
import IjazahWali from './pages/wali/IjazahWali';
import UangJajanWali from './pages/wali/UangJajanWali';

const SetupRequired = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
    <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Database size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Konfigurasi Diperlukan</h1>
      <p className="text-slate-500 mb-8">Hubungkan aplikasi ini dengan project Supabase Anda untuk mulai menggunakan fitur manajemen pesantren.</p>
      <div className="space-y-4 text-left bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
          <p className="text-sm font-medium text-slate-700">Buka <span className="font-bold">Settings &gt; Secrets</span> di panel AI Studio.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
          <p className="text-sm font-medium text-slate-700">Tambahkan <span className="font-mono bg-white px-1 border rounded text-xs select-all">VITE_SUPABASE_URL</span></p>
        </div>
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
          <p className="text-sm font-medium text-slate-700">Tambahkan <span className="font-mono bg-white px-1 border rounded text-xs select-all">VITE_SUPABASE_ANON_KEY</span></p>
        </div>
      </div>
      <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-slate-900 font-bold hover:underline">
        Buka Dashboard Supabase <ExternalLink size={16} className="ml-1" />
      </a>
    </div>
  </div>
);

function AppContent() {
  const { isConfigured, user, profile } = useAuth();
  const [prefetching, setPrefetching] = useState(false);

  // Ambil alih splash screen dari HTML: fade-out lalu hapus dari DOM
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;

    const elapsed = performance.now();
    const MIN_DISPLAY = 1500;
    const wait = Math.max(0, MIN_DISPLAY - elapsed);

    const timer = setTimeout(() => {
      splash.style.opacity = '0';
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
      // Fallback remove kalau transitionend gak fire
      setTimeout(() => splash.remove(), 600);
    }, wait);

    return () => clearTimeout(timer);
  }, []);

  // Prefetch data santri di background saat admin login
  useEffect(() => {
    if (profile?.role === 'admin' && user) {
      initPrefetchDeps(supabase, dataService);
      setPrefetching(true);
      prefetchSantriData().finally(() => setPrefetching(false));
    }
  }, [user, profile]);

  if (!isConfigured) {
    return <SetupRequired />;
  }

  return (
    <>
      {/* Badge prefetch di pojok kiri bawah */}
      {prefetching && (
        <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-full px-3.5 py-2 text-xs text-slate-500 animate-pulse pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          Mempersiapkan data...
        </div>
      )}
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fitur" element={<FiturPage />} />
        <Route path="/tentang" element={<TentangPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/galeri" element={<GaleriPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="santri" element={<SantriManagement />} />
            <Route path="absensi" element={<AbsensiManagement />} />
            <Route path="absensi-rekap" element={<AbsensiRecap />} />
            <Route path="rekap-laporan" element={<LaporanTerpadu />} />
            <Route path="tahfidz" element={<TahfidzManagement />} />
            <Route path="tahfidz-rekap" element={<TahfidzRecap />} />
            <Route path="nilai" element={<NilaiManagement />} />
            <Route path="agenda" element={<AgendaManagement />} />
            <Route path="konten" element={<KontenManagement />} />
            <Route path="uang-jajan" element={<UangJajanManagement />} />
            <Route path="ijazah/:id" element={<TahfidzDiploma />} />
            <Route path="approval" element={<UserApproval />} />
          </Route>
        </Route>

        {/* Pengurus Routes */}
        <Route element={<ProtectedRoute allowedRoles={['pengurus']} />}>
          <Route path="/pengurus" element={<PengurusLayout />}>
            <Route index element={<PengurusDashboard />} />
            <Route path="absensi" element={<AbsensiManagement />} />
            <Route path="uang-jajan" element={<UangJajanManagement />} />
          </Route>
        </Route>

        {/* Pengajar Routes */}
        <Route element={<ProtectedRoute allowedRoles={['pengajar']} />}>
          <Route path="/pengajar" element={<PengajarLayout />}>
            <Route index element={<PengajarDashboard />} />
            <Route path="absensi" element={<AbsensiPengajar />} />
            <Route path="tahfidz" element={<TahfidzPengajar />} />
            <Route path="naikkan-tingkat" element={<NaikkanTingkat />} />
            <Route path="agenda" element={<AgendaPengajar />} />
          </Route>
        </Route>

        {/* Wali Routes */}
        <Route element={<ProtectedRoute allowedRoles={['wali']} />}>
          <Route path="/wali" element={<WaliLayout />}>
            <Route index element={<WaliDashboard />} />
            <Route path="hafalan" element={<HafalanWali />} />
            <Route path="absensi" element={<AbsensiWali />} />
            <Route path="agenda" element={<AgendaWali />} />
            <Route path="uang-jajan" element={<UangJajanWali />} />
            <Route path="profil" element={<ProfilSantri />} />
            <Route path="ijazah" element={<IjazahWali />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}