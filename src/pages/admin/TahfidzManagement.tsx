import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { BookOpen, UserCircle, Plus, ChevronDown, CheckCircle2, History, Edit2, Trash2, Loader2, Info, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { motion } from 'motion/react';
import { ABSENSI_SESSIONS } from '../../constants/absensi';

const SETORAN_LEVELS = [
  { value: 'binnadzhor', label: 'Bin Nadzhor' },
  { value: 'bilghoib', label: 'Bil Ghoib' },
];

const SURAH_LIST = [
  "Al-Fatihah","Al-Baqarah","Ali 'Imran","An-Nisa'","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus",
  "Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra'","Al-Kahf","Maryam","Taha",
  "Al-Anbiya'","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Asy-Syu'ara'","An-Naml","Al-Qasas","Al-'Ankabut","Ar-Rum",
  "Luqman","As-Sajdah","Al-Ahzab","Saba'","Fatir","Ya-Sin","Ash-Shaffat","Sad","Az-Zumar","Ghafir",
  "Fussilat","Asy-Syura","Az-Zukhruf","Ad-Dukhan","Al-Jasiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf",
  "Adz-Dzariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hasyr","Al-Mumtahanah",
  "As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij",
  "Nuh","Al-Jinn","Al-Muzzammil","Al-Muddassir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba'","An-Nazi'at","'Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad",
  "Ash-Shams","Al-Lail","Ad-Duha","Ash-Sharh","At-Tin","Al-'Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-'Adiyat",
  "Al-Qari'ah","At-Takathur","Al-'Asr","Al-Humazah","Al-Fil","Quraish","Al-Ma'un","Al-Kauthar","Al-Kafirun","An-Nasr",
  "Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];

export default function TahfidzManagement() {
  const [santri, setSantri] = useState<any[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);

  const [formData, setFormData] = useState({
    session: '',
    setoran_level: 'binnadzhor',
    surah: '', from_ayat: '', to_ayat: '',
    type: 'Setoran Baru', fluency: 'Lancar', note: '',
    setoran_mode: 'per_halaman',
    juz_from: '', juz_to: '', materi: ''
  });

  const currentSantriObj = santri.find(s => s.id === selectedSantri);
  const isShubuhSession = formData.session === 'Shubuh';
  const isYanbuaShubuh = isShubuhSession && (currentSantriObj?.tahfidz_level === 'yanbua' || !currentSantriObj?.tahfidz_level);
  const shubuhLevelLabel = currentSantriObj?.tahfidz_level === 'bilghoib'
    ? 'Bil Ghoib'
    : currentSantriObj?.tahfidz_level === 'binnadzhor'
      ? 'Bin Nadzhor'
      : "Yanbu'a";

  useEffect(() => { fetchSantri(); }, []);
  useEffect(() => {
    if (selectedSantri) {
      fetchLogs(selectedSantri);
      const sObj = santri.find(s => s.id === selectedSantri);
      if (sObj?.tahfidz_level) {
        setFormData(prev => ({ ...prev, setoran_level: sObj.tahfidz_level }));
      }
    } else {
      setLogs([]);
    }
  }, [selectedSantri, santri]);

  const fetchSantri = async () => {
    try {
      const data = await dataService.getSantriList();
      setSantri(data || []);
    } catch { showToast('Gagal memuat daftar santri', 'error'); }
    finally { setLoading(false); }
  };

  const fetchLogs = async (id: string) => {
    try { const data = await dataService.getTahfidzLogs(id); setLogs(data); }
    catch { showToast('Gagal memuat riwayat hafalan', 'error'); }
  };

  const handleOpenEdit = (log: any) => {
    setEditingLog(log);
    let juzFrom = '', juzTo = '';
    if (log.setoran_mode === 'per_juz' && log.surah?.includes(' - ')) {
      const parts = log.surah.split(' - ');
      juzFrom = parts[0].replace('Juz ', '');
      juzTo = parts[1].replace('Juz ', '');
    }
    setFormData({
      session: log.session || 'Shubuh',
      setoran_level: log.setoran_level || 'binnadzhor',
      surah: log.surah,
      from_ayat: log.from_ayat,
      to_ayat: log.to_ayat,
      type: log.type,
      fluency: log.fluency,
      note: log.note || '',
      setoran_mode: log.setoran_mode || 'per_halaman',
      juz_from: juzFrom,
      juz_to: juzTo,
      materi: log.surah?.startsWith('Jilid') ? (log.note || '') : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus riwayat hafalan ini?')) return;
    try { await dataService.deleteTahfidz(id); showToast('Riwayat berhasil dihapus', 'success'); if (selectedSantri) fetchLogs(selectedSantri); }
    catch { showToast('Gagal menghapus riwayat', 'error'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return showToast('Pilih santri terlebih dahulu', 'error');
    setSubmitting(true);
    try {
      let payload: any;
      const session = formData.session;
      const isYanbuaShubuh = session === 'Shubuh' && (currentSantriObj?.tahfidz_level === 'yanbua' || !currentSantriObj?.tahfidz_level);
      if (isYanbuaShubuh) {
        payload = {
          session,
          setoran_level: currentSantriObj?.tahfidz_level || 'yanbua',
          surah: formData.surah,
          from_ayat: 0,
          to_ayat: 0,
          type: formData.type,
          fluency: formData.fluency,
          note: formData.materi,
          setoran_mode: 'per_halaman',
          santri_id: selectedSantri,
        };
      } else {
        payload = {
          session,
          setoran_level: formData.setoran_level,
          surah: formData.setoran_mode === 'per_juz'
            ? `Juz ${formData.juz_from} - Juz ${formData.juz_to}`
            : formData.surah,
          from_ayat: Number(formData.from_ayat),
          to_ayat: Number(formData.to_ayat),
          type: formData.type,
          fluency: formData.fluency,
          note: formData.note,
          setoran_mode: formData.setoran_mode,
          santri_id: selectedSantri,
        };
      }
      if (editingLog) {
        await dataService.updateTahfidz(editingLog.id, payload);
        showToast('Riwayat diperbarui', 'success');
        setIsModalOpen(false);
      } else {
        await dataService.createTahfidz(payload);
        showToast('Setoran berhasil disimpan!', 'success');
      }
      fetchLogs(selectedSantri);
      if (!editingLog) {
        setFormData({
          session: formData.session || 'Shubuh',
          setoran_level: currentSantriObj?.tahfidz_level || 'yanbua',
          surah: '',
          from_ayat: '',
          to_ayat: '',
          type: 'Setoran Baru',
          fluency: 'Lancar',
          note: '',
          setoran_mode: 'per_halaman',
          juz_from: '',
          juz_to: '',
          materi: ''
        });
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal menyimpan setoran', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fluencyColor = (f: string) =>
    f === 'Lancar' ? 'bg-emerald-50 text-emerald-700' : f === 'Cukup' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  const fluencyBorder = (f: string) =>
    f === 'Lancar' ? 'bg-emerald-500' : f === 'Cukup' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-header">Manajemen Tahfidz</h1>
        <p className="text-sm text-slate-500 mt-0.5">Catat dan pantau perkembangan hafalan Al-Qur'an santri</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Form Input */}
        <div className="lg:col-span-2">
          <div className="card p-5 space-y-4 sticky top-20">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Plus size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Input Setoran Baru</h3>
                <p className="text-[10px] text-slate-400">Data tersinkron ke Portal Wali</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="form-label">Pilih Sesi Setoran</label>
                <div className="flex flex-wrap gap-2">
                  {ABSENSI_SESSIONS.map((session) => (
                    <button
                      key={session}
                      type="button"
                      onClick={() => setFormData({ ...formData, session, surah: '', from_ayat: '', to_ayat: '', juz_from: '', juz_to: '', materi: '' })}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                        formData.session === session
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {session}
                    </button>
                  ))}
                </div>
              </div>
              {formData.session ? (
                <>
                  <div>
                    <label className="form-label">Pilih Santri</label>
                    <div className="relative">
                      <select className="input-field appearance-none pr-9 cursor-pointer" value={selectedSantri}
                        onChange={(e) => setSelectedSantri(e.target.value)}>
                        <option value="">-- Pilih Santri --</option>
                        {santri.map((s) => (
                          <option key={s.id} value={s.id}>
                            {(s.name || 'Santri tanpa nama')} ({s.nis || '-'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {selectedSantri ? (
                    <>
                      <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-xl p-4 mb-3">
                        <div className="mb-2">
                          <h4 className="font-semibold text-slate-800 text-sm">{currentSantriObj?.name}</h4>
                          <p className="text-xs text-slate-500">NIS: {currentSantriObj?.nis}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">Level Tahfidz:</span>
                          <span className="font-semibold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2 py-0.5 rounded">
                            {shubuhLevelLabel}
                          </span>
                        </div>
                      </div>

                      {!isYanbuaShubuh ? (
                        <>
                          <div>
                            <label className="form-label">Jenis Setoran</label>
                            <div className="relative">
                              <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.setoran_level}
                                onChange={(e) => setFormData({ ...formData, setoran_level: e.target.value })}>
                                {SETORAN_LEVELS.map((item) => (
                                  <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="form-label">Skema Setoran</label>
                            <div className="relative">
                              <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.setoran_mode}
                                onChange={(e) => setFormData({ ...formData, setoran_mode: e.target.value, surah: '', juz_from: '', juz_to: '', from_ayat: '', to_ayat: '' })}>
                                <option value="per_halaman">Per Halaman</option>
                                <option value="per_juz">Per Juz</option>
                              </select>
                              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          {formData.setoran_mode === 'per_halaman' ? (
                            <>
                              <div>
                                <label className="form-label">Pilih Juz</label>
                                <div className="relative">
                                  <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.surah}
                                    onChange={(e) => setFormData({ ...formData, surah: e.target.value })} required>
                                    <option value="">-- Pilih Juz --</option>
                                    {Array.from({ length: 30 }, (_, i) => `Juz ${i + 1}`).map((j) => (
                                      <option key={j} value={j}>{j}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="form-label">Dari Halaman</label>
                                  <input type="number" className="input-field" value={formData.from_ayat}
                                    onChange={(e) => setFormData({ ...formData, from_ayat: e.target.value })} required min="1" />
                                </div>
                                <div>
                                  <label className="form-label">Sampai Halaman</label>
                                  <input type="number" className="input-field" value={formData.to_ayat}
                                    onChange={(e) => setFormData({ ...formData, to_ayat: e.target.value })} required min="1" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="form-label">Dari Juz</label>
                                  <div className="relative">
                                    <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.juz_from}
                                      onChange={(e) => setFormData({ ...formData, juz_from: e.target.value })} required>
                                      <option value="">-- Pilih --</option>
                                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                                        <option key={j} value={String(j)}>Juz {j}</option>
                                      ))}
                                    </select>
                                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Sampai Juz</label>
                                  <div className="relative">
                                    <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.juz_to}
                                      onChange={(e) => setFormData({ ...formData, juz_to: e.target.value })} required>
                                      <option value="">-- Pilih --</option>
                                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                                        <option key={j} value={String(j)}>Juz {j}</option>
                                      ))}
                                    </select>
                                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="form-label">Dari Halaman</label>
                                  <input type="number" className="input-field" value={formData.from_ayat}
                                    onChange={(e) => setFormData({ ...formData, from_ayat: e.target.value })} required min="1" />
                                </div>
                                <div>
                                  <label className="form-label">Sampai Halaman</label>
                                  <input type="number" className="input-field" value={formData.to_ayat}
                                    onChange={(e) => setFormData({ ...formData, to_ayat: e.target.value })} required min="1" />
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="form-label">Pilih Jilid ({shubuhLevelLabel})</label>
                            <div className="relative">
                              <select className="input-field appearance-none pr-9 cursor-pointer" value={formData.surah}
                                onChange={(e) => setFormData({ ...formData, surah: e.target.value })} required>
                                <option value="">-- Pilih Jilid --</option>
                                {Array.from({ length: 7 }, (_, i) => `Jilid ${i + 1}`).map((j) => (
                                  <option key={j} value={j}>{j}</option>
                                ))}
                              </select>
                              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="form-label">Materi Hafalan</label>
                            <input type="text" className="input-field" placeholder="Contoh: Halaman 5 baris ke-3, Surat Al-Fatihah dst..."
                              value={formData.materi} onChange={(e) => setFormData({ ...formData, materi: e.target.value })} required />
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium">
                      Pilih santri terlebih dahulu untuk menampilkan formulir setoran.
                    </div>
                  )}
                </>
              ) : (
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium">
                  Pilih sesi terlebih dahulu untuk menampilkan formulir setoran.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Jenis Setoran</label>
                  <select className="input-field appearance-none" value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Setoran Baru">Setoran Baru</option>
                    <option value="Murojaah">Murojaah</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Kelancaran</label>
                  <select className="input-field appearance-none" value={formData.fluency}
                    onChange={(e) => setFormData({ ...formData, fluency: e.target.value })}>
                    <option value="Lancar">Lancar</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Kurang">Kurang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Catatan Pembimbing</label>
                <textarea className="input-field" rows={2} placeholder="Tuliskan catatan atau saran..."
                  value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <BookOpen size={15} />}
                {submitting ? 'Menyimpan...' : 'Simpan Setoran'}
              </button>
            </form>
          </div>
        </div>

        {/* Riwayat */}
        <div className="lg:col-span-3 card overflow-hidden flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              <h3 className="section-title">Riwayat Hafalan</h3>
            </div>
            {logs.length > 0 && (
              <span className="badge-blue">{logs.length} catatan</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedSantri ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                <UserCircle size={44} className="mb-2 opacity-30" />
                <p className="text-sm text-slate-400">Pilih santri untuk melihat riwayat hafalan</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <BookOpen size={36} className="text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Belum ada riwayat hafalan untuk santri ini.</p>
              </div>
            ) : logs.map((log) => (
              <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="relative flex items-start gap-3 p-4 bg-slate-50/60 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-white transition-all group">
                {/* Colored indicator */}
                <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", fluencyBorder(log.fluency))} />
                <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ml-1", fluencyColor(log.fluency))}>
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.surah}</p>
                      <p className="text-xs text-slate-500">
                        {log.surah?.startsWith('Jilid')
                          ? (log.note ? `Materi: ${log.note}` : 'Yanbu\'a')
                          : log.surah?.startsWith('Juz')
                          ? `Halaman ${log.from_ayat}–${log.to_ayat}`
                          : `Ayat ${log.from_ayat}–${log.to_ayat}`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1e3a5f] hover:bg-blue-50 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(log.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      log.type === 'Setoran Baru' ? 'bg-blue-50 text-blue-600' : 'bg-sky-50 text-sky-600')}>
                      {log.type}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", fluencyColor(log.fluency))}>
                      {log.fluency}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(log.created_at), 'dd MMM yyyy', { locale: id })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.session || 'Shubuh'}
                    </span>
                    {log.session !== 'Shubuh' && log.setoran_level && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.setoran_level === 'bilghoib' ? 'Bil Ghoib' : 'Bin Nadzhor'}
                      </span>
                    )}
                    {!log.surah?.startsWith('Jilid') && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(log.setoran_mode === 'per_juz' ? 'Per Juz' : 'Per Halaman')}
                      </span>
                    )}
                  </div>
                  {log.surah?.startsWith('Jilid') ? null : (log.note && <p className="text-xs text-slate-500 mt-1.5 italic">"{log.note}"</p>)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingLog(null); }} title="Edit Riwayat Hafalan">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Surah</label>
            <input type="text" required className="input-field" value={formData.surah}
              onChange={(e) => setFormData({ ...formData, surah: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Dari Ayat</label>
              <input type="number" required className="input-field" value={formData.from_ayat}
                onChange={(e) => setFormData({ ...formData, from_ayat: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Sampai Ayat</label>
              <input type="number" required className="input-field" value={formData.to_ayat}
                onChange={(e) => setFormData({ ...formData, to_ayat: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Jenis</label>
              <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Setoran Baru">Setoran Baru</option>
                <option value="Murojaah">Murojaah</option>
              </select>
            </div>
            <div>
              <label className="form-label">Kelancaran</label>
              <select className="input-field" value={formData.fluency} onChange={(e) => setFormData({ ...formData, fluency: e.target.value })}>
                <option value="Lancar">Lancar</option>
                <option value="Cukup">Cukup</option>
                <option value="Kurang">Kurang</option>
              </select>
            </div>
            <div>
              <label className="form-label">Skema Setoran</label>
              <select className="input-field" value={formData.setoran_mode} onChange={(e) => setFormData({ ...formData, setoran_mode: e.target.value })}>
                <option value="per_halaman">Per Halaman</option>
                <option value="per_juz">Per Juz</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Catatan</label>
            <textarea className="input-field" rows={2} value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingLog(null); }} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
