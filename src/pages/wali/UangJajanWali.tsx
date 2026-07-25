import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/data';
import { formatRupiah } from '../../utils/format';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Plus, 
  X, 
  Loader2, 
  History, 
  Info,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

export default function UangJajanWali() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  const [santri, setSantri] = useState<any[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Form Fields
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    fetchSantri();
  }, [user?.id]);

  const fetchSantri = async () => {
    try {
      const { data, error } = await supabase.from('santri').select('*').eq('wali_id', user?.id);
      if (error) throw error;
      setSantri(data || []);
      if (data && data.length > 0) {
        setSelectedSantri(data[0]);
        fetchTransactions(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data santri', 'error');
      setLoading(false);
    }
  };

  const fetchTransactions = async (santriId: string) => {
    setLoading(true);
    try {
      const data = await dataService.getTransactions(santriId);
      setTransactions(data || []);
    } catch (err) {
      showToast('Gagal memuat riwayat transaksi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      showToast('Mohon masukkan nominal yang valid', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        santri_id: selectedSantri.id,
        amount: Number(formAmount),
        type: 'Uang Masuk',
        status: 'Pending', // Wali request is created as Pending
        description: formDescription.trim() || 'Titipan Top Up Wali Santri',
        date: format(new Date(), 'yyyy-MM-dd')
      };
      
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      
      showToast('Pengajuan Top Up berhasil dikirim. Silakan konfirmasi ke pengurus/admin.', 'success');
      setIsTopUpModalOpen(false);
      setFormAmount('');
      setFormDescription('');
      fetchTransactions(selectedSantri.id);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengajukan top up', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPending = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan top up ini?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('Pengajuan top up dibatalkan', 'success');
      fetchTransactions(selectedSantri.id);
    } catch (err) {
      showToast('Gagal membatalkan pengajuan', 'error');
    }
  };

  // Calculations
  const activeTransactions = transactions.filter(t => t.status === 'Paid');
  
  const totalMasuk = activeTransactions
    .filter(t => t.type === 'Uang Masuk')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalKeluar = activeTransactions
    .filter(t => t.type === 'Uang Keluar')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const saldo = totalMasuk - totalKeluar;

  if (loading && santri.length === 0) {
    return <div className="flex h-96 items-center justify-center text-slate-400">Memuat data uang jajan...</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <Toast />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Uang Jajan Ananda</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pantau saldo, titipan deposit, dan riwayat belanja ananda</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Children switcher if Wali has multiple children */}
          {santri.length > 1 && (
            <div className="relative">
              <select
                className="input-field appearance-none pr-9 min-w-[200px]"
                value={selectedSantri?.id}
                onChange={(e) => {
                  const s = santri.find(x => x.id === e.target.value);
                  setSelectedSantri(s);
                  fetchTransactions(s.id);
                }}
              >
                {santri.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.nis || '-'})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {selectedSantri && (
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} /> Ajukan Top Up
            </button>
          )}
        </div>
      </div>

      {!selectedSantri ? (
        <div className="card p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Info className="text-slate-300" size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Data Santri Belum Terhubung</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Akun Anda belum dihubungkan dengan data santri. Silakan hubungi admin pesantren untuk proses verifikasi.
          </p>
        </div>
      ) : (
        <>
          {/* Active Kid Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sisa Saldo Ananda</p>
                <h3 className="text-xl font-bold text-slate-800 leading-tight">
                  <span className={saldo < 0 ? 'text-rose-600' : saldo === 0 ? 'text-slate-400' : 'text-[#1e3a5f]'}>
                    {formatRupiah(saldo)}
                  </span>
                </h3>
                <p className="text-[9px] text-slate-400 mt-1 font-medium">Saldo jajan aktif</p>
              </div>
            </div>

            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Titipan (Masuk)</p>
                <h3 className="text-xl font-bold text-emerald-600 leading-tight">{formatRupiah(totalMasuk)}</h3>
                <p className="text-[9px] text-slate-400 mt-1 font-medium">Deposit uang jajan disetujui</p>
              </div>
            </div>

            <div className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Belanja (Keluar)</p>
                <h3 className="text-xl font-bold text-rose-600 leading-tight">{formatRupiah(totalKeluar)}</h3>
                <p className="text-[9px] text-slate-400 mt-1 font-medium">Akumulasi pengeluaran jajan</p>
              </div>
            </div>
          </div>

          {/* Transactions Log Section */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Mutasi Uang Jajan: {selectedSantri.name}</h3>
                <p className="text-xs text-slate-500">Seluruh catatan pemasukan dan pengeluaran uang jajan ananda</p>
              </div>
            </div>
            
            <div className="p-5">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1e3a5f]" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 font-medium">
                  Belum ada catatan mutasi uang jajan untuk ananda ini.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-5 py-3">Tanggal</th>
                          <th className="px-5 py-3">Transaksi</th>
                          <th className="px-5 py-3">Nominal</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/30">
                            <td className="px-5 py-4 whitespace-nowrap text-slate-400 font-mono">
                              {format(new Date(t.date), 'dd MMM yyyy', { locale: localeId })}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-slate-700 font-bold">{t.description}</p>
                              <p className="text-[9px] font-bold uppercase mt-0.5 text-slate-400">{t.type}</p>
                            </td>
                            <td className={`px-5 py-4 font-bold text-sm whitespace-nowrap ${t.type === 'Uang Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === 'Uang Masuk' ? '+' : '-'} {formatRupiah(t.amount)}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={
                                t.status === 'Paid' ? 'badge-green' : 
                                t.status === 'Pending' ? 'badge-yellow' : 'bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold px-3 py-1 rounded-full'
                              }>
                                {t.status === 'Paid' ? 'Disetujui' : t.status === 'Pending' ? 'Menunggu' : 'Ditolak'}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              {t.status === 'Pending' && (
                                <button
                                  onClick={() => handleCancelPending(t.id)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Batalkan Pengajuan"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Ajukan Top Up Modal */}
      {isTopUpModalOpen && selectedSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 font-display">Ajukan Deposit Uang Jajan</h3>
              <button onClick={() => setIsTopUpModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleRequestTopUp} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5">
                <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 leading-relaxed font-semibold">
                  Tuliskan nominal deposit yang telah dikirim beserta detail (Cth: transfer Bank BNI, atau dititipkan via cash saat sambangan). Admin/Pengurus akan memverifikasi pengajuan Anda.
                </p>
              </div>

              <div>
                <label className="form-label">Nominal Deposit (Rupiah)</label>
                <input
                  required
                  type="number"
                  placeholder="Contoh: 100000"
                  className="input-field"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Keterangan Transfer / Titipan</label>
                <input
                  type="text"
                  placeholder="Cth: Transfer BNI An. Ahmad Fauzi"
                  className="input-field"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
