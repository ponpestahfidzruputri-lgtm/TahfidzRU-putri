import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { Calendar, Plus, Edit2, Trash2, MapPin, Clock, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
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

export default function AgendaPengajar() {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });
  const [formData, setFormData] = useState({
    title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), time: '08:00', location: ''
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
      setFormData({ title: agenda.title, description: agenda.description || '',
        date: agenda.date, time: agenda.time || '08:00', location: agenda.location || '' });
    } else {
      setEditingAgenda(null);
      setFormData({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), time: '08:00', location: '' });
    }
    setIsModalOpen(true);
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
    if (!formData.title.trim()) {
      showToast('Judul agenda tidak boleh kosong', 'error');
      return;
    }
    if (!formData.date) {
      showToast('Tanggal agenda harus diisi', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingAgenda) { await dataService.updateAgenda(editingAgenda.id, formData); showToast('Agenda diperbarui', 'success'); }
      else { await dataService.createAgenda(formData); showToast('Agenda ditambahkan', 'success'); }
      setIsModalOpen(false); fetchAgendas();
    } catch { showToast('Gagal menyimpan agenda', 'error'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Agenda Acara</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola jadwal kegiatan dan event pesantren</p>
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
              className="card p-5 flex flex-col gap-3 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
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
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
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
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Agenda'}
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
