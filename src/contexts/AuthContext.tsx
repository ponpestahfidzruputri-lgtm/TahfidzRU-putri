import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'admin' | 'pengurus' | 'pengajar' | 'wali' | null;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  sessionExpired: boolean;
  inactivityWarning: boolean;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_LIMIT = 30 * 60 * 1000;
const WARNING_BEFORE = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'pengurus' | 'pengajar' | 'wali' | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const roleRequestId = useRef(0);
  const lastActivity = useRef(Date.now());
  const warningShown = useRef(false);
  const timerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (warningTimerRef.current) { window.clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
  }, []);

  const scheduleInactivityCheck = useCallback(() => {
    clearTimers();
    warningShown.current = false;
    setInactivityWarning(false);

    const now = Date.now();
    const timeSinceActivity = now - lastActivity.current;
    const timeToWarning = INACTIVITY_LIMIT - WARNING_BEFORE - timeSinceActivity;
    const timeToExpiry = INACTIVITY_LIMIT - timeSinceActivity;

    if (timeToWarning <= 0 && timeToExpiry > 0) {
      setInactivityWarning(true);
      warningShown.current = true;
    }

    if (timeToExpiry <= 0) {
      setSessionExpired(true);
      supabase.auth.signOut();
      return;
    }

    if (timeToWarning > 0) {
      warningTimerRef.current = window.setTimeout(() => {
        if (!warningShown.current) {
          warningShown.current = true;
          setInactivityWarning(true);
        }
      }, timeToWarning);
    }

    timerRef.current = window.setTimeout(() => {
      setSessionExpired(true);
      supabase.auth.signOut();
    }, timeToExpiry);
  }, [clearTimers]);

  const resetInactivityTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setSessionExpired(false);
    scheduleInactivityCheck();
  }, [scheduleInactivityCheck]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchRole = async (userId: string) => {
      const requestId = ++roleRequestId.current;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (!mounted || requestId !== roleRequestId.current) return;

        if (error) throw error;
        setRole((data?.role as AuthContextType['role']) ?? null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (mounted && requestId === roleRequestId.current) {
          setRole(null);
        }
      } finally {
        if (mounted && requestId === roleRequestId.current) {
          setLoading(false);
        }
      }
    };

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setSessionExpired(false);
      if (nextSession?.user) {
        setLoading(true);
        fetchRole(nextSession.user.id);
      } else {
        roleRequestId.current += 1;
        setRole(null);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mounted) { setLoading(false); return; }
      if (error || !initialSession) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setRole(null);
        setSessionExpired(error ? true : false);
        setLoading(false);
        return;
      }
      applySession(initialSession);
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        setSessionExpired(false);
        return;
      }
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!user) return;
    const events: (keyof DocumentEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => { lastActivity.current = Date.now(); if (inactivityWarning) setInactivityWarning(false); };
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    scheduleInactivityCheck();
    return () => { events.forEach(e => document.removeEventListener(e, handler)); clearTimers(); };
  }, [user, scheduleInactivityCheck, clearTimers]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signOut, isConfigured: isSupabaseConfigured, sessionExpired, inactivityWarning, resetInactivityTimer }}>
      <InactivityOverlay expired={sessionExpired} warning={inactivityWarning} onExtend={resetInactivityTimer} onLogout={signOut} />
      <NotificationSpring />
      {children}
    </AuthContext.Provider>
  );
}

function InactivityOverlay({ expired, warning, onExtend, onLogout }: { expired: boolean; warning: boolean; onExtend: () => void; onLogout: () => Promise<void> }) {
  if (!expired && !warning) return null;
  if (expired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div className="card p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m8-10V4a2 2 0 00-2-2H8a2 2 0 00-2 2v4m16 0h2a2 2 0 012 2v4a2 2 0 01-2 2h-2" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Sesi Berakhir</h3>
          <p className="text-sm text-slate-500 mb-5">Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.</p>
          <button onClick={() => { onLogout(); }} className="btn-primary w-full">Login Kembali</button>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed bottom-4 right-4 z-[90] max-w-sm">
      <div className="card p-4 border-amber-200 bg-amber-50 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Sesi Akan Berakhir</p>
            <p className="text-xs text-amber-600 mt-0.5">Anda belum aktif selama beberapa menit. Sesi akan berakhir dalam 5 menit.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onExtend} className="btn-primary flex-1 text-xs py-2">Tetap Masuk</button>
          <button onClick={onLogout} className="btn-secondary flex-1 text-xs py-2">Logout</button>
        </div>
      </div>
    </div>
  );
}

function NotificationSpring() {
  const { inactivityWarning, resetInactivityTimer } = useAuth();
  useEffect(() => {
    if (!inactivityWarning) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [inactivityWarning]);
  useEffect(() => {
    if (!inactivityWarning || !('Notification' in window) || Notification.permission !== 'granted') return;
    const t = window.setTimeout(() => { new Notification('Pengingat Login', { body: 'Sesi akan berakhir dalam 5 menit. Klik untuk tetap masuk.', silent: false, requireInteraction: true, icon: '/favicon.ico' }); }, 2000);
    return () => window.clearTimeout(t);
  }, [inactivityWarning]);
  return null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
