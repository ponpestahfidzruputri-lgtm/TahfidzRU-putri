import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah } from '../../utils/format';
import { 
  Search, 
  Plus, 
  Check, 
  X, 
  Loader2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Clock, 
  Filter, 
  Trash2,
  ChevronRight,
  Info,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

export default function UangJajanManagement() {
  const { role } = useAuth();
  const isPengurus = role === 'pengurus';
  const { toast, showToast } = useToast();

  const [santri, setSantri] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'saldo' | 'persetujuan' | 'riwayat'>('saldo');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSantriForDetail, setSelectedSantriForDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form Fields
  const [formSantriId, setFormSantriId] = useState('');
  const [formType, setFormType] = useState<'Uang Masuk' | 'Uang Keluar'>('Uang Keluar');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Searchable Dropdown state
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [santriData, transactionData] = await Promise.all([
        dataService.getSantriList(),
        supabase.from('transactions').select('*, santri(name, nis, class_name)').order('date', { ascending: false })
      ]);
      setSantri(santriData || []);
      setTransactions(transactionData.data || []);
    } catch (err) {
      showToast('Gagal memuat data keuangan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSantriId || !formAmount || Number(formAmount) <= 0) {
      showToast('Mohon lengkapi formulir dengan benar', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        santri_id: formSantriId,
        amount: Number(formAmount),
        type: formType,
        status: 'Paid', // Admin/Pengurus direct input is marked as Paid
        description: formDescription.trim() || (formType === 'Uang Masuk' ? 'Deposit Uang Jajan' : 'Belanja / Jajan'),
        date: formDate
      };
      
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      
      showToast('Transaksi berhasil dicatat', 'success');
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      showToast('Gagal menyimpan transaksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').update({ status: 'Paid' }).eq('id', id);
      if (error) throw error;
      showToast('Pengajuan Top Up berhasil disetujui', 'success');
      fetchData();
    } catch (err) {
      showToast('Gagal menyetujui transaksi', 'error');
    }
  };

  const handleRejectTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').update({ status: 'Cancelled' }).eq('id', id);
      if (error) throw error;
      showToast('Pengajuan Top Up berhasil ditolak', 'success');
      fetchData();
    } catch (err) {
      showToast('Gagal menolak transaksi', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('Catatan transaksi berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      showToast('Gagal menghapus transaksi', 'error');
    }
  };

  const handleOpenEditModal = (t: any) => {
    setEditingTransaction(t);
    setFormSantriId(t.santri_id);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormDescription(t.description || '');
    setFormDate(t.date);
    setIsEditModalOpen(true);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    if (!formSantriId || !formAmount || Number(formAmount) <= 0) {
      showToast('Mohon lengkapi formulir dengan benar', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        santri_id: formSantriId,
        amount: Number(formAmount),
        type: formType,
        description: formDescription.trim() || (formType === 'Uang Masuk' ? 'Deposit Uang Jajan' : 'Belanja / Jajan'),
        date: formDate
      };
      
      const { error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingTransaction.id);
        
      if (error) throw error;
      
      showToast('Transaksi berhasil diperbarui', 'success');
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchData();
    } catch (err) {
      showToast('Gagal memperbarui transaksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormSantriId('');
    setFormType('Uang Keluar');
    setFormAmount('');
    setFormDescription('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setDropdownSearch('');
    setIsDropdownOpen(false);
  };

  // Calculations
  const activeTransactions = transactions.filter(t => t.status === 'Paid');
  const pendingTransactions = transactions.filter(t => t.status === 'Pending');
  
  const totalMasuk = activeTransactions
    .filter(t => t.type === 'Uang Masuk')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalKeluar = activeTransactions
    .filter(t => t.type === 'Uang Keluar')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const saldoMengendap = totalMasuk - totalKeluar;

  // Process balance per student
  const santriBalances = santri.map(s => {
    const studentTx = activeTransactions.filter(t => t.santri_id === s.id);
    const masuk = studentTx
      .filter(t => t.type === 'Uang Masuk')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const keluar = studentTx
      .filter(t => t.type === 'Uang Keluar')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const sisa = masuk - keluar;
    return { ...s, masuk, keluar, sisa };
  });

  // Filtered lists
  const classes = ['All', ...new Set(santri.map(s => s.class_name).filter(Boolean))];

  const filteredBalances = santriBalances.filter(s => {
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.santri?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.santri?.nis?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Toast />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Manajemen Uang Jajan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola deposit, persetujuan top-up, dan pengeluaran uang jajan santri</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={16} /> Tambah Transaksi
        </button>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Saldo Mengendap</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-none">{formatRupiah(saldoMengendap)}</h3>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Kas total uang jajan santri</p>
        </div>

        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ArrowUpRight size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Uang Masuk</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-none">{formatRupiah(totalMasuk)}</h3>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Akumulasi deposit disetujui</p>
        </div>

        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <ArrowDownRight size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Pengeluaran</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-none">{formatRupiah(totalKeluar)}</h3>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Total belanja / jajan santri</p>
        </div>

        <div className="card p-5 cursor-pointer" onClick={() => setActiveTab('persetujuan')}>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Persetujuan Top Up</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-none">{pendingTransactions.length} Pengajuan</h3>
          <p className="text-[10px] text-amber-600 mt-1.5 font-bold">Verifikasi transfer wali santri</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-200/60 p-1 rounded-2xl max-w-lg gap-1 border border-slate-100">
        <button
          onClick={() => {
            setActiveTab('saldo');
            setSearchTerm('');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'saldo' ? 'bg-[#1e3a5f] text-white shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Saldo Santri
        </button>
        <button
          onClick={() => {
            setActiveTab('persetujuan');
            setSearchTerm('');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'persetujuan' ? 'bg-[#1e3a5f] text-white shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Persetujuan
          {pendingTransactions.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {pendingTransactions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('riwayat');
            setSearchTerm('');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'riwayat' ? 'bg-[#1e3a5f] text-white shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Semua Transaksi
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="card p-12 flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
            <p className="text-sm text-slate-500 font-medium">Memuat data keuangan...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'saldo' && (
            <div className="space-y-4">
              {/* Search & Class Filter */}
              <div className="card p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari santri berdasarkan nama atau NIS..."
                    className="input-field pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative min-w-[150px]">
                  <select
                    className="input-field pr-9 appearance-none"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    {classes.map(c => (
                      <option key={c} value={c}>{c === 'All' ? 'Semua Kelas' : `Kelas ${c}`}</option>
                    ))}
                  </select>
                  <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama & NIS</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kelas</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Masuk</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Saldo</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredBalances.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                            Tidak ada santri yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredBalances.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIS: {s.nis}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <span className="badge-blue">Kelas {s.class_name || '-'}</span>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-semibold text-emerald-600 text-sm">
                              {formatRupiah(s.masuk)}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-semibold text-rose-600 text-sm">
                              {formatRupiah(s.keluar)}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-bold text-slate-800 text-sm">
                              <span className={s.sisa < 0 ? 'text-rose-500' : s.sisa === 0 ? 'text-slate-400' : 'text-[#1e3a5f]'}>
                                {formatRupiah(s.sisa)}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-right">
                              <button
                                onClick={() => {
                                  setSelectedSantriForDetail(s);
                                  setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                              >
                                Detail <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'persetujuan' && (
            <div className="space-y-4">
              {/* Alert pending count */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm">
                <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-sm text-amber-800">Verifikasi Pembayaran</h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed font-medium">
                    Di bawah ini adalah daftar pengajuan titipan uang jajan yang diajukan oleh Wali Santri. Harap periksa mutasi rekening Anda secara manual sebelum menyetujui.
                  </p>
                </div>
              </div>

              {/* Pending Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Santri</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nominal</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan Transfer</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pendingTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                            Tidak ada pengajuan top up yang membutuhkan persetujuan.
                          </td>
                        </tr>
                      ) : (
                        pendingTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{t.santri?.name}</p>
                                <p className="text-[10px] text-slate-400">Kelas {t.santri?.class_name || '-'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                              {format(new Date(t.date), 'dd MMM yyyy', { locale: localeId })}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-bold text-emerald-600 text-sm">
                              {formatRupiah(t.amount)}
                            </td>
                            <td className="px-6 py-4.5 text-xs text-slate-600 font-medium max-w-xs truncate">
                              {t.description || 'Deposit Uang Jajan'}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-right flex items-center justify-end gap-2 mt-2">
                              <button
                                onClick={() => handleApproveTransaction(t.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-100 rounded-lg text-xs font-bold transition-all"
                              >
                                <Check size={14} /> Setujui
                              </button>
                              <button
                                onClick={() => handleRejectTransaction(t.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-100 rounded-lg text-xs font-bold transition-all"
                              >
                                <X size={14} /> Tolak
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'riwayat' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="card p-4 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama santri..."
                    className="input-field pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="relative min-w-[130px] flex-1 md:flex-initial">
                    <select
                      className="input-field pr-9 appearance-none text-xs"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="All">Semua Tipe</option>
                      <option value="Uang Masuk">Uang Masuk</option>
                      <option value="Uang Keluar">Uang Keluar</option>
                    </select>
                    <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative min-w-[130px] flex-1 md:flex-initial">
                    <select
                      className="input-field pr-9 appearance-none text-xs"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">Semua Status</option>
                      <option value="Paid">Berhasil</option>
                      <option value="Pending">Menunggu</option>
                      <option value="Cancelled">Dibatalkan</option>
                    </select>
                    <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Santri</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nominal</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                            Belum ada riwayat transaksi.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <p className="text-sm font-bold text-slate-800">{t.santri?.name || '-'}</p>
                              <p className="text-[10px] text-slate-400">NIS: {t.santri?.nis || '-'}</p>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                              {format(new Date(t.date), 'dd MMM yyyy', { locale: localeId })}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <span className={t.type === 'Uang Masuk' ? 'text-emerald-600 font-bold text-xs flex items-center gap-1' : 'text-rose-600 font-bold text-xs flex items-center gap-1'}>
                                {t.type === 'Uang Masuk' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                {t.type}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-bold text-slate-800 text-sm">
                              {formatRupiah(t.amount)}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-xs">
                              <span className={
                                t.status === 'Paid' ? 'badge-green' : 
                                t.status === 'Pending' ? 'badge-yellow' : 'bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold px-3 py-1 rounded-full'
                              }>
                                {t.status === 'Paid' ? 'Selesai' : t.status === 'Pending' ? 'Menunggu' : 'Batal'}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-slate-600 font-medium max-w-xs truncate">
                              {t.description || '-'}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-right flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-[#1e3a5f] rounded-lg transition-colors"
                                title="Edit catatan transaksi"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                title="Hapus catatan transaksi"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Catat Transaksi Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              {/* Searchable Santri Selection */}
              <div className="relative" ref={dropdownRef}>
                <label className="form-label">Pilih Santri</label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="input-field flex items-center justify-between cursor-pointer bg-white"
                >
                  <span className={formSantriId ? 'text-slate-800 font-medium text-xs' : 'text-slate-400 text-xs'}>
                    {formSantriId 
                      ? (santri.find(s => s.id === formSantriId)?.name || 'Santri Terpilih') 
                      : '-- Pilih Santri --'}
                  </span>
                  <ChevronRight size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-60 animate-fade-in">
                    {/* Search box */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari nama atau NIS santri..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-3 focus:outline-none focus:border-[#1e3a5f]"
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Prevent closing dropdown
                        />
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto max-h-44 custom-scrollbar text-xs">
                      {(() => {
                        const filtered = santri.filter(s => 
                          s.name.toLowerCase().includes(dropdownSearch.toLowerCase()) || 
                          (s.nis && s.nis.toLowerCase().includes(dropdownSearch.toLowerCase()))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center text-slate-400">
                              Santri tidak ditemukan
                            </div>
                          );
                        }

                        return filtered.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setFormSantriId(s.id);
                              setIsDropdownOpen(false);
                              setDropdownSearch('');
                            }}
                            className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0 ${
                              formSantriId === s.id ? 'bg-blue-50/50 font-bold text-[#1e3a5f]' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-semibold">{s.name}</p>
                              <p className="text-[10px] text-slate-400">NIS: {s.nis || '-'}</p>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {s.class_name ? `Kelas ${s.class_name}` : 'Tanpa Kelas'}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Type Selection */}
              <div>
                <label className="form-label">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType('Uang Keluar')}
                    className={`py-3.5 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      formType === 'Uang Keluar' 
                        ? 'border-rose-500 bg-rose-50/50 text-rose-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <ArrowDownRight size={15} /> Uang Keluar (Jajan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Uang Masuk')}
                    className={`py-3.5 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      formType === 'Uang Masuk' 
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <ArrowUpRight size={15} /> Uang Masuk (Deposit)
                  </button>
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="form-label">Nominal (Rupiah)</label>
                <input
                  required
                  type="number"
                  placeholder="Contoh: 15000"
                  className="input-field"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>

              {/* Date */}
              <div>
                <label className="form-label">Tanggal</label>
                <input
                  required
                  type="date"
                  className="input-field text-slate-700 font-semibold"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder={formType === 'Uang Masuk' ? 'Cth: Titipan cash orang tua' : 'Cth: Jajan roti & es teh'}
                  className="input-field"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Edit Transaksi</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTransaction} className="p-6 space-y-4">
              {/* Santri Selection */}
              <div>
                <label className="form-label">Santri</label>
                <select
                  required
                  className="input-field bg-slate-50 pointer-events-none"
                  value={formSantriId}
                  onChange={(e) => setFormSantriId(e.target.value)}
                  disabled
                >
                  {santri.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Type Selection */}
              <div>
                <label className="form-label">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType('Uang Keluar')}
                    className={`py-3.5 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      formType === 'Uang Keluar' 
                        ? 'border-rose-500 bg-rose-50/50 text-rose-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <ArrowDownRight size={15} /> Uang Keluar (Jajan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Uang Masuk')}
                    className={`py-3.5 px-4 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      formType === 'Uang Masuk' 
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <ArrowUpRight size={15} /> Uang Masuk (Deposit)
                  </button>
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="form-label">Nominal (Rupiah)</label>
                <input
                  required
                  type="number"
                  placeholder="Contoh: 15000"
                  className="input-field"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>

              {/* Date */}
              <div>
                <label className="form-label">Tanggal</label>
                <input
                  required
                  type="date"
                  className="input-field text-slate-700 font-semibold"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder={formType === 'Uang Masuk' ? 'Cth: Titipan cash orang tua' : 'Cth: Jajan roti & es teh'}
                  className="input-field"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
                  className="btn-secondary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-3 text-xs md:text-sm font-bold"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Perbarui Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail Modal (Personal Transaction Log) */}
      {isDetailModalOpen && selectedSantriForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Riwayat Uang Jajan: {selectedSantriForDetail.name}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">NIS: {selectedSantriForDetail.nis} &bull; Kelas {selectedSantriForDetail.class_name || '-'}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* Financial summary for this specific student */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Total Masuk</p>
                  <p className="text-sm font-extrabold text-emerald-600">{formatRupiah(selectedSantriForDetail.masuk)}</p>
                </div>
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100">
                  <p className="text-[9px] font-bold text-rose-700 uppercase tracking-wider mb-0.5">Total Pengeluaran</p>
                  <p className="text-sm font-extrabold text-rose-600">{formatRupiah(selectedSantriForDetail.keluar)}</p>
                </div>
                <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-100">
                  <p className="text-[9px] font-bold text-[#0d557c] uppercase tracking-wider mb-0.5">Sisa Saldo</p>
                  <p className="text-sm font-extrabold text-[#0d557c]">{formatRupiah(selectedSantriForDetail.sisa)}</p>
                </div>
              </div>

              {/* Transactions log of this student */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <History size={15} className="text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mutasi Rekening Uang Jajan</h4>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Keterangan</th>
                        <th className="px-4 py-3">Nominal</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {transactions.filter(t => t.santri_id === selectedSantriForDetail.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">
                            Belum ada catatan mutasi untuk santri ini.
                          </td>
                        </tr>
                      ) : (
                        transactions
                          .filter(t => t.santri_id === selectedSantriForDetail.id)
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-medium">
                                {format(new Date(t.date), 'dd MMM yyyy', { locale: localeId })}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">
                                <span className="block">{t.description}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">{t.type}</span>
                              </td>
                              <td className={`px-4 py-3 font-bold whitespace-nowrap ${t.type === 'Uang Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'Uang Masuk' ? '+' : '-'} {formatRupiah(t.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={
                                  t.status === 'Paid' ? 'badge-green scale-95 origin-left inline-block' : 
                                  t.status === 'Pending' ? 'badge-yellow scale-95 origin-left inline-block' : 'bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block'
                                }>
                                  {t.status === 'Paid' ? 'Selesai' : t.status === 'Pending' ? 'Menunggu' : 'Batal'}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  resetForm();
                  setFormSantriId(selectedSantriForDetail.id);
                  setIsAddModalOpen(true);
                }}
                className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus size={14} /> Catat Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
