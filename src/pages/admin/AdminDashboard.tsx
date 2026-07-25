import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { Users, BookOpen, Clock, ChevronRight, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';

const safeDate = (dateStr: string) => {
  try {
    if (!dateStr) return null;
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(dateStr + 'T00:00:00');
  } catch { return null; }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await dataService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Santri',
      value: stats?.santriCount || 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
      trend: '+2 bulan ini'
    },
    {
      label: 'Total Pengguna',
      value: stats?.userCount || 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
      trend: 'Aktif sistem'
    },
    {
      label: 'Setoran Hari Ini',
      value: stats?.recentTahfidz?.length || 0,
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
      trend: 'Tahfidz masuk'
    },
    {
      label: 'Persetujuan Top Up',
      value: stats?.pendingTransactions || 0,
      icon: Wallet,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
      trend: 'Perlu verifikasi'
    }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Dashboard Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan data operasional Pesantren Roudhlatul Ulum</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-100 shadow-sm self-start sm:self-auto">
          <Clock size={15} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="card p-4 md:p-5"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", card.iconBg)}>
              <card.icon size={17} className={cn("", card.color.split(' ')[1])} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">{card.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">{card.value}</h3>
            <p className="text-[10px] text-slate-400 font-medium">{card.trend}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Log Tahfidz */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div>
              <h3 className="section-title">Log Tahfidz</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Setoran terbaru yang masuk</p>
            </div>
            <Link
              to="/admin/tahfidz"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#1e3a5f] hover:text-[#2d5a9e] transition-colors"
            >
              Lihat semua
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Santri</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Surah</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Halaman</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Jenis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.recentTahfidz?.length > 0 ? (
                  stats.recentTahfidz.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-800 whitespace-nowrap">{item.santri?.name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{item.surah?.startsWith('Jilid') ? item.surah : `QS. ${item.surah}`}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono hidden sm:table-cell">
                        {item.surah?.startsWith('Jilid') ? 'Materi' : `${item.from_ayat}–${item.to_ayat}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          item.type === 'Setoran Baru' ? "badge-green" : "badge-blue"
                        )}>
                          {item.type}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                      Belum ada setoran tahfidz hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agenda */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-50">
            <Calendar size={16} className="text-slate-400" />
            <h3 className="section-title">Agenda Mendatang</h3>
          </div>
          <div className="p-4 space-y-3">
            {(stats?.upcomingAgenda || []).filter((item: any) => item.date).length > 0 ? (
              <div className="space-y-3">
                {(stats?.upcomingAgenda || []).filter((item: any) => item.date).map((item: any) => {
                  const rawDate = typeof item.date === 'string' ? item.date.split('T')[0] : String(item.date);
                  const d = new Date(rawDate + 'T00:00:00');
                  if (isNaN(d.getTime())) return null;
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex-shrink-0 w-11 h-11 bg-[#1e3a5f]/5 rounded-xl flex flex-col items-center justify-center border border-[#1e3a5f]/10">
                        <span className="text-[8px] font-semibold text-[#1e3a5f] uppercase leading-none">
                          {format(d, 'MMM', { locale: id })}
                        </span>
                        <span className="text-base font-bold text-[#1e3a5f] leading-tight">
                          {format(d, 'dd')}
                        </span>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h4 className="text-sm font-semibold text-slate-800 leading-tight truncate">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.location || 'Area Pesantren'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <Calendar size={22} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Belum ada agenda terjadwal</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
