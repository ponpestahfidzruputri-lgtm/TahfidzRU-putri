import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { Search, Save, Check, Info, Loader2, Clock, Sun, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { ABSENSI_SESSIONS, DEFAULT_ABSENSI_SESSION, type AbsensiSession } from '../../constants/absensi';
import { CAMPUS_ABSENSI_SESSION_LABEL } from '../../constants/campus';

export default function AbsensiManagement() {
  const [santri, setSantri] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [savedAbsensi, setSavedAbsensi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSession, setSelectedSession] = useState<AbsensiSession>(DEFAULT_ABSENSI_SESSION);
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentDates, setRecentDates] = useState<any[]>([]);
  const { toast, showToast } = useToast();

  const effectiveSession = ABSENSI_SESSIONS.includes(selectedSession) ? selectedSession : 'Shubuh';

  useEffect(() => { fetchData(); }, [date, effectiveSession]);
  useEffect(() => { fetchRecentDates(); }, [date, effectiveSession, santri.length]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [santriData, absensiData] = await Promise.all([
        dataService.getSantriList(), dataService.getAbsensiList(date, effectiveSession)
      ]);
      setSantri(santriData);
      const initial: Record<string, string> = {};
      absensiData.forEach((a: any) => { initial[a.santri_id] = a.status; });
      setAbsensi(initial);
      setSavedAbsensi({ ...initial });
    } catch { showToast('Gagal memuat data absensi', 'error'); }
    finally { setLoading(false); }
  };

  const fetchRecentDates = async () => {
    try {
      const data = await dataService.getAbsensiList(undefined, effectiveSession);
      const uniqueDates = Array.from(new Set(data.map((a: any) => a.date))).sort().reverse().slice(0, 5);
      const sessionHistory = (uniqueDates as string[]).map(d => {
        const dayData = data.filter((a: any) => a.date === d && (a.session || 'Shubuh') === effectiveSession);
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
        santri_id, status, date, session: effectiveSession,
      }));
      await dataService.saveAbsensi(dataToSave);
      showToast(isUpdating ? 'Data presensi berhasil diperbarui!' : 'Absensi berhasil disimpan!', 'success');
      fetchData();
    } catch { showToast('Gagal menyimpan absensi', 'error'); }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Presensi Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Presensi per sesi: {CAMPUS_ABSENSI_SESSION_LABEL} setiap hari</p>
        </div>
        <div className="flex gap-2">
          <button onClick={setAllToHadir} className="btn-secondary">
            <Check size={15} /> Hadir Semua
          </button>
          <button onClick={handleSave} disabled={saving || !isDataDirty()}
            className={cn("btn-primary", Object.keys(savedAbsensi).length > 0 ? "!bg-amber-500 hover:!bg-amber-600" : "")}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Menyimpan...' : Object.keys(savedAbsensi).length > 0 ? 'Perbarui Presensi' : 'Simpan Presensi'}
          </button>
        </div>
      </div>

      {/* Sesi sholat */}
      <div className="card p-2 flex flex-wrap gap-2">
        {ABSENSI_SESSIONS.map((sesi) => (
          <button
            key={sesi}
            type="button"
            onClick={() => setSelectedSession(sesi)}
            className={cn(
              'flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border',
              effectiveSession === sesi
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
            )}
          >
            <Sun size={14} className="inline mr-1.5 -mt-0.5" />
            {sesi}
          </button>
        ))}
      </div>

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

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="card p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Data absensi untuk tanggal ini sudah ada.</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Sesi <strong>{effectiveSession}</strong> tanggal{' '}
                <strong>{format(new Date(date + 'T00:00:00'), 'dd MMMM yyyy', { locale: id })}</strong> akan ditimpa.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary text-xs px-3 py-1.5">Batal</button>
              <button onClick={handleSave} className="bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">Perbarui</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-5">
        {/* Sidebar Riwayat */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              <Clock size={13} className="text-[#1e3a5f]" /> Riwayat Terkini
            </h3>
            <div className="space-y-2">
              {recentDates.map((rd, i) => (
                <button key={i} onClick={() => setDate(rd.date)}
                  className={cn("w-full p-3 rounded-xl border text-left transition-all",
                    date === rd.date ? "bg-[#1e3a5f]/5 border-[#1e3a5f]/20" : "bg-slate-50 border-slate-100 hover:border-slate-200")}>
                  <p className={cn("text-xs font-semibold", date === rd.date ? "text-[#1e3a5f]" : "text-slate-600")}>
                    {format(new Date(rd.date + 'T00:00:00'), 'EEE, dd MMM', { locale: id })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{rd.filled}/{rd.total} terisi</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1e3a5f] p-4 rounded-2xl text-white">
            <h4 className="text-sm font-bold mb-1">Panduan Presensi</h4>
            <p className="text-slate-100/80 text-xs leading-relaxed">
              Isi presensi {CAMPUS_ABSENSI_SESSION_LABEL} secara terpisah setiap hari agar wali santri dapat memantau kehadiran lengkap.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter */}
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="form-label">Tanggal</label>
                <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Kelas / Rombel</label>
                <select className="input-field appearance-none" value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}>
                  {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'Semua Kelas' : c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Cari Santri</label>
                <input type="text" className="input-field" placeholder="Nama santri..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {stats.filled > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Data tersimpan — sesi {selectedSession} ({stats.filled} santri)
              </div>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Santri</th>
                    <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={2} className="px-5 py-10 text-center">
                      <Loader2 size={22} className="animate-spin text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Memuat data presensi...</p>
                    </td></tr>
                  ) : filteredSantri.map((s) => (
                    <tr key={s.id} className={cn("transition-colors", absensi[s.id] ? "bg-white" : "bg-slate-50/30")}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors",
                            absensi[s.id] === 'Hadir' ? "bg-emerald-500 text-white" :
                            absensi[s.id] === 'Sakit' ? "bg-amber-500 text-white" :
                            absensi[s.id] === 'Izin' ? "bg-sky-500 text-white" :
                            absensi[s.id] === 'Alpa' ? "bg-red-500 text-white" :
                            "bg-slate-200 text-slate-500"
                          )}>
                            {absensi[s.id] === 'Hadir' ? <Check size={16} /> : s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">{s.nis}</span>
                              <span className="text-[10px] text-slate-400">{s.class_name}</span>
                              {absensi[s.id] && (
                                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded",
                                  absensi[s.id] === savedAbsensi[s.id]
                                    ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600 animate-pulse")}>
                                  {absensi[s.id] === savedAbsensi[s.id] ? 'Tersimpan' : 'Berubah'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 min-w-0">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          {statusOptions.map((st) => (
                            <label key={st.id} className="cursor-pointer w-full sm:w-auto">
                              <input type="radio" name={`absensi-${s.id}-${selectedSession}`} className="sr-only peer"
                                checked={absensi[s.id] === st.id}
                                onChange={() => setAbsensi(prev => ({ ...prev, [s.id]: st.id }))} />
                              <div className={cn(
                                "sm:min-w-[60px] px-2 py-2 flex flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all active:scale-95",
                                st.color)}>
                                {st.id}
                              </div>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
