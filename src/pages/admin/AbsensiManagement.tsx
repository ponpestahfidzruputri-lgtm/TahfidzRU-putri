import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { Search, Save, Check, Loader2, Clock, Sun, Users, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  ABSENSI_SESSIONS,
  SHOLAT_BERJAMAAH_SESSIONS,
  type AbsensiSession,
  type SholatBerjamaahSession,
} from '../../constants/absensi';
import { CAMPUS_ABSENSI_SESSION_LABEL } from '../../constants/campus';

export default function AbsensiManagement() {
  const { role } = useAuth();
  const isPengurus = role === 'pengurus';

  const [santri, setSantri] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [savedAbsensi, setSavedAbsensi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [absensiType, setAbsensiType] = useState<'berjamaah' | 'tahfidz'>('berjamaah');
  const [selectedBerjamaahSession, setSelectedBerjamaahSession] = useState<SholatBerjamaahSession>('Subuh');
  const [selectedTahfidzSession, setSelectedTahfidzSession] = useState<AbsensiSession>('Shubuh');

  const [selectedClass, setSelectedClass] = useState('All');

  useEffect(() => {
    if (isPengurus) {
      setAbsensiType('berjamaah');
    }
  }, [isPengurus]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentDates, setRecentDates] = useState<any[]>([]);
  const { toast, showToast } = useToast();

  const effectiveSession = absensiType === 'berjamaah' ? selectedBerjamaahSession : selectedTahfidzSession;

  useEffect(() => { fetchData(); }, [date, effectiveSession, absensiType]);
  useEffect(() => { fetchRecentDates(); }, [date, effectiveSession, santri.length, absensiType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [santriData, absensiData] = await Promise.all([
        dataService.getSantriList(),
        dataService.getAbsensiList(date, effectiveSession, absensiType)
      ]);
      setSantri(santriData);
      const initial: Record<string, string> = {};
      absensiData.forEach((a: any) => { initial[a.santri_id] = a.status; });
      setAbsensi(initial);
      setSavedAbsensi({ ...initial });
    } catch { showToast('Gagal memuat data presensi', 'error'); }
    finally { setLoading(false); }
  };

  const fetchRecentDates = async () => {
    try {
      const data = await dataService.getAbsensiList(undefined, effectiveSession, absensiType);
      const uniqueDates = Array.from(new Set(data.map((a: any) => a.date))).sort().reverse().slice(0, 5);
      const sessionHistory = (uniqueDates as string[]).map(d => {
        const dayData = data.filter((a: any) => a.date === d && (a.session || 'Subuh') === effectiveSession);
        const relevantTotal = santri.length;
        return { date: d, filled: dayData.length, total: relevantTotal || dayData.length };
      });
      const filledNow = Object.keys(absensi).length;
      if (!uniqueDates.includes(date)) {
        sessionHistory.unshift({ date, filled: filledNow, total: santri.length });
      }
      setRecentDates(sessionHistory.slice(0, 5));
    } catch (err) { console.error(err); }
  };

  const setAllToHadir = () => {
    const newAbsensi = { ...absensi };
    filteredSantri.forEach(s => { newAbsensi[s.id] = 'Hadir'; });
    setAbsensi(newAbsensi);
    showToast(`${filteredSantri.length} santri ditandai Hadir`, 'success');
  };

  const handleSave = async () => {
    const isUpdating = Object.keys(savedAbsensi).length > 0;
    if (isUpdating && !showConfirm) { setShowConfirm(true); return; }
    setSaving(true); setShowConfirm(false);
    try {
      const dataToSave = Object.entries(absensi).map(([santri_id, status]) => ({
        santri_id, status, date, session: effectiveSession, type: absensiType,
      }));
      await dataService.saveAbsensi(dataToSave);
      showToast(isUpdating ? 'Data presensi berhasil diperbarui!' : 'Presensi berhasil disimpan!', 'success');
      fetchData();
    } catch { showToast('Gagal menyimpan presensi', 'error'); }
    finally { setSaving(false); }
  };

  const isDataDirty = () => JSON.stringify(absensi) !== JSON.stringify(savedAbsensi);

  const classes = ['All', ...new Set(santri.map(s => s.class_name).filter(Boolean))];
  const filteredSantri = santri.filter(s => {
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const stats = {
    hadir: Object.values(absensi).filter(v => v === 'Hadir').length,
    izin: Object.values(absensi).filter(v => v === 'Izin').length,
    sakit: Object.values(absensi).filter(v => v === 'Sakit').length,
    alpa: Object.values(absensi).filter(v => v === 'Alpa').length,
    total: santri.length,
    filled: Object.keys(absensi).length
  };

  const statusOptions = [
    { id: 'Hadir', char: 'H', color: 'peer-checked:bg-emerald-500 peer-checked:text-white text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'Izin', char: 'I', color: 'peer-checked:bg-sky-500 peer-checked:text-white text-sky-600 bg-sky-50 border-sky-100' },
    { id: 'Sakit', char: 'S', color: 'peer-checked:bg-amber-500 peer-checked:text-white text-amber-600 bg-amber-50 border-amber-100' },
    { id: 'Alpa', char: 'A', color: 'peer-checked:bg-red-500 peer-checked:text-white text-red-600 bg-red-50 border-red-100' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Presensi Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {absensiType === 'berjamaah'
              ? 'Pencatatan Kehadiran Sholat Berjamaah 5 Waktu di Masjid'
              : `Pencatatan Kehadiran Kegiatan Tahfidz (${CAMPUS_ABSENSI_SESSION_LABEL})`}
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <CalendarIcon size={16} className="text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button onClick={setAllToHadir} className="btn-secondary text-xs sm:text-sm">
            <Check size={15} /> Hadir Semua
          </button>

          <button onClick={handleSave} disabled={saving || !isDataDirty()}
            className={cn("btn-primary text-xs sm:text-sm", Object.keys(savedAbsensi).length > 0 ? "!bg-amber-500 hover:!bg-amber-600" : "")}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Menyimpan...' : Object.keys(savedAbsensi).length > 0 ? 'Perbarui Presensi' : 'Simpan Presensi'}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Sholat Berjamaah vs Tahfidz & Kegiatan */}
      {!isPengurus && (
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl max-w-md gap-1">
          <button
            type="button"
            onClick={() => { setAbsensiType('berjamaah'); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200',
              absensiType === 'berjamaah'
                ? 'bg-[#1e3a5f] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            )}
          >
            <span>🕌</span> Sholat Berjamaah
          </button>

          <button
            type="button"
            onClick={() => { setAbsensiType('tahfidz'); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200',
              absensiType === 'tahfidz'
                ? 'bg-[#1e3a5f] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            )}
          >
            <span>📖</span> Tahfidz & Kegiatan
          </button>
        </div>
      )}

      {/* Session selector */}
      {absensiType === 'berjamaah' ? (
        <div className="card p-2 flex flex-wrap gap-2">
          {SHOLAT_BERJAMAAH_SESSIONS.map((sesi) => {
            const isSelected = selectedBerjamaahSession === sesi;
            return (
              <button
                key={sesi}
                type="button"
                onClick={() => setSelectedBerjamaahSession(sesi)}
                className={cn(
                  'flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border text-center',
                  isSelected
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-white hover:border-slate-300'
                )}
              >
                {sesi}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card p-2 flex flex-wrap gap-2">
          {ABSENSI_SESSIONS.map((sesi) => (
            <button
              key={sesi}
              type="button"
              onClick={() => setSelectedTahfidzSession(sesi)}
              className={cn(
                'flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border',
                selectedTahfidzSession === sesi
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
              )}
            >
              <Sun size={14} className="inline mr-1.5 -mt-0.5" />
              Sesi {sesi}
            </button>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hadir', val: stats.hadir, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Sakit', val: stats.sakit, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Izin', val: stats.izin, cls: 'bg-sky-50 text-sky-700 border-sky-100' },
          { label: 'Alpa', val: stats.alpa, cls: 'bg-red-50 text-red-700 border-red-100' },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border p-3 text-center", s.cls)}>
            <p className="text-xl font-bold">{s.val}</p>
            <p className="text-[10px] font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] text-sm"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] text-sm bg-white"
          >
            <option value="All">Semua Kelas</option>
            {classes.slice(1).map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users size={16} />
            <span className="font-medium">{filteredSantri.length}</span>
            <span>santri</span>
          </div>
        </div>
      </div>

      {/* Santri List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
        </div>
      ) : filteredSantri.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p>Tidak ada santri yang ditemukan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSantri.map((santriItem) => (
            <div key={santriItem.id} className="card p-3 flex items-center gap-3 hover:border-slate-300 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{santriItem.name}</p>
                <p className="text-xs text-slate-500">NIS: {santriItem.nis} {santriItem.class_name ? `• ${santriItem.class_name}` : ''}</p>
              </div>
              <div className="flex gap-1.5">
                {statusOptions.map((opt) => (
                  <label key={opt.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`absensi-${santriItem.id}`}
                      value={opt.id}
                      checked={absensi[santriItem.id] === opt.id}
                      onChange={() => setAbsensi({ ...absensi, [santriItem.id]: opt.id })}
                      className="peer hidden"
                    />
                    <span className={cn(
                      "inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold transition-all",
                      opt.color
                    )}>
                      {opt.char}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Dates */}
      {recentDates.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Riwayat Presensi {effectiveSession} Terakhir</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {recentDates.map((rd: any) => (
              <div key={rd.date} className="text-center p-2 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">{format(new Date(rd.date), 'dd MMM', { locale: localeId })}</p>
                <p className="text-xs font-bold text-[#1e3a5f] mt-0.5">{rd.filled}/{rd.total}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
