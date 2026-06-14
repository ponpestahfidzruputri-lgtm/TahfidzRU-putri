import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { GraduationCap, Plus, Edit2, Trash2, Loader2, UserCircle, ChevronDown, Activity, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { motion } from 'motion/react';

export default function NilaiManagement() {
  const [santri, setSantri] = useState<any[]>([]);
  const [kurikulum, setKurikulum] = useState<any[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string>('');
  const [nilai, setNilai] = useState<any[]>([]);
  const [absensiSummary, setAbsensiSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubjectSubmitting, setIsSubjectSubmitting] = useState(false);
  const [editingNilai, setEditingNilai] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  const [formData, setFormData] = useState({
    kurikulum_id: '',
    score: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [subjectForm, setSubjectForm] = useState({
    subject: '',
    description: '',
  });

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => {
    if (selectedSantri) fetchNilai(selectedSantri);
    else { setNilai([]); setAbsensiSummary(null); }
  }, [selectedSantri]);

  const fetchSubjects = async () => {
    try {
      const data = await dataService.getKurikulum();
      setKurikulum(data);
    } catch { showToast('Gagal memuat mata pelajaran', 'error'); }
  };

  const fetchInitialData = async () => {
    try {
      const [santriData, kurikulumData] = await Promise.all([
        dataService.getSantriList(), dataService.getKurikulum()
      ]);
      setSantri(santriData);
      setKurikulum(kurikulumData);
    } catch { showToast('Gagal memuat data awal', 'error'); }
    finally { setLoading(false); }
  };

  const fetchNilai = async (id: string) => {
    try {
      const [nilaiData, absensiData] = await Promise.all([
        dataService.getNilai(id), dataService.getAbsensiBySantri(id)
      ]);
      setNilai(nilaiData);
      if (absensiData?.length > 0) {
        const stats = {
          hadir: absensiData.filter((a: any) => a.status === 'Hadir').length,
          alpa: absensiData.filter((a: any) => a.status === 'Alpa').length,
          total: absensiData.length
        };
        setAbsensiSummary({ ...stats, percentage: Math.round(((stats.total - stats.alpa) / stats.total) * 100) });
      } else { setAbsensiSummary(null); }
    } catch { showToast('Gagal memuat data nilai', 'error'); }
  };

  const handleOpenModal = (n?: any) => {
    if (n) {
      setEditingNilai(n);
      setFormData({
        kurikulum_id: n.kurikulum_id,
        score: n.score.toString(),
        description: n.description || '',
        date: n.date || new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingNilai(null);
      setFormData({
        kurikulum_id: '',
        score: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Nilai',
      message: 'Apakah Anda yakin ingin menghapus nilai ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.deleteNilai(id);
          showToast('Nilai berhasil dihapus', 'success');
          fetchNilai(selectedSantri);
        } catch {
          showToast('Gagal menghapus nilai', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return showToast('Pilih santri terlebih dahulu', 'error');
    if (!formData.kurikulum_id) return showToast('Pilih mata pelajaran terlebih dahulu', 'error');
    if (!formData.score.trim()) return showToast('Nilai tidak boleh kosong', 'error');
    setIsSubmitting(true);
    try {
      const payload = { ...formData, score: Number(formData.score), santri_id: selectedSantri };
      if (editingNilai) {
        await dataService.updateNilai(editingNilai.id, payload);
        showToast('Nilai berhasil diperbarui', 'success');
      } else {
        await dataService.createNilai(payload);
        showToast('Nilai berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      fetchNilai(selectedSantri);
    } catch { showToast('Gagal menyimpan nilai', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleOpenSubjectModal = (subject?: any) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectForm({
        subject: subject.subject,
        description: subject.description || '',
      });
    } else {
      setEditingSubject(null);
      setSubjectForm({ subject: '', description: '' });
    }
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Mata Pelajaran',
      message: `Apakah Anda yakin ingin menghapus mata pelajaran "${name}"? Perhatian: Semua nilai yang terhubung dengan mata pelajaran ini akan ikut terhapus permanen.`,
      confirmText: 'Ya, Hapus Mapel',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.deleteKurikulum(id);
          showToast('Mata pelajaran berhasil dihapus', 'success');
          await fetchSubjects();
        } catch { showToast('Gagal menghapus mata pelajaran', 'error'); }
      }
    });
  };

  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.subject.trim()) return showToast('Nama mata pelajaran tidak boleh kosong', 'error');
    setIsSubjectSubmitting(true);
    try {
      if (editingSubject) {
        await dataService.updateKurikulum(editingSubject.id, subjectForm);
        showToast('Mata pelajaran berhasil diperbarui', 'success');
      } else {
        await dataService.createKurikulum(subjectForm);
        showToast('Mata pelajaran berhasil ditambahkan', 'success');
      }
      setIsSubjectModalOpen(false);
      await fetchSubjects();
    } catch { showToast('Gagal menyimpan mata pelajaran', 'error'); }
    finally { setIsSubjectSubmitting(false); }
  };

  const selectedSantriData = santri.find(s => s.id === selectedSantri);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700';
    if (score >= 70) return 'bg-blue-50 text-blue-700';
    if (score >= 60) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Manajemen Nilai</h1>
          <p className="text-sm text-slate-500 mt-0.5">Input dan pantau nilai akademik santri</p>
        </div>
        {selectedSantri && (
          <button onClick={() => handleOpenModal()} className="btn-primary self-start">
            <Plus size={16} />
            Input Nilai
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Panel */}
        <div className="space-y-4">
          {/* Pilih Santri */}
          <div className="card p-4">
            <label className="form-label">Pilih Santri</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-10 cursor-pointer"
                value={selectedSantri}
                onChange={(e) => setSelectedSantri(e.target.value)}
              >
                <option value="">-- Pilih Santri --</option>
                {santri.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s.name || 'Santri tanpa nama')} ({s.nis || '-'})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Info Santri */}
          {selectedSantriData && (
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold">
                  {selectedSantriData.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedSantriData.name}</p>
                  <p className="text-xs text-slate-400">Kelas {selectedSantriData.class_name}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">Total nilai: <span className="font-semibold text-slate-700">{nilai.length} mata pelajaran</span></div>
            </div>
          )}

          <div className="card p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mata Pelajaran</p>
                  <p className="text-xs text-slate-400">Kelola daftar mata pelajaran tanpa pindah halaman.</p>
                </div>
              </div>
              <button onClick={() => handleOpenSubjectModal()} className="btn-secondary text-xs px-3 py-1.5">Tambah</button>
            </div>
            {kurikulum.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Belum ada mata pelajaran. Tambahkan terlebih dahulu agar nilai dapat diinput.
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {kurikulum.map((subject) => (
                  <div key={subject.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{subject.subject}</p>
                      <p className="text-xs text-slate-500 truncate mt-1">{subject.description || 'Tanpa keterangan'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenSubjectModal(subject)}
                        className="text-slate-400 hover:text-[#1e3a5f] rounded-lg p-2 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteSubject(subject.id, subject.subject)}
                        className="text-slate-400 hover:text-red-500 rounded-lg p-2 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan Absensi */}
          {selectedSantri && absensiSummary && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={15} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">Rekap Kehadiran</p>
              </div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{absensiSummary.percentage}%</div>
              <p className="text-xs text-slate-400 mb-3">Tingkat kehadiran</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Hadir</p>
                  <p className="text-lg font-bold text-emerald-700">{absensiSummary.hadir}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-500 font-medium">Alpa</p>
                  <p className="text-lg font-bold text-red-600">{absensiSummary.alpa}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel - Nilai Table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-slate-400" />
              <h3 className="section-title">Rapor Nilai</h3>
            </div>
            {nilai.length > 0 && (
              <span className="badge-blue">{nilai.length} mapel</span>
            )}
          </div>

          {!selectedSantri ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <UserCircle size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-medium text-slate-400">Pilih santri untuk melihat nilai</p>
            </div>
          ) : nilai.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-slate-400 mb-3">Belum ada nilai untuk santri ini.</p>
              <button onClick={() => handleOpenModal()} className="btn-primary">
                <Plus size={15} /> Input Nilai Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mata Pelajaran</th>
                    <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nilai</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Keterangan</th>
                    <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Tanggal</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {nilai.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{n.kurikulum?.subject}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm",
                          getScoreColor(n.score)
                        )}>{n.score}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-slate-500">{n.description || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                        <p className="text-xs text-slate-500 font-mono">{n.date}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenModal(n)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#1e3a5f] hover:bg-blue-50 transition-colors">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(n.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingNilai ? 'Edit Nilai Santri' : 'Input Nilai Baru'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Mata Pelajaran</label>
            {kurikulum.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100">
                ⚠️ Belum ada mata pelajaran. Tambahkan dulu di panel Mata Pelajaran.
              </div>
            ) : (
              <select required className="input-field" value={formData.kurikulum_id}
                onChange={(e) => setFormData({ ...formData, kurikulum_id: e.target.value })}>
                <option value="">Pilih mata pelajaran...</option>
                {kurikulum.map(k => <option key={k.id} value={k.id}>{k.subject}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Nilai (0–100)</label>
              <input type="number" required min="0" max="100" className="input-field" value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Tanggal Penilaian</label>
              <input type="date" className="input-field" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Keterangan</label>
            <textarea className="input-field" rows={2} placeholder="Catatan tambahan (opsional)..." value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isSubmitting || kurikulum.length === 0} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSubjectModalOpen} onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}>
        <form onSubmit={handleSubmitSubject} className="space-y-4">
          <div>
            <label className="form-label">Nama Mata Pelajaran</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Contoh: Fiqih, Nahwu, Al-Qur'an..."
              value={subjectForm.subject}
              onChange={(e) => setSubjectForm({ ...subjectForm, subject: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Deskripsi <span className="text-slate-400 font-normal">(opsional)</span></label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Keterangan singkat..."
              value={subjectForm.description}
              onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isSubjectSubmitting} className="btn-primary flex-1">
              {isSubjectSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubjectSubmitting ? 'Menyimpan...' : editingSubject ? 'Simpan Mapel' : 'Tambah Mapel'}
            </button>
          </div>
        </form>
      </Modal>

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
