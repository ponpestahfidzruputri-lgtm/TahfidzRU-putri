import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  GraduationCap, 
  Settings, 
  LogOut,
  UserCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
  FileText,
  Image,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  role: 'admin' | 'pengajar' | 'wali';
  onClose?: () => void;
}

export function Sidebar({ role, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();

  const menuItems = {
    admin: [
      { path: '/admin', icon: LayoutDashboard, label: 'Dasbor Utama' },
      { path: '/admin/santri', icon: Users, label: 'Data Santri' },
      { path: '/admin/absensi', icon: ClipboardCheck, label: 'Presensi' },
      { path: '/admin/rekap-laporan', icon: FileText, label: 'Laporan Terpadu' },
      { path: '/admin/tahfidz', icon: BookOpen, label: 'Buku Tahfidz' },
      { path: '/admin/nilai', icon: GraduationCap, label: 'Nilai Akademik' },
      { path: '/admin/agenda', icon: Calendar, label: 'Agenda Acara' },
      { path: '/admin/konten', icon: Image, label: 'Konten Website' },
      { path: '/admin/approval', icon: UserCheck, label: 'Persetujuan Akun' },
    ],
    pengajar: [
      { path: '/pengajar', icon: LayoutDashboard, label: 'Dasbor Kelas' },
      { path: '/pengajar/absensi', icon: ClipboardCheck, label: 'Isi Presensi' },
      { path: '/pengajar/tahfidz', icon: BookOpen, label: 'Input Setoran' },
      { path: '/pengajar/naikkan-tingkat', icon: TrendingUp, label: 'Naikkan Tingkat' },
      { path: '/pengajar/agenda', icon: Calendar, label: 'Agenda Acara' },
    ],
    wali: [
      { path: '/wali', icon: LayoutDashboard, label: 'Beranda' },
      { path: '/wali/absensi', icon: ClipboardCheck, label: 'Kehadiran Ananda' },
      { path: '/wali/hafalan', icon: BookOpen, label: 'Perkembangan Hafalan' },
      { path: '/wali/agenda', icon: Calendar, label: 'Jadwal Acara' },
      { path: '/wali/profil', icon: Users, label: 'Profil Lengkap' },
    ]
  };

  const roleLabel = {
    admin: 'Administrator',
    pengajar: 'Guru / Asatidz',
    wali: 'Wali Santri'
  };

  const currentMenu = menuItems[role] || [];

  return (
    <div className={cn(
      "h-full bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-50 bg-white sticky top-0 z-10">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-pesantren-yellow rounded-full blur-sm opacity-50"></div>
                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full relative z-10 bg-white p-0.5 object-contain" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=RU&background=A4C95A&color=fff'; }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate">Roudlotul 'Ulum</p>
                <p className="text-[9px] text-pesantren-blue font-bold uppercase tracking-widest leading-tight mt-0.5">{roleLabel[role]}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-pesantren-green transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2 mb-1">
            Menu Akses
          </p>
        )}
        {currentMenu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative",
                isActive
                  ? "bg-pesantren-green/10 text-pesantren-dark"
                  : "text-slate-500 hover:bg-slate-50 hover:text-pesantren-green"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                 <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pesantren-green rounded-r-full"></motion.div>
              )}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 flex-shrink-0",
                isActive ? "bg-pesantren-green text-pesantren-dark shadow-sm" : "text-slate-400 group-hover:text-pesantren-green"
              )}>
                 <item.icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
              </div>
              
              {!collapsed && (
                <span className={cn(
                  "text-sm whitespace-nowrap transition-all duration-300",
                  isActive ? "font-bold text-pesantren-dark" : "font-medium"
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Area */}
      <div className="p-4 border-t border-slate-50 bg-slate-50/50">
         <button
          onClick={() => { signOut(); onClose?.(); }}
          className={cn(
            "flex items-center gap-3 w-full p-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 group",
            collapsed ? "justify-center" : "justify-start"
          )}
          title={collapsed ? "Keluar Sistem" : undefined}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
            <LogOut size={18} className="transition-transform duration-300 group-hover:-translate-x-1" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold">Keluar Sistem</span>
          )}
        </button>
      </div>
    </div>
  );
}
