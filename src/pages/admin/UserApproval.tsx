import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { UserCheck, UserX, Search, ShieldCheck, Loader2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';

export default function UserApproval() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast, showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const data = await dataService.getProfiles();
      setProfiles(data);
    } catch (error) {
      showToast('Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: string, approved: boolean) => {
    try {
      await dataService.updateProfile(id, { is_approved: approved });
      showToast(approved ? 'Akun berhasil disetujui' : 'Persetujuan akun dibatalkan', 'success');
      fetchProfiles();
    } catch (error) {
      showToast('Gagal mengubah status persetujuan', 'error');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await dataService.updateProfile(id, { role });
      showToast('Peran pengguna berhasil diperbarui', 'success');
      fetchProfiles();
    } catch (error) {
      showToast('Gagal mengubah peran', 'error');
    }
  };

  const handleDeleteUser = (id: string, nameOrEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun',
      message: `Apakah Anda yakin ingin menghapus akun "${nameOrEmail}"? Tindakan ini akan menghapus seluruh data terkait dan tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Akun',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.deleteUser(id);
          showToast('Akun berhasil dihapus', 'success');
          fetchProfiles();
        } catch (error: any) {
          console.error("Delete user error:", error);
          if (error.message?.includes('function delete_user does not exist')) {
            showToast('Fungsi hapus belum terpasang di database (Jalankan SQL Migration di Supabase)', 'error');
          } else {
            showToast(error.message || 'Gagal menghapus akun', 'error');
          }
        }
      }
    });
  };

  const filteredProfiles = profiles.filter(p =>
    (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'pengurus', label: 'Pengurus' },
    { value: 'pengajar', label: 'Pengajar' },
    { value: 'wali', label: 'Wali Santri' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-header">Persetujuan Pengguna</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola akses dan peran pengguna dalam sistem</p>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Peran</th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={22} className="animate-spin text-slate-300" />
                      <span className="text-sm text-slate-400">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                    Tidak ada pengguna yang ditemukan.
                  </td>
                </tr>
              ) : filteredProfiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(p.full_name || p.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{p.full_name || 'Tanpa Nama'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell">
                    <span className="text-xs text-slate-500">{p.email}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="relative w-fit">
                      <select
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 appearance-none pr-7 cursor-pointer"
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      >
                        {roleOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ShieldCheck className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span className={cn(
                      p.is_approved ? "badge-green" : "badge-amber"
                    )}>
                      {p.is_approved ? 'Disetujui' : 'Menunggu'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                    {!p.is_approved ? (
                      <button
                        onClick={() => handleApproval(p.id, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserCheck size={13} />
                        Setujui
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproval(p.id, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserX size={13} />
                        Cabut
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(p.id, p.full_name || p.email)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-lg transition-colors"
                      title="Hapus Akun"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <button onClick={confirmModal.onConfirm} className="btn-primary bg-red-600 hover:bg-red-700 text-white border-transparent flex-1">
              {confirmModal.confirmText}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
