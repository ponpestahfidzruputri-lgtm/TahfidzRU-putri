import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, CheckCircle2, Loader2, Award, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';

export default function NaikkanTingkat() {
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  useEffect(() => { fetchSantri(); }, []);

  const fetchSantri = async () => {
    try {
      const data = await dataService.getSantriList();
      setSantri(data || []);
    } catch { showToast('Gagal memuat daftar santri', 'error'); }
    finally { setLoading(false); }
  };

  const handleUpgrade = (santriId: string, currentLevel: string) => {
    let newLevel: string;
    if (currentLevel === 'yanbua') {
      newLevel = 'binnadzhor';
    } else if (currentLevel === 'binnadzhor') {
      newLevel = 'bilghoib';
    } else {
      showToast('Santri sudah di tingkat tertinggi', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Kenaikan Tingkat',
      message: `Apakah Anda yakin ingin menaikkan tingkat santri ini ke tingkat ${getLevelLabel(newLevel)}?`,
      confirmText: 'Ya, Naikkan Tingkat',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setUpdating(santriId);
        try {
          const { data, error } = await supabase
            .from('santri')
            .update({ tahfidz_level: newLevel })
            .eq('id', santriId)
            .select();

          if (error) throw error;

          if (!data || data.length === 0) {
            throw new Error('Gagal menaikkan tingkat. Kebijakan keamanan (RLS) di database belum mengizinkan pengajar untuk memperbarui data santri.');
          }

          showToast(`Berhasil naikkan tingkat ke ${newLevel}`, 'success');
          setSantri(prev => prev.map(s => s.id === santriId ? { ...s, tahfidz_level: newLevel } : s));
          fetchSantri();
        } catch (error: any) {
          showToast(error.message || 'Gagal naikkan tingkat', 'error');
        } finally {
          setUpdating(null);
        }
      }
    });
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'yanbua': return 'Yanbu\'a (Dasar)';
      case 'binnadzhor': return 'Bin Nadzhor (Menengah)';
      case 'bilghoib': return 'Bil Ghoib (Lanjut)';
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'yanbua': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'binnadzhor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'bilghoib': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const canUpgrade = (level: string) => level !== 'bilghoib';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-header">Naikkan Tingkat Santri</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola dan tingkatkan level tahfidz santri</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['yanbua', 'binnadzhor', 'bilghoib'].map((level) => (
          <div key={level} className={cn("card p-4 border-l-4", 
            level === 'yanbua' ? 'border-l-emerald-500' : 
            level === 'binnadzhor' ? 'border-l-blue-500' : 'border-l-purple-500'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                level === 'yanbua' ? 'bg-emerald-100 text-emerald-600' :
                level === 'binnadzhor' ? 'bg-blue-100 text-blue-600' :
                'bg-purple-100 text-purple-600'
              )}>
                <Award size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {santri.filter(s => s.tahfidz_level === level).length}
                </p>
                <p className="text-xs text-slate-500">{getLevelLabel(level)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Santri List */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Users size={16} className="text-slate-400" />
          <h3 className="section-title">Daftar Santri</h3>
          <span className="badge-blue">{santri.length} santri</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : santri.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Users size={48} className="mb-3 opacity-30" />
            <p className="text-sm">Belum ada data santri</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {santri.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                    {s.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.name || 'Santri tanpa nama'}</p>
                    <p className="text-xs text-slate-500">NIS: {s.nis || '-'} • Kelas: {s.class_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold px-3 py-1 rounded-full border", getLevelColor(s.tahfidz_level))}>
                    {getLevelLabel(s.tahfidz_level)}
                  </span>
                  {canUpgrade(s.tahfidz_level) && (
                    <button
                      onClick={() => handleUpgrade(s.id, s.tahfidz_level)}
                      disabled={updating === s.id}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        "bg-[#1e3a5f] text-white hover:bg-[#2a4a7a]",
                        updating === s.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {updating === s.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <TrendingUp size={12} />
                      )}
                      {updating === s.id ? 'Memproses...' : 'Naikkan'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title={confirmModal.title}
        className="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed">
            {confirmModal.message}
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="btn-secondary flex-1">Batal</button>
            <button onClick={confirmModal.onConfirm} className="btn-primary flex-1">
              {confirmModal.confirmText}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
