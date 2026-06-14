import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../../services/data';
import { Calendar, Plus, Edit2, Trash2, MapPin, Clock, Loader2, Image, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion } from 'motion/react';

const toLocalNoon = (dateStr: string) => {
  try {
    if (!dateStr) return new Date();
    const clean = typeof dateStr === 'string' ? dateStr.split('T')[0] : String(dateStr);
    const d = new Date(clean + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

export default function AgendaManagement() {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [viewingPhoto, setViewingPhoto] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  const [formData, setFormData] = useState({
    title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
    time: '08:00', location: '', photo_url: ''
  });

  useEffect(() => { fetchAgendas(); }, []);

  const fetchAgendas = async () => {
    try { const data = await dataService.getAgenda(); setAgendas(data); }
    catch { showToast('Gagal memuat agenda', 'error'); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (agenda?: any) => {
    if (agenda) {
      setEditingAgenda(agenda);
      setFormData({
        title: agenda.title, description: agenda.description || '',
        date: agenda.date, time: agenda.time || '08:00',
        location: agenda.location || '', photo_url: agenda.photo_url || ''
      });
      setPhotoPreview(agenda.photo_url || '');
    } else {
      setEditingAgenda(null);
      setFormData({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), time: '08:00', location: '', photo_url: '' });
      setPhotoPreview('');
    }
    setIsModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 2 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setFormData(prev => ({ ...prev, photo_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    setFormData(prev => ({ ...prev, photo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Agenda',
      message: 'Apakah Anda yakin ingin menghapus agenda kegiatan ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await dataService.deleteAgenda(id);
          showToast('Agenda dihapus', 'success');
          fetchAgendas();
        } catch {
          showToast('Gagal menghapus agenda', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { showToast('Judul agenda tidak boleh kosong', 'error'); return; }
    if (!formData.date) { showToast('Tanggal agenda harus diisi', 'error'); return; }
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (editingAgenda) {
        await dataService.updateAgenda(editingAgenda.id, payload);
        showToast('Agenda diperbarui', 'success');
      } else {
        await dataService.createAgenda(payload);
        showToast('Agenda ditambahkan', 'success');
      }
      setIsModalOpen(false);
      fetchAgendas();
    } catch { showToast('Gagal menyimpan agenda', 'error'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Agenda Pesantren</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola jadwal kegiatan dan event di Roudhlatul Ulum</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary self-start">
          <Plus size={15} /> Tambah Agenda
        </button>
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Memuat agenda...</p>
        </div>
      ) : agendas.length === 0 ? (
        <div className="card p-12 flex flex-col items-center border-2 border-dashed border-slate-200">
          <Calendar size={40} className="text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Belum ada agenda terjadwal</p>
          <p className="text-xs text-slate-300 mt-1">Tambahkan agenda kegiatan pertama.</p>
          <button onClick={() => handleOpenModal()} className="btn-primary mt-4">
            <Plus size={14} /> Tambah Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agendas.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden flex flex-col hover:shadow-md transition-all group">

              {/* Photo Area */}
              {item.photo_url ? (
                <div
                  className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={() => setViewingPhoto(item.photo_url)}
                >
                  <img
                    src={item.photo_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-xs font-semibold">Klik untuk perbesar</span>
                  </div>
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-[#1e3a5f]/5 to-[#1e3a5f]/10 flex items-center justify-center">
                  <Calendar size={32} className="text-[#1e3a5f]/20" />
                </div>
              )}

              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-xl flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                      <span className="text-[9px] font-semibold opacity-60 uppercase">
                        {(() => { try { return format(toLocalNoon(item.date), 'MMM', { locale: id }); } catch { return '---'; } })()}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {(() => { try { return format(toLocalNoon(item.date), 'dd'); } catch { return '--'; } })()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#1e3a5f] transition-colors line-clamp-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#1e3a5f] hover:bg-blue-50 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={12} />
                    <span>{item.time || 'TBD'} WIB</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{item.location || 'Belum ditentukan'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setPhotoPreview(''); }}
        title={editingAgenda ? 'Edit Agenda' : 'Tambah Agenda Baru'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Judul Agenda</label>
            <input type="text" required className="input-field" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Deskripsi</label>
            <textarea className="input-field" rows={3} value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tanggal</label>
              <input type="date" required className="input-field" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Waktu</label>
              <input type="time" className="input-field" value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Lokasi</label>
            <input type="text" className="input-field" placeholder="Contoh: Masjid Utama" value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Image size={13} className="text-slate-400" /> Foto Kegiatan (Opsional)
            </label>
            {photoPreview ? (
              <div className="relative mt-1 rounded-xl overflow-hidden border border-slate-200">
                <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-[#1e3a5f]/40 hover:bg-slate-50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Image size={18} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-600">Klik untuk upload foto</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP maks. 2 MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setIsModalOpen(false); setPhotoPreview(''); }} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Photo Lightbox */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewingPhoto('')}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingPhoto('')}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-white rounded-full shadow-lg text-slate-700 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
            <img src={viewingPhoto} alt="Foto kegiatan" className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

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
