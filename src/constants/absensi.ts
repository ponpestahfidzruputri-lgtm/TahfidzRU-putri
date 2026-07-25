import { CAMPUS_ABSENSI_SESSIONS } from './campus';

export const ABSENSI_SESSIONS = CAMPUS_ABSENSI_SESSIONS;
export type AbsensiSession = (typeof ABSENSI_SESSIONS)[number];

export const DEFAULT_ABSENSI_SESSION: AbsensiSession = 'Shubuh';

export const SHOLAT_BERJAMAAH_SESSIONS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;
export type SholatBerjamaahSession = (typeof SHOLAT_BERJAMAAH_SESSIONS)[number];
export const DEFAULT_BERJAMAAH_SESSION: SholatBerjamaahSession = 'Subuh';
