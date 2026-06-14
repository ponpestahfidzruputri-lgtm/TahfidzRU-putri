import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/data';
import { BookOpen, CheckCircle2, Loader2, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from 'motion/react';

const safeDate = (dateStr: string) => {
  try {
    if (!dateStr) return new Date();
    if (typeof dateStr !== 'string') return new Date();
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(dateStr + 'T00:00:00');
  } catch { return new Date(); }
};

const getSessionBadgeClass = (session: string) => {
  switch (session) {
    case 'Shubuh': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Ashar': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Isya': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getLevelBadgeClass = (level: string) => {
  switch (level) {
    case 'yanbua': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'binnadzhor': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'bilghoib': return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'yanbua': return "Yanbu'a";
    case 'binnadzhor': return 'Bin Nadzhor';
    case 'bilghoib': return 'Bil Ghoib';
    default: return level;
  }
};

export default function HafalanWali() {
  const { user, loading: authLoading } = useAuth();
  const [santri, setSantri] = useState<any[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchSantri();
  }, [user?.id]);
  useEffect(() => { if (selectedSantriId) fetchLogs(selectedSantriId); }, [selectedSantriId]);

  const fetchSantri = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('santri').select('id, name').eq('wali_id', user.id);
      if (error) throw error;
      setSantri(data || []);
      if (data && data.length > 0) setSelectedSantriId(data[0].id);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchLogs = async (id: string) => {
    const data = await dataService.getTahfidzLogs(id);
    setLogs(data);
  };

  if (authLoading || loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Riwayat Hafalan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Jejak rekaman tahfidz dan murojaah santri</p>
        </div>
        {santri.length > 1 && (
          <div className="relative min-w-[200px]">
            <select className="input-field appearance-none pr-9" value={selectedSantriId} onChange={(e) => setSelectedSantriId(e.target.value)}>
              {santri.map(s => (
                <option key={s.id} value={s.id}>{s.name || 'Santri tanpa nama'}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a5f] text-white rounded-lg flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Catatan Setoran</h3>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full flex items-center text-[10px] font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
            Tersinkron
          </div>
        </div>
        
        <div className="p-5 md:p-8">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Belum ada riwayat hafalan</p>
              <p className="text-xs text-slate-300 mt-1">Belum ada catatan setoran atau murojaah untuk santri ini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {logs.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="card p-5 hover:border-slate-300 transition-all shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center flex-wrap gap-3">
                      <span className={cn("px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        item.type === 'Setoran Baru' ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600")}>
                        {item.type}
                      </span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getSessionBadgeClass(item.session || 'Shubuh'))}>
                        {item.session || 'Shubuh'}
                      </span>
                      {item.setoran_level && (
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getLevelBadgeClass(item.setoran_level))}>
                          {getLevelLabel(item.setoran_level)}
                        </span>
                      )}
                      <h4 className="text-lg font-bold text-slate-900">{item.surah}</h4>
                      
                      {!item.surah?.startsWith('Jilid') ? (
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 font-semibold border border-slate-100">
                          <span>
                            {item.surah?.startsWith('Juz') ? 'Halaman' : 'Ayat'} {item.from_ayat}
                          </span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span>{item.to_ayat}</span>
                        </div>
                      ) : (
                        item.note && (
                          <span className="text-xs bg-slate-50 px-2.5 py-1 rounded-lg text-slate-600 font-semibold border border-slate-150">
                            Materi: {item.note}
                          </span>
                        )
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {(() => { try { return format(safeDate(item.created_at), 'dd MMM yyyy', { locale: localeId }); } catch { return ''; } })()}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                     <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      item.fluency === 'Lancar' ? "bg-emerald-100 text-emerald-600" : item.fluency === 'Cukup' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600")}>
                       <CheckCircle2 size={20} />
                     </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Ustadz</p>
                      <p className="text-sm text-slate-700 italic">
                        {item.surah?.startsWith('Jilid')
                          ? 'Materi Yanbu\'a berhasil disetorkan dengan baik.'
                          : (item.note || 'Tetap semangat dan istiqomah dalam murajaah.')}
                      </p>
                      <div className="mt-3 flex items-center gap-1">
                        <span className="text-xs font-semibold mr-2 text-slate-500">Kelancaran:</span>
                         {[1,2,3].map(i => (
                           <div key={i} className={cn("h-1.5 rounded-full transition-all", i <= (item.fluency === 'Lancar' ? 3 : item.fluency === 'Cukup' ? 2 : 1) ? "w-6 bg-emerald-400" : "w-3 bg-slate-200")}></div>
                         ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
