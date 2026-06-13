import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/data';
import { Search, UserPlus, Edit2, Trash2, Filter, Loader2, X, Award, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { useNavigate } from 'react-router-dom';

export default function SantriManagement() {
  const navigate = useNavigate();
  const [santri, setSantri] = useState<any[]>([]);
  const [waliList, setWaliList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Semua');
  const { toast, showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSantri, setCurrentSantri] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  const [formData, setFormData] = useState({
    name: '', nis: '', type: 'Mukim',
    wali_id: '', email: '', photo_url: '',
    tahfidz_level: 'yanbua'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [santriData, waliData] = await Promise.all([
        supabase.from('santri').select('*, profiles:wali_id(full_name)').order('name'),
        dataService.getWaliList()
      ]);
      if (santriData.error) throw santriData.error;
      setSantri(santriData.data || []);
      setWaliList(waliData || []);
    } catch (error: any) {
      showToast('Gagal memuat data: ' + (error.message || 'Error tidak diketahui'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (s: any) => {
    let nextLevel = '';
    let promptMsg = '';
    if (s.tahfidz_level === 'yanbua') {
      nextLevel = 'binnadzhor';
      promptMsg = `Apakah Anda yakin ingin menaikkan tingkat ${s.name} dari Yanbu'a ke Bin Nadzhor?`;
    } else if (s.tahfidz_level === 'binnadzhor') {
      nextLevel = 'bilghoib';
      promptMsg = `Apakah Anda yakin ingin menaikkan tingkat ${s.name} dari Bin Nadzhor ke Bil Ghoib?`;
    } else {
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Naik Tingkat',
      message: promptMsg,
      confirmText: 'Ya, Naikkan Tingkat',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.updateSantri(s.id, { ...s, tahfidz_level: nextLevel });
          showToast(`${s.name} berhasil naik tingkat!`, 'success');
          fetchData();
        } catch (error: any) {
          showToast(error.message || 'Gagal menaikkan tingkat santri', 'error');
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Santri',
      message: 'Apakah Anda yakin ingin menghapus data santri ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.deleteSantri(id);
          showToast('Data santri berhasil dihapus', 'success');
          fetchData();
        } catch { showToast('Gagal menghapus data santri', 'error'); }
      }
    });
  };

  const handleOpenModal = (s?: any) => {
    if (s) {
      setCurrentSantri(s);
      setFormData({ name: s.name, nis: s.nis, type: s.type,
        wali_id: s.wali_id || '', email: s.email || '', photo_url: s.photo_url || '',
        tahfidz_level: s.tahfidz_level || 'yanbua' });
    } else {
      const nises = santri.map(x => { const m = x.nis.match(/\d+/); return m ? parseInt(m[0]) : 0; })
        .filter(n => n > 0).sort((a, b) => b - a);
      const next = nises.length > 0 ? nises[0] + 1 : 1;
      setCurrentSantri(null);
      setFormData({ name: '', nis: next < 10 ? `0${next}` : `${next}`, type: 'Mukim',
        wali_id: '', email: '', photo_url: '', tahfidz_level: 'yanbua' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (currentSantri) {
        await dataService.updateSantri(currentSantri.id, formData);
        showToast('Data santri berhasil diperbarui', 'success');
      } else {
        await dataService.createSantri(formData);
        showToast('Santri baru berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Gagal menyimpan data santri', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSantri = santri.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm);
    const matchesFilter = filterType === 'Semua' || s.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Data Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola data seluruh santri Pondok Pesantren Roudhlatul Ulum</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary self-start sm:self-auto">
          <UserPlus size={16} />
          Tambah Santri
        </button>
      </div>

      {/* Filter & Search */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIS santri..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="input-field pl-10 pr-10 appearance-none cursor-pointer min-w-[160px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="Semua">Semua Tipe</option>
              <option value="Mukim">Mukim</option>
              <option value="Non-Mukim">Non-Mukim</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Santri</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tipe</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Tingkat / Kelas</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Wali</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={22} className="animate-spin text-slate-300" />
                    <span className="text-sm text-slate-400">Memuat data santri...</span>
                  </div>
                </td></tr>
              ) : filteredSantri.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  Tidak ada data santri yang ditemukan.
                </td></tr>
              ) : filteredSantri.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img className="h-9 w-9 rounded-full object-cover border border-slate-100 flex-shrink-0" src={s.photo_url} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-mono">NIS-{s.nis}</span>
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border",
                            s.tahfidz_level === 'bilghoib' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            s.tahfidz_level === 'binnadzhor' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          )}>
                            {s.tahfidz_level === 'bilghoib' ? '📖 Bil Ghoib' : s.tahfidz_level === 'binnadzhor' ? '👀 Bin Nadzhor' : '📗 Yanbu\'a'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(s.type === 'Mukim' ? 'badge-blue' : 'badge-amber')}>{s.type}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-slate-600 font-medium">
                      {s.tahfidz_level === 'bilghoib' ? 'Bil Ghoib' : s.tahfidz_level === 'binnadzhor' ? 'Bin Nadzhor' : 'Yanbu\'a'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {s.profiles?.full_name ? (
                      <span className="text-sm text-slate-600">{s.profiles.full_name}</span>
                    ) : (
                      <span className="text-xs text-slate-300 flex items-center gap-1"><X size={12} />Belum terhubung</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.tahfidz_level !== 'bilghoib' && (
                        <button onClick={() => handlePromote(s)} title="Naik Tingkat"
                          className="px-2 py-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-150 text-[10px] font-black flex items-center gap-1 transition-colors mr-1">
                          Naik Tingkat
                        </button>
                      )}
                      <button onClick={() => navigate(`/admin/ijazah/${s.id}`)} title="Lihat Ijazah"
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                        <Award size={16} />
                      </button>
                      <button onClick={() => handleOpenModal(s)} title="Edit"
                        className="p-2 rounded-lg text-slate-400 hover:text-[#1e3a5f] hover:bg-blue-50 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} title="Hapus"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400">
            Menampilkan {filteredSantri.length} dari {santri.length} santri
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={currentSantri ? 'Edit Data Santri' : 'Tambah Santri Baru'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" required className="input-field" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">NIS</label>
              <input type="text" required className="input-field" value={formData.nis}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Tingkat / Kelas</label>
              <select className="input-field" value={formData.tahfidz_level}
                onChange={(e) => setFormData({ ...formData, tahfidz_level: e.target.value })}>
                <option value="yanbua">Yanbu'a</option>
                <option value="binnadzhor">Bin Nadzhor</option>
                <option value="bilghoib">Bil Ghoib</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Tipe Santri</label>
              <select className="input-field" value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Mukim">Mukim</option>
                <option value="Non-Mukim">Non-Mukim</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Email Santri</label>
              <input type="email" className="input-field" placeholder="Opsional" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Wali Santri</label>
              <select className="input-field" value={formData.wali_id}
                onChange={(e) => setFormData({ ...formData, wali_id: e.target.value })}>
                <option value="">-- Pilih Wali (Opsional) --</option>
                {waliList.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Foto Santri (Dari Perangkat)</label>
              <div className="flex gap-3 items-center">
                 {formData.photo_url && (
                    <img src={formData.photo_url} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                 )}
                 <input type="file" accept="image/*" className="input-field p-2 text-sm flex-1"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       const reader = new FileReader();
                       reader.onloadend = () => {
                         setFormData({ ...formData, photo_url: reader.result as string });
                       };
                       reader.readAsDataURL(file);
                     }
                   }} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} title={confirmModal.title} className="max-w-md">
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed">
            {confirmModal.message}
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="btn-secondary flex-1">Batal</button>
            <button onClick={confirmModal.onConfirm} className={`btn-primary flex-1 ${confirmModal.title.includes('Hapus') ? 'bg-pesantren-red hover:bg-red-600 text-white' : ''}`}>
              {confirmModal.confirmText}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
