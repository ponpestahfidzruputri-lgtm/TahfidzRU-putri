import { CAMPUS_ABSENSI_SESSIONS } from './campus';

export const ABSENSI_SESSIONS = CAMPUS_ABSENSI_SESSIONS;
export type AbsensiSession = (typeof ABSENSI_SESSIONS)[number];

export const DEFAULT_ABSENSI_SESSION: AbsensiSession = 'Shubuh';
