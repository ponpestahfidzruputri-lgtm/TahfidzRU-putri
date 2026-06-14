import React, { useEffect, useRef, useState } from 'react';
import { dataService } from '../../services/data';
import {
  Image, Plus, Edit2, Trash2, Loader2, X, Film, LayoutGrid, Eye, EyeOff, GripVertical,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

type Tab = 'hero' | 'galeri';

const GALERI_CATEGORIES = ['Kegiatan', 'Fasilitas', 'Kajian'];

export default function KontenManagement() {
  const [tab, setTab] = useState<Tab>('hero');
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [galeriItems, setGaleriItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [posterPreview, setPosterPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    onConfirm: () => {}
  });

  const [heroForm, setHeroForm] = useState({
    type: 'image' as 'image' | 'video',
    media_url: '',
    poster_url: '',
    alt: '',
    caption: '',
    sort_order: 0,
    is_active: true,
  });

  const [galeriForm, setGaleriForm] = useState({
    title: '',
    category: 'Kegiatan',
    image_url: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [hero, galeri] = await Promise.all([
        dataService.getHeroSlides(false),
        dataService.getGaleriItems(false),
      ]);
      setHeroSlides(hero || []);
      setGaleriItems(galeri || []);
    } catch {
      showToast('Gagal memuat konten website', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetHeroForm = () => ({
    type: 'image' as const,
    media_url: '',
    poster_url: '',
    alt: '',
    caption: '',
    sort_order: heroSlides.length,
    is_active: true,
  });

  const resetGaleriForm = () => ({
    title: '',
    category: 'Kegiatan',
    image_url: '',
    description: '',
    sort_order: galeriItems.length,
    is_active: true,
  });

  const handleOpenModal = (item?: any) => {
    if (tab === 'hero') {
      if (item) {
        setEditingItem(item);
        setHeroForm({
          type: item.type || 'image',
          media_url: item.media_url || '',
          poster_url: item.poster_url || '',
          alt: item.alt || '',
          caption: item.caption || '',
          sort_order: item.sort_order ?? 0,
          is_active: item.is_active ?? true,
        });
        setMediaPreview(item.media_url || '');
        setPosterPreview(item.poster_url || '');
      } else {
        setEditingItem(null);
        setHeroForm(resetHeroForm());
        setMediaPreview('');
        setPosterPreview('');
      }
    } else {
      if (item) {
        setEditingItem(item);
        setGaleriForm({
          title: item.title || '',
          category: item.category || 'Kegiatan',
          image_url: item.image_url || '',
          description: item.description || '',
          sort_order: item.sort_order ?? 0,
          is_active: item.is_active ?? true,
        });
        setMediaPreview(item.image_url || '');
      } else {
        setEditingItem(null);
        setGaleriForm(resetGaleriForm());
        setMediaPreview('');
      }
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'media' | 'poster'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const url = await dataService.uploadKontenMedia(file, tab === 'hero' ? 'hero' : 'galeri');
      if (target === 'media') {
        setMediaPreview(url);
        if (tab === 'hero') {
          setHeroForm((prev) => ({
            ...prev,
            media_url: url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
          }));
        } else {
          setGaleriForm((prev) => ({ ...prev, image_url: url }));
        }
      } else {
        setPosterPreview(url);
        setHeroForm((prev) => ({ ...prev, poster_url: url }));
      }
      showToast('File berhasil diunggah', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah file', 'error');
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'hero') {
      if (!heroForm.media_url.trim()) { showToast('Media wajib diunggah', 'error'); return; }
      if (!heroForm.alt.trim()) { showToast('Deskripsi alt wajib diisi', 'error'); return; }
    } else {
      if (!galeriForm.title.trim()) { showToast('Judul wajib diisi', 'error'); return; }
      if (!galeriForm.image_url.trim()) { showToast('Foto wajib diunggah', 'error'); return; }
    }

    setIsSubmitting(true);
    try {
      if (tab === 'hero') {
        const payload = { ...heroForm, poster_url: heroForm.poster_url || null };
        if (editingItem) {
          await dataService.updateHeroSlide(editingItem.id, payload);
          showToast('Slide hero diperbarui', 'success');
        } else {
          await dataService.createHeroSlide(payload);
          showToast('Slide hero ditambahkan', 'success');
        }
      } else {
        if (editingItem) {
          await dataService.updateGaleriItem(editingItem.id, galeriForm);
          showToast('Item galeri diperbarui', 'success');
        } else {
          await dataService.createGaleriItem(galeriForm);
          showToast('Item galeri ditambahkan', 'success');
        }
      }
      setIsModalOpen(false);
      fetchAll();
    } catch {
      showToast('Gagal menyimpan konten', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const label = tab === 'hero' ? 'slide hero' : 'foto galeri';
    setConfirmModal({
      isOpen: true,
      title: `Hapus ${tab === 'hero' ? 'Slide Hero' : 'Item Galeri'}`,
      message: `Apakah Anda yakin ingin menghapus ${label} ini? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          if (tab === 'hero') await dataService.deleteHeroSlide(id);
          else await dataService.deleteGaleriItem(id);
          showToast('Konten dihapus', 'success');
          fetchAll();
        } catch {
          showToast('Gagal menghapus konten', 'error');
        }
      }
    });
  };

  const toggleActive = async (item: any) => {
    try {
      if (tab === 'hero') {
        await dataService.updateHeroSlide(item.id, { is_active: !item.is_active });
      } else {
        await dataService.updateGaleriItem(item.id, { is_active: !item.is_active });
      }
      fetchAll();
    } catch {
      showToast('Gagal mengubah status', 'error');
    }
  };

  const currentList = tab === 'hero' ? heroSlides : galeriItems;

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Konten Website</h1>
          <p className="text-slate-500 font-medium mt-1">
            Kelola foto slider beranda dan galeri pesantren via Supabase
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={18} />
          <span>Tambah {tab === 'hero' ? 'Slide' : 'Foto'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab('hero')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            tab === 'hero' ? 'bg-white text-pesantren-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Film size={16} /> Slider Beranda
        </button>
        <button
          onClick={() => setTab('galeri')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            tab === 'galeri' ? 'bg-white text-pesantren-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <LayoutGrid size={16} /> Galeri Foto
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-pesantren-green" size={36} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Image className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium">
            Belum ada {tab === 'hero' ? 'slide hero' : 'foto galeri'}. Klik tombol Tambah untuk mulai.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentList.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="glass-panel overflow-hidden group"
            >
              <div className="relative h-44 bg-slate-100">
                {tab === 'hero' && item.type === 'video' ? (
                  <video
                    src={item.media_url}
                    poster={item.poster_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={tab === 'hero' ? item.media_url : item.image_url}
                    alt={tab === 'hero' ? item.alt : item.title}
                    className="w-full h-full object-cover"
                  />
                )}
                {!item.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Nonaktif</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  <GripVertical size={10} /> #{item.sort_order}
                </div>
              </div>

              <div className="p-5">
                {tab === 'hero' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                        item.type === 'video' ? 'bg-pesantren-blue/20 text-[#0d557c]' : 'bg-pesantren-green/20 text-pesantren-dark'
                      )}>
                        {item.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-pesantren-dark text-sm mb-1 line-clamp-1">{item.alt}</h3>
                    {item.caption && (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.caption}</p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black uppercase text-pesantren-green">{item.category}</span>
                    <h3 className="font-bold text-pesantren-dark text-sm mt-1 mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                  </>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => toggleActive(item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-pesantren-green hover:bg-pesantren-green/10 transition-colors"
                    title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {item.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-pesantren-blue hover:bg-pesantren-blue/10 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-pesantren-red hover:bg-pesantren-red/10 transition-colors ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
        editingItem
          ? `Edit ${tab === 'hero' ? 'Slide Hero' : 'Foto Galeri'}`
          : `Tambah ${tab === 'hero' ? 'Slide Hero' : 'Foto Galeri'}`
      }>
        <form onSubmit={handleSubmit} className="space-y-5">
          {tab === 'hero' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Foto / Video *
                </label>
                <input ref={fileInputRef} type="file" accept="image/*,video/mp4" className="hidden"
                  onChange={(e) => handleFileUpload(e, 'media')} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-pesantren-green transition-colors"
                >
                  {mediaPreview ? (
                    heroForm.type === 'video' ? (
                      <video src={mediaPreview} className="max-h-40 mx-auto rounded-xl" controls />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="max-h-40 mx-auto rounded-xl object-cover" />
                    )
                  ) : (
                    <>
                      <Film className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-xs font-semibold text-slate-600">Klik untuk upload foto atau video MP4</p>
                      <p className="text-[10px] text-slate-400 mt-1">Foto max 5 MB · Video max 50 MB</p>
                    </>
                  )}
                </div>
              </div>

              {heroForm.type === 'video' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Thumbnail Video (poster)
                  </label>
                  <input ref={posterInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFileUpload(e, 'poster')} />
                  <div
                    onClick={() => posterInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-pesantren-green transition-colors"
                  >
                    {posterPreview ? (
                      <img src={posterPreview} alt="Poster" className="max-h-24 mx-auto rounded-lg" />
                    ) : (
                      <p className="text-xs text-slate-500">Upload thumbnail video (opsional)</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alt Text *</label>
                <input className="input-field" value={heroForm.alt}
                  onChange={(e) => setHeroForm({ ...heroForm, alt: e.target.value })}
                  placeholder="Contoh: Gedung pesantren Roudlotul Ulum" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Caption</label>
                <input className="input-field" value={heroForm.caption}
                  onChange={(e) => setHeroForm({ ...heroForm, caption: e.target.value })}
                  placeholder="Teks singkat di bawah judul hero" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urutan</label>
                  <input type="number" className="input-field" value={heroForm.sort_order}
                    onChange={(e) => setHeroForm({ ...heroForm, sort_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={heroForm.is_active}
                      onChange={(e) => setHeroForm({ ...heroForm, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-pesantren-green focus:ring-pesantren-green" />
                    <span className="text-sm font-bold text-slate-600">Aktif</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Foto *</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleFileUpload(e, 'media')} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-pesantren-green transition-colors"
                >
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="Preview" className="max-h-40 mx-auto rounded-xl object-cover" />
                  ) : (
                    <>
                      <Image className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-xs font-semibold text-slate-600">Klik untuk upload foto</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Judul *</label>
                <input className="input-field" value={galeriForm.title}
                  onChange={(e) => setGaleriForm({ ...galeriForm, title: e.target.value })}
                  placeholder="Contoh: Setoran Hafalan Santri" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori</label>
                <select className="input-field" value={galeriForm.category}
                  onChange={(e) => setGaleriForm({ ...galeriForm, category: e.target.value })}>
                  {GALERI_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deskripsi</label>
                <textarea className="input-field min-h-[80px]" value={galeriForm.description}
                  onChange={(e) => setGaleriForm({ ...galeriForm, description: e.target.value })}
                  placeholder="Keterangan singkat foto..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urutan</label>
                  <input type="number" className="input-field" value={galeriForm.sort_order}
                    onChange={(e) => setGaleriForm({ ...galeriForm, sort_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={galeriForm.is_active}
                      onChange={(e) => setGaleriForm({ ...galeriForm, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-pesantren-green focus:ring-pesantren-green" />
                    <span className="text-sm font-bold text-slate-600">Aktif</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
              <X size={16} /> Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Simpan
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
    </div>
  );
}
