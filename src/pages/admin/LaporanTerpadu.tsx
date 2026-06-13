import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/data';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Printer, Loader2, Users, BookOpen, GraduationCap, ClipboardCheck, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  CAMPUS_ABSENSI_SESSIONS,
  CAMPUS_LABEL,
  createEmptySessionStats,
  type CampusAbsensiSession,
} from '../../constants/campus';

export default function LaporanTerpadu() {
  const [reportType, setReportType] = useState<'keseluruhan' | 'satu-santri' | 'rekap-presensi' | 'rekap-setoran'>('keseluruhan');
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  
  const [recapPeriod, setRecapPeriod] = useState<'month' | 'year'>('month');
  const [recapMonth, setRecapMonth] = useState(new Date().getMonth() + 1);
  const [recapYear, setRecapYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState('All');
  const [loading, setLoading] = useState(false);

  const [santriList, setSantriList] = useState<any[]>([]);
  const [absensiLogs, setAbsensiLogs] = useState<any[]>([]);
  const [tahfidzLogs, setTahfidzLogs] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const { toast, showToast } = useToast();

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [santris, absensi, tahfidz, grades] = await Promise.all([
        dataService.getSantriList(),
        dataService.getAbsensiRecap(recapPeriod, recapYear, recapPeriod === 'month' ? recapMonth : undefined),
        dataService.getTahfidzRecap(recapPeriod, recapYear, recapPeriod === 'month' ? recapMonth : undefined),
        supabase.from('nilai').select('*, kurikulum(subject)')
      ]);

      setSantriList(santris || []);
      setAbsensiLogs(absensi || []);
      setTahfidzLogs(tahfidz || []);
      setGradesList(grades.data || []);
    } catch (err) {
      showToast('Gagal memuat data laporan terpadu. Periksa koneksi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const classes = ['All', ...new Set(santriList.map(s => s.class_name).filter(Boolean))];

  // Process data per student
  const thirdSession = CAMPUS_ABSENSI_SESSIONS[2];

  const processedData = santriList
    .filter(s => selectedClass === 'All' || s.class_name === selectedClass)
    .map(student => {
      const studentAbsensi = absensiLogs.filter(a => a.santri_id === student.id);
      const attendanceSummary = createEmptySessionStats();

      studentAbsensi.forEach(a => {
        const session = a.session as CampusAbsensiSession;
        if (attendanceSummary[session]) {
          attendanceSummary[session].total++;
          if (a.status === 'Hadir') attendanceSummary[session].hadir++;
          else if (a.status === 'Izin') attendanceSummary[session].izin++;
          else if (a.status === 'Sakit') attendanceSummary[session].sakit++;
          else if (a.status === 'Alpa') attendanceSummary[session].alpa++;
        }
      });

      // Filter student's tahfidz setoran records
      const studentTahfidz = tahfidzLogs.filter(t => t.santri_id === student.id);
      
      // Get latest setoran details
      const sortedTahfidz = [...studentTahfidz].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      const latestSetoran = sortedTahfidz.length > 0 ? sortedTahfidz[0] : null;

      const setoranBaruCount = studentTahfidz.filter(t => t.type === 'Setoran Baru').length;
      const murojaahCount = studentTahfidz.filter(t => t.type === 'Murojaah').length;

      return {
        ...student,
        attendanceSummary,
        tahfidzCount: studentTahfidz.length,
        setoranBaruCount,
        murojaahCount,
        latestSetoran
      };
    });

  const getMonthName = (m: number) => {
    return format(new Date(2000, m - 1, 1), 'MMMM', { locale: id });
  };

  const getPeriodLabel = () => {
    return recapPeriod === 'month' 
      ? `Bulan ${getMonthName(recapMonth)} ${recapYear}`
      : `Tahun ${recapYear}`;
  };

  const getAbsensiRecapGrouped = () => {
    const grouped: Record<string, { name: string; nis: string; class_name: string; sessions: Record<'Shubuh' | 'Ashar' | 'Maghrib' | 'Isya', { hadir: number; izin: number; sakit: number; alpa: number; total: number }> }> = {};
    absensiLogs.forEach((r: any) => {
      const sid = r.santri_id;
      if (!grouped[sid]) {
        grouped[sid] = {
          name: r.santri?.name || '-',
          nis: r.santri?.nis || '-',
          class_name: r.santri?.class_name || '-',
          sessions: {
            Shubuh: { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
            Ashar: { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
            Maghrib: { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
            Isya: { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 }
          }
        };
      }
      const sess = r.session as 'Shubuh' | 'Ashar' | 'Maghrib' | 'Isya';
      if (grouped[sid].sessions[sess]) {
        grouped[sid].sessions[sess].total++;
        if (r.status === 'Hadir') grouped[sid].sessions[sess].hadir++;
        else if (r.status === 'Izin') grouped[sid].sessions[sess].izin++;
        else if (r.status === 'Sakit') grouped[sid].sessions[sess].sakit++;
        else if (r.status === 'Alpa') grouped[sid].sessions[sess].alpa++;
      }
    });

    const list = Object.values(grouped)
      .filter(s => selectedClass === 'All' || s.class_name === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name));
    return list;
  };

  const filteredTahfidzLogs = tahfidzLogs.filter(
    (t: any) => selectedClass === 'All' || t.santri?.class_name === selectedClass
  );

  // Word Export for Collective Report
  const exportToWord = () => {
    const periodLabel = getPeriodLabel();
    let rowsHtml = '';
    
    processedData.forEach((row, idx) => {
      const shubuh = `${row.attendanceSummary.Shubuh.hadir}/${row.attendanceSummary.Shubuh.total}`;
      const ashar = `${row.attendanceSummary.Ashar.hadir}/${row.attendanceSummary.Ashar.total}`;
      const thirdSess = `${row.attendanceSummary[thirdSession].hadir}/${row.attendanceSummary[thirdSession].total}`;
      
      const latestStr = row.latestSetoran 
        ? `${row.latestSetoran.surah} Halaman ${row.latestSetoran.from_ayat}-${row.latestSetoran.to_ayat} (${row.latestSetoran.fluency})` 
        : '-';

      const levelStr = row.tahfidz_level === 'bilghoib' ? 'Bil Ghoib' : 'Bin Nadzhor';

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${row.name}<br/><span style="color: #666; font-size: 10px;">NIS: ${row.nis}</span></td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.class_name || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${levelStr}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${shubuh}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${ashar}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${thirdSess}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.setoranBaruCount} / ${row.murojaahCount}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-size: 11px;">${latestStr}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Laporan Perkembangan Santri</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; }
          h2 { text-align: center; margin-bottom: 5px; }
          h3 { text-align: center; margin-top: 0; color: #555; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold; text-align: center; }
          td { border: 1px solid #ddd; padding: 8px; }
          .footer { margin-top: 40px; text-align: right; }
        </style>
      </head>
      <body>
        <h2>LAPORAN PERKEMBANGAN SANTRI TERPADU</h2>
        <h3>PONDOK PESANTREN ROUDHLATUL ULUM</h3>
        <p style="text-align: center; font-weight: bold;">Periode: ${periodLabel} | Rombel: ${selectedClass === 'All' ? 'Semua Kelas' : selectedClass} (Santri ${CAMPUS_LABEL})</p>
        
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%">No</th>
              <th rowspan="2" style="width: 20%">Nama Santri</th>
              <th rowspan="2" style="width: 10%">Kelas</th>
              <th rowspan="2" style="width: 10%">Tingkat</th>
              <th colspan="3">Presensi Sesi (Hadir/Total)</th>
              <th colspan="2">Perkembangan Tahfidz</th>
            </tr>
            <tr>
              <th>Shubuh</th>
              <th>Ashar</th>
              <th>${thirdSession}</th>
              <th>Baru / Murojaah</th>
              <th>Setoran Terakhir</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>Bandung Barat, ${format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
          <br/><br/><br/>
          <p><strong>Ustadz Pembimbing</strong></p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Terpadu_Santri_${periodLabel.replace(/\s+/g, '_')}.doc`;
    a.click();
    showToast('Laporan Word berhasil diunduh', 'success');
  };

  // Word Export for Individual Rapor
  const exportIndividualToWord = (student: any, studentGrades: any[]) => {
    const periodLabel = getPeriodLabel();
    const shubuh = student.attendanceSummary.Shubuh;
    const ashar = student.attendanceSummary.Ashar;
    const thirdSessData = student.attendanceSummary[thirdSession];

    const shubuhStr = `${shubuh.hadir}/${shubuh.total}`;
    const asharStr = `${ashar.hadir}/${ashar.total}`;
    const thirdSessStr = `${thirdSessData.hadir}/${thirdSessData.total}`;

    const totalHadir = shubuh.hadir + ashar.hadir + thirdSessData.hadir;
    const totalSession = shubuh.total + ashar.total + thirdSessData.total;
    const attendancePercentage = totalSession > 0 ? Math.round((totalHadir / totalSession) * 100) : 0;

    let gradesRowsHtml = '';
    if (studentGrades.length > 0) {
      studentGrades.forEach((g, idx) => {
        gradesRowsHtml += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${g.kurikulum?.subject || 'Mata Pelajaran'}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; font-size: 13px;">${g.score}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${g.description || '-'}</td>
          </tr>
        `;
      });
    } else {
      gradesRowsHtml = `<tr><td colspan="4" style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #888; font-style: italic;">Belum ada nilai akademik pada periode ini</td></tr>`;
    }

    const studentTahfidz = tahfidzLogs.filter(t => t.santri_id === student.id);
    let tahfidzRowsHtml = '';
    if (studentTahfidz.length > 0) {
      studentTahfidz.forEach((t, idx) => {
        const dateStr = t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy', { locale: id }) : '-';
        tahfidzRowsHtml += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${t.surah}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">Hal. ${t.from_ayat} - ${t.to_ayat}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${t.type}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${t.fluency}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dateStr}</td>
          </tr>
        `;
      });
    } else {
      tahfidzRowsHtml = `<tr><td colspan="6" style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #888; font-style: italic;">Belum ada setoran hafalan pada periode ini</td></tr>`;
    }

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Rapor Perkembangan Santri</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          h2 { text-align: center; margin-bottom: 2px; }
          h3 { text-align: center; margin-top: 0; color: #555; }
          .header-table { width: 100%; margin-bottom: 20px; border: none; }
          .header-table td { border: none; padding: 3px; }
          .section-title { font-size: 13px; font-weight: bold; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 2px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
          th { border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold; text-align: center; }
          td { border: 1px solid #ddd; padding: 8px; }
          .footer { margin-top: 40px; text-align: right; }
        </style>
      </head>
      <body>
        <h2>LAPORAN PERKEMBANGAN SANTRI INDIVIDU (RAPOR)</h2>
        <h3>PONDOK PESANTREN ROUDHLATUL ULUM</h3>
        <p style="text-align: center; font-weight: bold; margin-bottom: 20px;">Periode: ${periodLabel}</p>

        <table class="header-table">
          <tr>
            <td style="width: 15%"><strong>Nama Santri</strong></td>
            <td style="width: 2%">:</td>
            <td style="width: 33%"><strong>${student.name}</strong></td>
            <td style="width: 15%"><strong>Kelas</strong></td>
            <td style="width: 2%">:</td>
            <td style="width: 33%">${student.class_name || '-'}</td>
          </tr>
          <tr>
            <td><strong>NIS</strong></td>
            <td>:</td>
            <td>${student.nis}</td>
            <td><strong>Tingkat Tahfidz</strong></td>
            <td>:</td>
            <td>${student.tahfidz_level === 'bilghoib' ? 'Bil Ghoib (Atas)' : 'Bin Nadzhor (Bawah)'}</td>
          </tr>
          <tr>
            <td><strong>Status</strong></td>
            <td>:</td>
            <td>${student.type}</td>
          </tr>
        </table>

        <div class="section-title">I. REKAP KEHADIRAN (Presensi Harian)</div>
        <table>
          <thead>
            <tr>
              <th>Sesi Kehadiran</th>
              <th>Hadir</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Alpa</th>
              <th>Total Sesi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; font-weight: bold;">Shubuh</td>
              <td style="text-align: center;">${shubuh.hadir}</td>
              <td style="text-align: center;">${shubuh.izin}</td>
              <td style="text-align: center;">${shubuh.sakit}</td>
              <td style="text-align: center;">${shubuh.alpa}</td>
              <td style="text-align: center;">${shubuh.total}</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">Ashar</td>
              <td style="text-align: center;">${ashar.hadir}</td>
              <td style="text-align: center;">${ashar.izin}</td>
              <td style="text-align: center;">${ashar.sakit}</td>
              <td style="text-align: center;">${ashar.alpa}</td>
              <td style="text-align: center;">${ashar.total}</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">${thirdSession}</td>
              <td style="text-align: center;">${thirdSessData.hadir}</td>
              <td style="text-align: center;">${thirdSessData.izin}</td>
              <td style="text-align: center;">${thirdSessData.sakit}</td>
              <td style="text-align: center;">${thirdSessData.alpa}</td>
              <td style="text-align: center;">${thirdSessData.total}</td>
            </tr>
            <tr style="background-color: #f9f9f9; font-weight: bold;">
              <td style="text-align: center;">Persentase Kehadiran</td>
              <td colspan="5" style="text-align: center; font-size: 13px; color: #1e3a5f;">${attendancePercentage}%</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">II. PERKEMBANGAN TAHFIDZ AL-QUR'AN</div>
        <p style="margin: 5px 0;"><strong>Ringkasan Setoran:</strong> Baru (${student.setoranBaruCount}) | Murojaah (${student.murojaahCount})</p>
        <table>
          <thead>
            <tr>
              <th style="width: 5%">No</th>
              <th style="width: 25%">Surah / Juz / Jilid</th>
              <th style="width: 20%">Halaman / Ayat</th>
              <th style="width: 15%">Jenis</th>
              <th style="width: 15%">Kelancaran</th>
              <th style="width: 20%">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            ${tahfidzRowsHtml}
          </tbody>
        </table>

        <div class="section-title">III. LAPORAN NILAI AKADEMIK (Rapor)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%">No</th>
              <th style="width: 42%">Mata Pelajaran</th>
              <th style="width: 15%">Nilai</th>
              <th style="width: 35%">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${gradesRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>Bandung Barat, ${format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
          <br/><br/><br/>
          <p><strong>Ustadz Pembimbing</strong></p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_Perkembangan_${student.name.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.doc`;
    a.click();
    showToast('Rapor Word berhasil diunduh', 'success');
  };

  const exportAbsensiToWord = () => {
    const rows = getAbsensiRecapGrouped();
    const periodLabel = getPeriodLabel();
    let rowsHtml = '';
    const SESSIONS = ['Shubuh', 'Ashar', 'Maghrib', 'Isya'] as const;
    rows.forEach((s, idx) => {
      SESSIONS.forEach((sess, si) => {
        const st = s.sessions[sess];
        const pct = st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0;
        rowsHtml += `<tr>${si === 0 ? `<td rowspan="4" style="border:1px solid #ddd;padding:6px;text-align:center;">${idx+1}</td><td rowspan="4" style="border:1px solid #ddd;padding:6px;font-weight:bold;">${s.name} (${s.nis})</td><td rowspan="4" style="border:1px solid #ddd;padding:6px;text-align:center;">${s.class_name}</td>` : ''}<td style="border:1px solid #ddd;padding:6px;text-align:center;">${sess}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.hadir}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.izin}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.sakit}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.alpa}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${st.total}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${pct}%</td></tr>`;
      });
    });
    const html = `<html><head><title>Rekap Presensi</title><style>body{font-family:Arial,sans-serif;font-size:12px;}table{border-collapse:collapse;width:100%;}th{border:1px solid #ddd;padding:8px;background:#f2f2f2;}</style></head><body><h2 style="text-align:center;">REKAP PRESENSI SANTRI</h2><h3 style="text-align:center;">PONDOK PESANTREN ROUDHLATUL ULUM</h3><p style="text-align:center;">${periodLabel}</p><table><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Sesi</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th><th>Total</th><th>%</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff'+html], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Rekap_Presensi_${periodLabel.replace(/\s+/g,'_')}.doc`; a.click();
    showToast('File Word berhasil diunduh', 'success');
  };

  const exportTahfidzToWord = () => {
    const periodLabel = getPeriodLabel();
    const logsToExport = filteredTahfidzLogs;
    let rowsHtml = '';
    logsToExport.forEach((r, idx) => {
      const dateStr = r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy', { locale: id }) : '-';
      const countAyat = r.from_ayat && r.to_ayat ? r.to_ayat - r.from_ayat + 1 : '-';
      rowsHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${r.santri?.name || '-'} (${r.santri?.nis || '-'})</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${r.surah}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.from_ayat ?? '-'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.to_ayat ?? '-'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${countAyat}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.type}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.setoran_mode === 'per_juz' ? 'Per Juz' : 'Per Halaman'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.fluency || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dateStr}</td>
        </tr>
      `;
    });
    
    const htmlContent = `
      <html>
      <head>
        <title>Rekap Setoran Hafalan</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; }
          h2 { text-align: center; margin-bottom: 5px; }
          h3 { text-align: center; margin-top: 0; color: #555; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold; text-align: center; }
          td { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>
        <h2>REKAP SETORAN HAFALAN SANTRI</h2>
        <h3>PONDOK PESANTREN ROUDHLATUL ULUM</h3>
        <p style="text-align: center; font-weight: bold;">Periode: ${periodLabel} | Rombel: ${selectedClass === 'All' ? 'Semua Kelas' : selectedClass}</p>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Santri</th>
              <th>Surah/Juz/Jilid</th>
              <th>Dari Ayat/Hal</th>
              <th>Sampai Ayat/Hal</th>
              <th>Jumlah</th>
              <th>Jenis</th>
              <th>Skema</th>
              <th>Kelancaran</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:10px;">Belum ada data setoran</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Setoran_${periodLabel.replace(/\s+/g, '_')}.doc`;
    a.click();
    showToast('Laporan Word berhasil diunduh', 'success');
  };

  const handleWordExport = () => {
    if (reportType === 'keseluruhan') {
      exportToWord();
    } else if (reportType === 'satu-santri') {
      const student = processedData.find(s => s.id === selectedSantriId);
      if (student) {
        const studentGrades = gradesList.filter(g => g.santri_id === selectedSantriId);
        exportIndividualToWord(student, studentGrades);
      } else {
        showToast('Silakan pilih santri terlebih dahulu', 'error');
      }
    } else if (reportType === 'rekap-presensi') {
      exportAbsensiToWord();
    } else if (reportType === 'rekap-setoran') {
      exportTahfidzToWord();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Find selected student data for display
  const activeStudent = reportType === 'satu-santri' ? processedData.find(s => s.id === selectedSantriId) : null;
  const activeStudentGrades = activeStudent ? gradesList.filter(g => g.santri_id === activeStudent.id) : [];
  const activeStudentTahfidz = activeStudent ? tahfidzLogs.filter(t => t.santri_id === activeStudent.id) : [];

  return (
    <div className="space-y-5 print:space-y-0 print:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-header">Laporan Terpadu Santri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Integrasi rekap presensi harian, capaian tahfidz, dan nilai akademik</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleWordExport} 
            disabled={loading || (
              reportType === 'keseluruhan' ? processedData.length === 0 :
              reportType === 'satu-santri' ? !selectedSantriId :
              reportType === 'rekap-presensi' ? getAbsensiRecapGrouped().length === 0 :
              filteredTahfidzLogs.length === 0
            )} 
            className="btn-secondary"
          >
            <Download size={15} /> Word (.doc)
          </button>
          <button 
            onClick={handlePrint} 
            disabled={loading || (
              reportType === 'keseluruhan' ? processedData.length === 0 :
              reportType === 'satu-santri' ? !selectedSantriId :
              reportType === 'rekap-presensi' ? getAbsensiRecapGrouped().length === 0 :
              filteredTahfidzLogs.length === 0
            )} 
            className="btn-primary"
          >
            <Printer size={15} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Tab Switcher - Hidden in print */}
      <div className="flex flex-wrap border-b border-slate-200 print:hidden gap-1">
        <button
          onClick={() => setReportType('keseluruhan')}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer",
            reportType === 'keseluruhan'
              ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={16} />
          Laporan Terpadu
        </button>
        <button
          onClick={() => {
            setReportType('satu-santri');
            if (processedData.length > 0 && !selectedSantriId) {
              setSelectedSantriId(processedData[0].id);
            }
          }}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer",
            reportType === 'satu-santri'
              ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <FileText size={16} />
          Rapor Individu
        </button>
        <button
          onClick={() => setReportType('rekap-presensi')}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer",
            reportType === 'rekap-presensi'
              ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <ClipboardCheck size={16} />
          Rekap Presensi
        </button>
        <button
          onClick={() => setReportType('rekap-setoran')}
          className={cn(
            "py-2.5 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer",
            reportType === 'rekap-setoran'
              ? "border-[#1e3a5f] text-[#1e3a5f] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <BookOpen size={16} />
          Rekap Setoran
        </button>
      </div>

      {/* Filter Control - Hidden in Print */}
      <div className="card p-5 space-y-4 border-[#1e3a5f]/10 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Periode Rekap</label>
            <select className="input-field w-auto" value={recapPeriod} onChange={(e) => setRecapPeriod(e.target.value as 'month' | 'year')}>
              <option value="month">Per Bulan</option>
              <option value="year">Per Tahun</option>
            </select>
          </div>
          
          {recapPeriod === 'month' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bulan</label>
              <select className="input-field w-auto" value={recapMonth} onChange={(e) => setRecapMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM', { locale: id })}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tahun</label>
            <input type="number" className="input-field w-24" value={recapYear} onChange={(e) => setRecapYear(Number(e.target.value))} min="2000" max="2100" />
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kelas</label>
            <select className="input-field w-auto" value={selectedClass} onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSantriId(''); // Reset selected student when class changes
            }}>
              <option value="All">Semua Kelas</option>
              {classes.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {reportType === 'satu-santri' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pilih Santri</label>
              <select 
                className="input-field w-56" 
                value={selectedSantriId} 
                onChange={(e) => setSelectedSantriId(e.target.value)}
              >
                <option value="">-- Pilih Santri --</option>
                {processedData.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                ))}
              </select>
            </div>
          )}
          
          <button onClick={fetchReportData} className="btn-primary w-auto h-[38px] px-5 flex items-center gap-2 cursor-pointer self-end">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {loading ? 'Memuat...' : 'Tampilkan Laporan'}
          </button>
        </div>
      </div>

      {/* Print Paper Layout - Displayed as a premium card in web, and styled nicely for print */}
      <div className="card p-8 border-[#1e3a5f]/10 bg-white print:border-0 print:p-0 print:shadow-none min-h-[600px] flex flex-col justify-between">
        <div>
          {/* Kop Laporan */}
          <div className="text-center pb-6 border-b-2 border-slate-900/60 mb-6">
            <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">
              {reportType === 'keseluruhan' 
                ? 'LAPORAN PERKEMBANGAN SANTRI TERPADU' 
                : reportType === 'satu-santri' 
                ? 'RAPOR HASIL BELAJAR SANTRI INDIVIDU' 
                : reportType === 'rekap-presensi'
                ? 'REKAPITULASI PRESENSI SANTRI'
                : 'REKAPITULASI SETORAN HAFALAN SANTRI'}
            </h2>
            <h3 className="text-lg font-bold text-[#1e3a5f] uppercase tracking-wider mt-0.5">PONDOK PESANTREN ROUDHLATUL ULUM</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Parongpong, Bandung Barat, Jawa Barat</p>
            <p className="text-xs font-extrabold text-slate-800 mt-2 bg-slate-100 px-3 py-1 inline-block rounded-full">
              Periode: {getPeriodLabel()} {reportType !== 'satu-santri' && `| Rombel: ${selectedClass === 'All' ? 'Semua Kelas' : selectedClass}`} (Santri {CAMPUS_LABEL})
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={36} className="animate-spin text-emerald-500 mb-3" />
              <p className="text-sm font-semibold">Menyusun data laporan terpadu...</p>
            </div>
          ) : reportType === 'keseluruhan' ? (
            /* COLLECTIVE REPORT VIEW */
            processedData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                      <th className="px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider text-center border border-slate-200" rowSpan={2}>No</th>
                      <th className="px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider border border-slate-200" rowSpan={2}>Nama Santri</th>
                      <th className="px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider text-center border border-slate-200" rowSpan={2}>Kelas</th>
                      <th className="px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider text-center border border-slate-200" rowSpan={2}>Tingkat</th>
                      <th className="px-3 py-2 font-extrabold text-[10px] uppercase tracking-wider text-center border border-slate-200" colSpan={3}>Presensi (Hadir/Total)</th>
                      <th className="px-3 py-2 font-extrabold text-[10px] uppercase tracking-wider text-center border border-slate-200" colSpan={2}>Tahfidz</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="px-2 py-2 font-bold text-[9px] uppercase text-center border border-slate-200">Shubuh</th>
                      <th className="px-2 py-2 font-bold text-[9px] uppercase text-center border border-slate-200">Ashar</th>
                      <th className="px-2 py-2 font-bold text-[9px] uppercase text-center border border-slate-200">{thirdSession}</th>
                      <th className="px-2 py-2 font-bold text-[9px] uppercase text-center border border-slate-200">Baru/Murojaah</th>
                      <th className="px-3 py-2 font-bold text-[9px] uppercase border border-slate-200">Setoran Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {processedData.map((row, idx) => {
                      const shubuh = row.attendanceSummary.Shubuh;
                      const ashar = row.attendanceSummary.Ashar;
                      const thirdSessRow = row.attendanceSummary[thirdSession];

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3 text-center border border-slate-200 font-medium">{idx + 1}</td>
                          <td className="px-3 py-3 border border-slate-200">
                            <p className="font-bold text-slate-900 leading-snug">{row.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {row.nis}</p>
                          </td>
                          <td className="px-3 py-3 text-center border border-slate-200 font-medium">{row.class_name || '-'}</td>
                          <td className="px-3 py-3 text-center border border-slate-200">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border",
                              row.tahfidz_level === 'bilghoib' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            )}>
                              {row.tahfidz_level === 'bilghoib' ? 'Bil Ghoib' : 'Bin Nadzhor'}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center border border-slate-200">
                            <span className="font-semibold text-slate-700">{shubuh.hadir}</span>
                            <span className="text-slate-400 font-light">/{shubuh.total}</span>
                          </td>
                          <td className="px-2 py-3 text-center border border-slate-200">
                            <span className="font-semibold text-slate-700">{ashar.hadir}</span>
                            <span className="text-slate-400 font-light">/{ashar.total}</span>
                          </td>
                          <td className="px-2 py-3 text-center border border-slate-200">
                            <span className="font-semibold text-slate-700">{thirdSessRow.hadir}</span>
                            <span className="text-slate-400 font-light">/{thirdSessRow.total}</span>
                          </td>
                          <td className="px-2 py-3 text-center border border-slate-200 font-bold text-slate-700">
                            <span className="text-blue-600">{row.setoranBaruCount}</span>
                            <span className="text-slate-300 font-normal"> / </span>
                            <span className="text-sky-600">{row.murojaahCount}</span>
                          </td>
                          <td className="px-3 py-3 border border-slate-200 leading-normal max-w-[200px] truncate">
                            {row.latestSetoran ? (
                              <div>
                                <p className="font-semibold text-slate-800">{row.latestSetoran.surah}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Halaman {row.latestSetoran.from_ayat}-{row.latestSetoran.to_ayat} 
                                  <span className="ml-1 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">
                                    {row.latestSetoran.fluency}
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">Belum ada setoran</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <Users size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-semibold">Tidak ada data santri {CAMPUS_LABEL.toLowerCase()} ditemukan untuk rombel ini</p>
              </div>
            )
          ) : reportType === 'satu-santri' ? (
            /* INDIVIDUAL RAPOR VIEW */
            activeStudent ? (
              <div className="space-y-6">
                {/* 1. Identity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-xs text-slate-800 font-medium">
                  <div className="space-y-2.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400">Nama Lengkap</span>
                      <span className="font-bold text-slate-900">{activeStudent.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400">Nomor Induk Santri (NIS)</span>
                      <span className="font-mono text-slate-900">{activeStudent.nis}</span>
                    </div>
                    <div className="flex justify-between border-none">
                      <span className="text-slate-400">Status Santri</span>
                      <span className="font-semibold text-slate-900">{activeStudent.type}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400">Kelas / Rombel</span>
                      <span className="font-semibold text-slate-900">{activeStudent.class_name || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-400">Tingkat Tahfidz</span>
                      <span className="font-extrabold text-[#1e3a5f] uppercase">
                        {activeStudent.tahfidz_level === 'bilghoib' ? 'Bil Ghoib (Atas)' : 'Bin Nadzhor (Bawah)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Attendance Summary Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-[#1e3a5f]" />
                    I. Rekap Kehadiran Harian
                  </h4>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Sesi</th>
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Hadir</th>
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Izin</th>
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Sakit</th>
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Alpa</th>
                        <th className="px-3 py-2 border border-slate-200 font-bold text-center">Total Sesi</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {CAMPUS_ABSENSI_SESSIONS.map(sessionKey => {
                        const s = activeStudent.attendanceSummary[sessionKey];
                        return (
                          <tr key={sessionKey} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 border border-slate-200 font-bold text-center">{sessionKey}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">{s.hadir}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">{s.izin}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">{s.sakit}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">{s.alpa}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">{s.total}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const totHadir = CAMPUS_ABSENSI_SESSIONS.reduce((sum, key) => sum + activeStudent.attendanceSummary[key].hadir, 0);
                        const totSess = CAMPUS_ABSENSI_SESSIONS.reduce((sum, key) => sum + activeStudent.attendanceSummary[key].total, 0);
                        const percent = totSess > 0 ? Math.round((totHadir / totSess) * 100) : 0;
                        return (
                          <tr className="bg-slate-50 font-bold">
                            <td className="px-3 py-2.5 border border-slate-200 text-center">Persentase Kehadiran</td>
                            <td className="px-3 py-2.5 border border-slate-200 text-center text-[#1e3a5f] text-sm" colSpan={5}>
                              {percent}%
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* 3. Tahfidz Progress Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#1e3a5f]" />
                    II. Perkembangan Tahfidz Al-Qur'an
                  </h4>
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-xl mb-3 text-xs">
                    <p className="font-semibold text-slate-700">Ringkasan Setoran Periode Ini:</p>
                    <div className="flex gap-2">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">Setoran Baru: {activeStudent.setoranBaruCount}</span>
                      <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-bold">Murojaah: {activeStudent.murojaahCount}</span>
                    </div>
                  </div>
                  {activeStudentTahfidz.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                            <th className="px-3 py-2 border-b border-slate-200 font-bold">No</th>
                            <th className="px-3 py-2 border-b border-slate-200 font-bold">Surah/Juz/Jilid</th>
                            <th className="px-3 py-2 border-b border-slate-200 font-bold text-center">Halaman/Ayat</th>
                            <th className="px-3 py-2 border-b border-slate-200 font-bold text-center">Jenis</th>
                            <th className="px-3 py-2 border-b border-slate-200 font-bold text-center">Kelancaran</th>
                            <th className="px-3 py-2 border-b border-slate-200 font-bold text-center">Tanggal</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {activeStudentTahfidz.map((t, idx) => (
                            <tr key={t.id || idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-1.5 border-b border-slate-100">{idx + 1}</td>
                              <td className="px-3 py-1.5 border-b border-slate-100 font-semibold">{t.surah}</td>
                              <td className="px-3 py-1.5 border-b border-slate-100 text-center">Hal. {t.from_ayat} - {t.to_ayat}</td>
                              <td className="px-3 py-1.5 border-b border-slate-100 text-center">{t.type}</td>
                              <td className="px-3 py-1.5 border-b border-slate-100 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  t.fluency === 'Lancar' ? 'bg-emerald-50 text-emerald-700' : t.fluency === 'Cukup' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                )}>
                                  {t.fluency}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 border-b border-slate-100 text-center text-slate-500">
                                {t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy', { locale: id }) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      Tidak ada catatan setoran tahfidz pada periode ini.
                    </p>
                  )}
                </div>

                {/* 4. Academic Grades Section (Rapor) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-[#1e3a5f]" />
                    III. Laporan Nilai Akademik
                  </h4>
                  {activeStudentGrades.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <th className="px-3 py-2 border border-slate-200 font-bold text-center" style={{ width: '8%' }}>No</th>
                          <th className="px-3 py-2 border border-slate-200 font-bold" style={{ width: '42%' }}>Mata Pelajaran</th>
                          <th className="px-3 py-2 border border-slate-200 font-bold text-center" style={{ width: '15%' }}>Nilai</th>
                          <th className="px-3 py-2 border border-slate-200 font-bold" style={{ width: '35%' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {activeStudentGrades.map((g, idx) => (
                          <tr key={g.id || idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 border border-slate-200 text-center">{idx + 1}</td>
                            <td className="px-3 py-2 border border-slate-200 font-bold">{g.kurikulum?.subject}</td>
                            <td className="px-3 py-2 border border-slate-200 text-center">
                              <span className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs",
                                g.score >= 85 ? 'bg-emerald-50 text-emerald-700' : g.score >= 70 ? 'bg-blue-50 text-blue-700' : g.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                              )}>
                                {g.score}
                              </span>
                            </td>
                            <td className="px-3 py-2 border border-slate-200">{g.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      Belum ada nilai akademik yang diinput untuk santri ini pada periode ini.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-semibold">Pilih santri terlebih dahulu untuk menampilkan rapor individu</p>
              </div>
            )
          ) : reportType === 'rekap-presensi' ? (
            /* REKAP PRESENSI VIEW */
            (() => {
              const rows = getAbsensiRecapGrouped();
              const SESSIONS = ['Shubuh', 'Ashar', 'Maghrib', 'Isya'] as const;
              return rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Santri</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Kelas</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Sesi</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-emerald-600 uppercase border border-slate-200">Hadir</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-sky-600 uppercase border border-slate-200">Izin</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase border border-slate-200">Sakit</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-red-600 uppercase border border-slate-200">Alpa</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Total</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        SESSIONS.map((sess, si) => {
                          const st = s.sessions[sess];
                          const pct = st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0;
                          return (
                            <tr key={`${s.nis}-${sess}`} className={cn('hover:bg-slate-50/60', si === SESSIONS.length - 1 ? 'border-b-2 border-slate-200' : 'border-b border-slate-50')}>
                              {si === 0 && (
                                <>
                                  <td className="px-3 py-2 font-semibold text-slate-800 border border-slate-200" rowSpan={SESSIONS.length}>
                                    {s.name}
                                    <span className="text-slate-400 font-mono ml-1.5 text-[10px]">{s.nis}</span>
                                  </td>
                                  <td className="px-2 py-2 text-center text-slate-500 text-[11px] border border-slate-200" rowSpan={SESSIONS.length}>
                                    {s.class_name}
                                  </td>
                                </>
                              )}
                              <td className="px-2 py-2 text-center border border-slate-200">
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[9px] font-bold',
                                  sess === 'Shubuh' ? 'bg-indigo-50 text-indigo-700' :
                                  sess === 'Ashar' ? 'bg-orange-50 text-orange-700' :
                                  sess === 'Maghrib' ? 'bg-purple-50 text-purple-700' :
                                  'bg-slate-100 text-slate-600'
                                )}>
                                  {sess}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center font-bold text-emerald-600 border border-slate-200">{st.hadir}</td>
                              <td className="px-2 py-2 text-center font-bold text-sky-600 border border-slate-200">{st.izin}</td>
                              <td className="px-2 py-2 text-center font-bold text-amber-600 border border-slate-200">{st.sakit}</td>
                              <td className="px-2 py-2 text-center font-bold text-red-600 border border-slate-200">{st.alpa}</td>
                              <td className="px-2 py-2 text-center text-slate-600 font-semibold border border-slate-200">{st.total}</td>
                              <td className="px-2 py-2 text-center border border-slate-200">
                                {st.total > 0 ? (
                                  <span className={cn('font-bold', pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600')}>
                                    {pct}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400">
                  <ClipboardCheck size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-semibold">Tidak ada data presensi untuk periode ini</p>
                </div>
              );
            })()
          ) : (
            /* REKAP SETORAN VIEW */
            filteredTahfidzLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase border border-slate-200">No</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Santri</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Surah</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Dari Ayat/Hal</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Sampai Ayat/Hal</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Jumlah</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Jenis</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Skema</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Kelancaran</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase border border-slate-200">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredTahfidzLogs.map((r: any, idx: number) => {
                      const countAyat = r.from_ayat && r.to_ayat ? r.to_ayat - r.from_ayat + 1 : '-';
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-center border border-slate-200 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800 border border-slate-200">
                            {r.santri?.name || '-'}
                            <span className="text-slate-400 font-mono ml-1.5 text-[10px]">{r.santri?.nis || '-'}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 border border-slate-200 font-medium">{r.surah}</td>
                          <td className="px-3 py-2 text-center text-slate-600 border border-slate-200">{r.from_ayat ?? '-'}</td>
                          <td className="px-3 py-2 text-center text-slate-600 border border-slate-200">{r.to_ayat ?? '-'}</td>
                          <td className="px-3 py-2 text-center text-slate-600 border border-slate-200 font-bold">{countAyat}</td>
                          <td className="px-3 py-2 text-center border border-slate-200">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                              r.type === 'Setoran Baru' 
                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                : 'bg-sky-50 text-sky-600 border-sky-100'
                            )}>
                              {r.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500 border border-slate-200">
                            {r.setoran_mode === 'per_juz' ? 'Per Juz' : 'Per Halaman'}
                          </td>
                          <td className="px-3 py-2 text-center border border-slate-200">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                              r.fluency === 'Lancar' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : r.fluency === 'Cukup' 
                                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                : 'bg-red-50 text-red-700 border-red-100'
                            )}>
                              {r.fluency || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500 border border-slate-200">
                            {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy', { locale: id }) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-semibold">Tidak ada data setoran tahfidz untuk periode ini</p>
              </div>
            )
          )}
        </div>

        {/* Signature Area */}
        {!loading && (
          (reportType === 'keseluruhan' && processedData.length > 0) || 
          (reportType === 'satu-santri' && !!selectedSantriId) ||
          (reportType === 'rekap-presensi' && getAbsensiRecapGrouped().length > 0) ||
          (reportType === 'rekap-setoran' && filteredTahfidzLogs.length > 0)
        ) && (
          <div className="mt-16 flex justify-end text-slate-800 font-medium text-xs">
            <div className="text-center min-w-[200px]">
              <p>Bandung Barat, {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
              <p className="font-bold mt-1">Ustadz Pembimbing</p>
              <div className="h-20" />
              <p className="border-t border-slate-400 pt-1 font-bold">_________________________</p>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => {}} />}
    </div>
  );
}
