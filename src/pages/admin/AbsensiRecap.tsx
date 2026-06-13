import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { BarChart3, Loader2, Download } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  CAMPUS_ABSENSI_SESSIONS,
  CAMPUS_ABSENSI_SESSION_LABEL,
  CAMPUS_LABEL,
  createEmptySessionStats,
  type CampusAbsensiSession,
} from '../../constants/campus';

const SESSIONS = CAMPUS_ABSENSI_SESSIONS;
type TSession = CampusAbsensiSession;

export default function AbsensiRecap() {
  const [recapPeriod, setRecapPeriod] = useState<'month' | 'year'>('month');
  const [recapMonth, setRecapMonth] = useState(new Date().getMonth() + 1);
  const [recapYear, setRecapYear] = useState(new Date().getFullYear());
  const [recapData, setRecapData] = useState<any[]>([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('All');
  const { toast, showToast } = useToast();

  const fetchRecap = async () => {
    setRecapLoading(true);
    try {
      const data = await dataService.getAbsensiRecap(recapPeriod, recapYear, recapPeriod === 'month' ? recapMonth : undefined);
      setRecapData(data || []);
    } catch { showToast('Gagal memuat rekap. Periksa koneksi.', 'error'); }
    finally { setRecapLoading(false); }
  };

  useEffect(() => { fetchRecap(); }, []);

  const grouped: Record<string, { name: string; nis: string; class_name: string; sessions: Record<TSession, { hadir: number; izin: number; sakit: number; alpa: number; total: number }> }> = {};
  recapData
    .forEach((r: any) => {
    const sid = r.santri_id;
    if (!grouped[sid]) {
      grouped[sid] = { name: r.santri?.name || '-', nis: r.santri?.nis || '-', class_name: r.santri?.class_name || '-',
        sessions: createEmptySessionStats() };
    }
    const sess = r.session as TSession;
    if (grouped[sid].sessions[sess]) {
      grouped[sid].sessions[sess].total++;
      if (r.status === 'Hadir') grouped[sid].sessions[sess].hadir++;
      else if (r.status === 'Izin') grouped[sid].sessions[sess].izin++;
      else if (r.status === 'Sakit') grouped[sid].sessions[sess].sakit++;
      else if (r.status === 'Alpa') grouped[sid].sessions[sess].alpa++;
    }
  });

  const allClasses = ['All', ...new Set(Object.values(grouped).map(s => s.class_name).filter(c => c && c !== '-'))];
  const rows = Object.values(grouped).filter(s => selectedClass === 'All' || s.class_name === selectedClass).sort((a, b) => a.name.localeCompare(b.name));
  const periodLabel = recapPeriod === 'month' ? `Bulan ${format(new Date(2000, recapMonth - 1, 1), 'MMMM', { locale: id })} ${recapYear}` : `Tahun ${recapYear}`;

  const exportToWord = () => {
    let rowsHtml = '';
    rows.forEach((s, idx) => {
      SESSIONS.forEach((sess, si) => {
        const st = s.sessions[sess];
        const pct = st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0;
        rowsHtml += `<tr>${si === 0 ? `<td rowspan="${SESSIONS.length}" style="border:1px solid #ddd;padding:6px;text-align:center;">${idx+1}</td><td rowspan="${SESSIONS.length}" style="border:1px solid #ddd;padding:6px;font-weight:bold;">${s.name} (${s.nis})</td><td rowspan="${SESSIONS.length}" style="border:1px solid #ddd;padding:6px;text-align:center;">${s.class_name}</td>` : ''}<td style="border:1px solid #ddd;padding:6px;text-align:center;">${sess}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.hadir}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.izin}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.sakit}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.alpa}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.total}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${pct}%</td></tr>`;
      });
    });
    const html = `<html><head><title>Rekap Presensi</title><style>body{font-family:Arial;font-size:12px;}table{border-collapse:collapse;width:100%;}th{border:1px solid #ddd;padding:8px;background:#f2f2f2;}</style></head><body><h2 style="text-align:center;">REKAP PRESENSI SANTRI</h2><h3 style="text-align:center;">PONDOK PESANTREN ROUDHLATUL ULUM</h3><p style="text-align:center;">${periodLabel}</p><table><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Sesi</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th><th>Total</th><th>%</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff'+html], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Rekap_Presensi_${periodLabel.replace(/\s+/g,'_')}.doc`; a.click();
    showToast('File Word berhasil diunduh', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Rekap Presensi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rekapitulasi kehadiran santri {CAMPUS_LABEL.toLowerCase()} per sesi — {CAMPUS_ABSENSI_SESSION_LABEL}</p>
        </div>
        {rows.length > 0 && <button onClick={exportToWord} className="btn-secondary self-start"><Download size={14} /> Export Word</button>}
      </div>

      <div className="card p-5 border-[#1e3a5f]/10">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Periode</label>
            <select className="input-field w-auto" value={recapPeriod} onChange={(e) => setRecapPeriod(e.target.value as 'month' | 'year')}>
              <option value="month">Per Bulan</option>
              <option value="year">Per Tahun</option>
            </select>
          </div>
          {recapPeriod === 'month' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bulan</label>
              <select className="input-field w-auto" value={recapMonth} onChange={(e) => setRecapMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{format(new Date(2000, i, 1), 'MMMM', { locale: id })}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tahun</label>
            <input type="number" className="input-field w-24" value={recapYear} onChange={(e) => setRecapYear(Number(e.target.value))} min="2000" max="2100" />
          </div>
          {allClasses.length > 1 && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kelas</label>
              <select className="input-field w-auto" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {allClasses.map(c => <option key={c} value={c}>{c === 'All' ? 'Semua Kelas' : c}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchRecap} disabled={recapLoading} className="btn-primary self-end">
            {recapLoading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
            {recapLoading ? 'Memuat...' : 'Tampilkan Rekap'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden border-[#1e3a5f]/10">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="section-title">Rekap Per Sesi</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{periodLabel} · {rows.length} Santri</p>
        </div>
        {recapLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 size={32} className="animate-spin text-[#1e3a5f] mb-3" />
            <p className="text-sm font-medium">Mengambil data dari server...</p>
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Santri</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">Kelas</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">Sesi</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-emerald-600 uppercase">Hadir</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-sky-600 uppercase">Izin</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase">Sakit</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-red-600 uppercase">Alpa</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">Total</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  SESSIONS.map((sess, si) => {
                    const st = s.sessions[sess];
                    const pct = st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0;
                    return (
                      <tr key={`${s.nis}-${sess}`} className={cn('hover:bg-slate-50/60', si === SESSIONS.length - 1 ? 'border-b-2 border-slate-200' : 'border-b border-slate-50')}>
                        {si === 0 && (
                          <>
                            <td className="px-3 py-2 font-semibold text-slate-800" rowSpan={SESSIONS.length}>{s.name}<span className="text-slate-400 font-mono ml-1.5 text-[10px]">{s.nis}</span></td>
                            <td className="px-2 py-2 text-center text-slate-500 text-[11px]" rowSpan={SESSIONS.length}>{s.class_name}</td>
                          </>
                        )}
                        <td className="px-2 py-2 text-center">
                          <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold', sess === 'Shubuh' ? 'bg-indigo-50 text-indigo-700' : sess === 'Ashar' ? 'bg-orange-50 text-orange-700' : sess === 'Isya' ? 'bg-violet-50 text-violet-700' : 'bg-purple-50 text-purple-700')}>{sess}</span>
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-emerald-600">{st.hadir}</td>
                        <td className="px-2 py-2 text-center font-bold text-sky-600">{st.izin}</td>
                        <td className="px-2 py-2 text-center font-bold text-amber-600">{st.sakit}</td>
                        <td className="px-2 py-2 text-center font-bold text-red-600">{st.alpa}</td>
                        <td className="px-2 py-2 text-center text-slate-600 font-semibold">{st.total}</td>
                        <td className="px-2 py-2 text-center">{st.total > 0 ? <span className={cn('font-bold', pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600')}>{pct}%</span> : <span className="text-slate-300">—</span>}</td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <BarChart3 size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Tidak ada data presensi untuk periode ini</p>
            <p className="text-xs mt-1">Coba ubah periode atau klik "Tampilkan Rekap"</p>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
