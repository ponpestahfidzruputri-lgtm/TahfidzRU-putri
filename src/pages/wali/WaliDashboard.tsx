import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/data';
import { Info, BookOpen, Clock, CheckCircle2, Award, ChevronDown, UserCircle, Calendar, MapPin, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatRupiah } from '../../utils/format';

export default function WaliDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [santri, setSantri] = useState<any[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  const [tahfidzStats, setTahfidzStats] = useState<any[]>([]);
  const [upcomingAgenda, setUpcomingAgenda] = useState<any[]>([]);
  const [saldo, setSaldo] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchSantri();
  }, [user?.id]);

  const fetchSantri = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('santri').select('*').eq('wali_id', user.id);
      if (error) throw error;
      setSantri(data || []);
      if (data && data.length > 0) {
        setSelectedSantri(data[0]);
        fetchProgres(data[0].id);
        fetchSaldo(data[0].id);
      }
      fetchUpcomingAgenda();
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchSaldo = async (id: string) => {
    try {
      const transactions = await dataService.getTransactions(id);
      const activeTransactions = transactions.filter((t: any) => t.status === 'Paid');
      const totalMasuk = activeTransactions
        .filter((t: any) => t.type === 'Uang Masuk')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalKeluar = activeTransactions
        .filter((t: any) => t.type === 'Uang Keluar')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      setSaldo(totalMasuk - totalKeluar);
    } catch (error) { console.error(error); }
  };

  const fetchProgres = async (id: string) => {
    try { const data = await dataService.getTahfidzLogs(id); setTahfidzStats(data); }
    catch (error) { console.error(error); }
  };

  const fetchUpcomingAgenda = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('agenda').select('*').gte('date', today).order('date', { ascending: true }).limit(3);
      const normalized = (data || []).map(item => ({
        ...item,
        date: typeof item.date === 'string' ? item.date : String(item.date || '')
      }));
      setUpcomingAgenda(normalized);
    } catch (error) { console.error(error); }
  };

  if (authLoading || loading) return <div className="flex h-96 items-center justify-center text-slate-400">Memuat data ananda...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Portal Wali Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pantau perkembangan akademik dan hafalan ananda tercinta</p>
        </div>
        {santri.length > 1 && (
          <div className="relative">
            <select className="input-field appearance-none pr-9 min-w-[200px]"
              onChange={(e) => {
                const s = santri.find(x => x.id === e.target.value);
                setSelectedSantri(s); fetchProgres(s.id); fetchSaldo(s.id);
              }}>
              {santri.map(s => (
                <option key={s.id} value={s.id}>
                  {(s.name || 'Santri tanpa nama')} ({s.nis || '-'})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {!selectedSantri ? (
        <div className="card p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Info className="text-slate-300" size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Data Santri Belum Terhubung</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Akun Anda belum dihubungkan dengan data santri. Silakan hubungi admin pesantren untuk proses verifikasi.
          </p>
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="card p-4 md:p-6 lg:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-5 lg:gap-6 bg-gradient-to-br from-[#1e3a5f] to-slate-900 text-white relative overflow-hidden">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 z-10 overflow-hidden">
              {selectedSantri.photo_url ? (
                <img src={selectedSantri.photo_url} alt={selectedSantri.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl md:text-3xl font-bold">{selectedSantri.name.charAt(0)}</span>
              )}
            </div>
            <div className="text-center md:text-left z-10 flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">{selectedSantri.name}</h2>
                <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm flex-shrink-0">
                  Kelas {selectedSantri.class_name}
                </span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm font-mono mb-4 md:mb-5">NIS: {selectedSantri.nis}</p>

              <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start">
                <button onClick={() => navigate('/wali/ijazah')}
                  className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center shadow-sm">
                  <Award size={15} className="mr-1.5" /> Lihat Ijazah
                </button>
                <button onClick={() => navigate(`/wali/profil`)}
                  className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-colors flex items-center backdrop-blur-sm">
                  Update Profil
                </button>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Murojaah Terakhir</p>
                <h3 className="text-lg font-bold text-slate-800 line-clamp-1">
                  {tahfidzStats.find(x => x.type === 'Murojaah')?.surah || 'Belum ada'}
                </h3>
              </div>
            </div>

            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Setoran Baru</p>
                <h3 className="text-lg font-bold text-slate-800 line-clamp-1">
                  {tahfidzStats.find(x => x.type === 'Setoran Baru')?.surah || 'Belum ada'}
                </h3>
              </div>
            </div>

            <div className="card p-5 flex items-start gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/wali/uang-jajan')}>
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Saldo Uang Jajan</p>
                <h3 className="text-lg font-bold text-slate-800">
                  {formatRupiah(saldo)}
                </h3>
              </div>
            </div>
          </div>

          {/* Hafalan Section */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Riwayat Hafalan Terbaru</h3>
                <p className="text-xs text-slate-500 mt-1">Catatan setoran yang diverifikasi oleh pengajar</p>
              </div>
              <Link to="/wali/hafalan" className="btn-secondary text-xs px-3 py-1.5 hidden sm:flex">
                Lihat Semua <Info size={13} className="ml-1" />
              </Link>
            </div>
            <div className="p-5">
              {tahfidzStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tahfidzStats.slice(0, 4).map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-colors">
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              item.type === 'Setoran Baru' ? "bg-emerald-50 text-emerald-500" : "bg-sky-50 text-sky-500")}>
                              <CheckCircle2 size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{item.surah}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-slate-500">
                                  {item.surah?.startsWith('Jilid') ? '' : `Halaman ${item.from_ayat}-${item.to_ayat}`}
                                </span>
                                {item.session && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                                    Sesi {item.session}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                             {format(new Date(item.created_at || '2026-01-01T00:00:00'), 'dd MMM yyyy', { locale: localeId })}
                          </span>
                       </div>
                       {item.note && (
                         <p className="text-xs text-slate-600 italic mt-2 border-l-2 border-slate-200 pl-2">"{item.note}"</p>
                       )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserCircle size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Belum ada riwayat hafalan</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-50 sm:hidden">
              <Link to="/wali/hafalan" className="btn-secondary w-full justify-center text-xs">
                Lihat Semua Riwayat
              </Link>
            </div>
          </div>

          {/* Agenda Section */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Agenda Mendatang</h3>
                <p className="text-xs text-slate-500 mt-1">Kegiatan dan acara pesantren</p>
              </div>
              <Link to="/wali/agenda" className="btn-secondary text-xs px-3 py-1.5 hidden sm:flex">
                Lihat Semua <Calendar size={13} className="ml-1" />
              </Link>
            </div>
            <div className="p-5">
              {(() => {
                const items = (upcomingAgenda || []).filter((item: any) => item.date);
                if (items.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Calendar size={36} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400 font-medium">Belum ada agenda mendatang</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {items.map((item: any) => {
                      const rawDate = typeof item.date === 'string' ? item.date.split('T')[0] : String(item.date);
                      const d = new Date(rawDate + 'T00:00:00');
                      if (isNaN(d.getTime())) return null;
                      return (
                        <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all min-w-0">
                          <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-xl flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-[9px] uppercase font-semibold opacity-80">
                              {format(d, 'MMM', { locale: localeId })}
                            </span>
                            <span className="text-base font-bold leading-none">
                              {format(d, 'dd')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-slate-500 font-medium flex items-center">
                                <Clock size={11} className="mr-1" />{item.time || 'Belum ditentukan'} WIB
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium flex items-center truncate">
                                <MapPin size={11} className="mr-1 flex-shrink-0" />{item.location || 'Lokasi belum ditentukan'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-3 border-t border-slate-50 sm:hidden">
              <Link to="/wali/agenda" className="btn-secondary w-full justify-center text-xs">
                Lihat Semua Agenda
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
