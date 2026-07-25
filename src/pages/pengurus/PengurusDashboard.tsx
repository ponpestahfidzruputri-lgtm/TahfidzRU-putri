import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { supabase } from '../../lib/supabase';
import { Users, Clock, Calendar, Wallet, CheckCircle2, ChevronRight, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { Link, useNavigate } from 'react-router-dom';

export default function PengurusDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [absensiStats, setAbsensiStats] = useState({ total: 0, hadir: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [dashboardStats, absensiToday] = await Promise.all([
          dataService.getDashboardStats(),
          dataService.getAbsensiList(today, undefined, 'berjamaah')
        ]);
        
        setStats(dashboardStats);
        
        if (absensiToday) {
          const total = absensiToday.length;
          const hadir = absensiToday.filter((a: any) => a.status === 'Hadir').length;
          setAbsensiStats({ total, hadir });
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  const quickActions = [
    {
      title: 'Presensi Jamaah',
      desc: 'Input kehadiran sholat berjamaah',
      icon: CheckCircle2,
      path: '/pengurus/absensi',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50'
    },
    {
      title: 'Uang Jajan',
      desc: 'Input tabungan & pengeluaran santri',
      icon: Wallet,
      path: '/pengurus/uang-jajan',
      color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Portal Pengurus</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola absensi jamaah masjid dan kas uang jajan santri</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-100 shadow-sm self-start sm:self-auto">
          <Clock size={15} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card p-5"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Users size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Santri</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats?.santriCount || 0} Anak</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Aktif mondok</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="card p-5 cursor-pointer"
          onClick={() => navigate('/pengurus/uang-jajan')}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Persetujuan Top Up</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats?.pendingTransactions || 0} Pengajuan</h3>
          <p className="text-[10px] text-amber-600 mt-1 font-bold">Butuh verifikasi &rarr;</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="card p-5 cursor-pointer"
          onClick={() => navigate('/pengurus/absensi')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hadir Sholat Jamaah</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {absensiStats.total > 0 ? `${absensiStats.hadir} / ${absensiStats.total}` : 'Belum Input'}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Hari ini</p>
        </motion.div>
      </div>

      {/* Quick Actions & Agenda Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Menu Cepat Pengurus</h3>
            <p className="text-xs text-slate-400">Pilih salah satu menu di bawah untuk menginput data</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={action.title}
                to={action.path}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5",
                  action.color
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <action.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{action.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Agenda */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-50">
            <Calendar size={16} className="text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">Agenda Pesantren</h3>
          </div>
          <div className="p-4 space-y-3">
            {(stats?.upcomingAgenda || []).filter((item: any) => item.date).length > 0 ? (
              <div className="space-y-3">
                {(stats?.upcomingAgenda || []).filter((item: any) => item.date).map((item: any) => {
                  const rawDate = typeof item.date === 'string' ? item.date.split('T')[0] : String(item.date);
                  const d = new Date(rawDate + 'T00:00:00');
                  if (isNaN(d.getTime())) return null;
                  return (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
                      <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">{format(d, 'MMM')}</span>
                        <span className="text-sm font-extrabold text-slate-700 leading-tight mt-0.5">{format(d, 'd')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 truncate leading-snug">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.location || 'Di Kompleks Pesantren'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">
                Belum ada agenda terdekat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
