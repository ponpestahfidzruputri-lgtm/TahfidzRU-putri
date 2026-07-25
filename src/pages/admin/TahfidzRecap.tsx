import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { BookOpen, Loader2, BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

export default function TahfidzRecap() {
  const [recapPeriod, setRecapPeriod] = useState<'month' | 'year'>('month');
  const [recapMonth, setRecapMonth] = useState(new Date().getMonth() + 1);
  const [recapYear, setRecapYear] = useState(new Date().getFullYear());
  const [recapData, setRecapData] = useState<any[]>([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const { toast, showToast } = useToast();


  const fetchRecap = async () => {
    setRecapLoading(true);
    try {
      const data = await dataService.getTahfidzRecap(recapPeriod, recapYear, recapPeriod === 'month' ? recapMonth : undefined);
      setRecapData(data || []);
    } catch { showToast('Gagal memuat rekap setoran. Periksa koneksi.', 'error'); }
    finally { setRecapLoading(false); }
  };

  useEffect(() => { fetchRecap(); }, []);


  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Rekap Setoran Hafalan</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rekapitulasi hafalan Al-Qur'an santri per bulan atau per tahun</p>
      </div>

      <div className="card p-5 space-y-4 border-[#1e3a5f]/10">
        <div className="flex flex-wrap gap-3">
          <select className="input-field w-auto" value={recapPeriod} onChange={(e) => setRecapPeriod(e.target.value as 'month' | 'year')}>
            <option value="month">Per Bulan</option>
            <option value="year">Per Tahun</option>
          </select>
          {recapPeriod === 'month' && (
            <select className="input-field w-auto" value={recapMonth} onChange={(e) => setRecapMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM', { locale: id })}</option>
              ))}
            </select>
          )}
          <input type="number" className="input-field w-28" value={recapYear} onChange={(e) => setRecapYear(Number(e.target.value))} min="2000" max="2100" />
          <button onClick={fetchRecap} className="btn-primary">
            {recapLoading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
            {recapLoading ? 'Memuat...' : 'Tampilkan Rekap'}
          </button>
        </div>

        {recapData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Santri</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Surah</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Dari Halaman</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Sampai Halaman</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Jumlah Halaman</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Jenis</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Skema</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Kelancaran</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recapData.map((r: any, idx: number) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.santri?.name || '-'} <span className="text-slate-400 font-mono ml-1">{r.santri?.nis || '-'}</span></td>
                    <td className="px-3 py-2 text-slate-600">{r.surah}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{r.from_ayat ?? '-'}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{r.to_ayat ?? '-'}</td>
                    <td className="px-3 py-2 text-center text-slate-600 font-bold">{r.from_ayat && r.to_ayat ? r.to_ayat - r.from_ayat + 1 : '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', r.type === 'Setoran Baru' ? 'bg-blue-50 text-blue-600' : 'bg-sky-50 text-sky-600')}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">{r.setoran_mode === 'per_juz' ? 'Per Juz' : 'Per Halaman'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        r.fluency === 'Lancar' ? 'bg-emerald-50 text-emerald-700' : r.fluency === 'Cukup' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                        {r.fluency || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy', { locale: id }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <BookOpen size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium">Belum ada data setoran untuk periode ini</p>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
