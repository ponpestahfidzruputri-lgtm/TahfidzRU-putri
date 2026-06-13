import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, MapPin, Award, Shield, UserCircle, Edit2, Check, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

export default function ProfilSantri() {
  const { user, loading: authLoading } = useAuth();
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

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
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setEditAddress(s.address || '');
  };

  const handleSave = async (s: any) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('santri').update({ address: editAddress }).eq('id', s.id).eq('wali_id', user?.id);
      if (error) throw error;
      showToast('Alamat berhasil diperbarui', 'success');
      setSantri(prev => prev.map(x => x.id === s.id ? { ...x, address: editAddress } : x));
      setEditingId(null);
    } catch { showToast('Gagal memperbarui alamat', 'error'); }
    finally { setSaving(false); }
  };

  const handleCancel = () => setEditingId(null);

  if (authLoading || loading) return <div className="p-8 text-slate-400 text-center">Memuat profil...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Profil Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Informasi identitas dan status akademik santri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {santri.length === 0 ? (
          <div className="col-span-full card p-16 text-center">
            <UserCircle size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-500">Santri Belum Terhubung</p>
            <p className="text-xs text-slate-400 mt-1">Belum ada data santri yang dihubungkan dengan akun Anda.</p>
          </div>
        ) : (
          santri.map(s => (
            <motion.div key={s.id} whileHover={{ y: -4 }} className="card overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-24 bg-[#1e3a5f] relative"></div>
              <div className="px-6 pb-8 -mt-12 relative z-10 text-center">
                <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 p-1 shadow-sm border border-slate-100 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-400">
                    {s.name.charAt(0)}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">{s.name}</h2>
                <div className="inline-flex items-center px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                  <p className="text-xs font-mono text-slate-500">NIS: {s.nis}</p>
                </div>

                <div className="mt-8 space-y-3 text-left">

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-4 shadow-sm">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Alamat</p>
                        </div>
                      </div>
                      {editingId !== s.id && (
                        <button onClick={() => handleEdit(s)} className="p-2 rounded-lg text-slate-400 hover:text-[#1e3a5f] hover:bg-blue-50 transition-colors">
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                    {editingId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="input-field text-sm flex-1"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Masukkan alamat..."
                        />
                        <button onClick={() => handleSave(s)} disabled={saving} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={handleCancel} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-700 break-words">{s.address || 'Belum diisi'}</p>
                    )}
                  </div>

                  <div className="flex items-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-4 shadow-sm">
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tipe Santri</p>
                      <p className="text-sm font-semibold text-slate-700">{s.type}</p>
                    </div>
                  </div>

                   <div className="flex items-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 mr-4 shadow-sm">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kelas</p>
                      <p className="text-sm font-semibold text-slate-700">{s.class_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
