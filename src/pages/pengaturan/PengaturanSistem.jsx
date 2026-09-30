import { useState } from 'react';
import * as XLSX from 'xlsx';
import Page from '../../components/layout/Page';
import { useAppData } from '../../context/AppContext';
import { getSheetsConfig, isConfigured } from '../../services/googleSheets';
import { todayWIB } from '../../db/helpers';
import {
  fetchSiswaFromSheet, fetchKelasFromSheet, fetchGuruFromSheet, fetchAsetFromSheet,
  fetchPeminjamanFromSheet, fetchPemeliharaanFromSheet, fetchProfilFromSheet, fetchTahunAjaranFromSheet,
  fetchUsersFromSheet, fetchLogFromSheet, fetchTarifFromSheet, fetchTagihanSppFromSheet,
  fetchTagihanLainFromSheet, fetchPembayaranFromSheet, fetchPengeluaranFromSheet,
} from '../../services/googleSheets';

const SHEET_LIST_MASTER = [
  { label: 'Data Siswa', fetchFn: fetchSiswaFromSheet },
  { label: 'Data Kelas', fetchFn: fetchKelasFromSheet },
  { label: 'Data Guru', fetchFn: fetchGuruFromSheet },
  { label: 'Data Aset', fetchFn: fetchAsetFromSheet },
  { label: 'Peminjaman Aset', fetchFn: fetchPeminjamanFromSheet },
  { label: 'Pemeliharaan Aset', fetchFn: fetchPemeliharaanFromSheet },
  { label: 'Profil Sekolah', fetchFn: fetchProfilFromSheet },
  { label: 'Tahun Ajaran', fetchFn: fetchTahunAjaranFromSheet },
  { label: 'Users', fetchFn: fetchUsersFromSheet },
  { label: 'Log Aktivitas', fetchFn: fetchLogFromSheet },
];
const SHEET_LIST_KEUANGAN = [
  { label: 'Tarif', fetchFn: fetchTarifFromSheet },
  { label: 'Tagihan SPP', fetchFn: fetchTagihanSppFromSheet },
  { label: 'Tagihan Lain', fetchFn: fetchTagihanLainFromSheet },
  { label: 'Pembayaran', fetchFn: fetchPembayaranFromSheet },
  { label: 'Pengeluaran', fetchFn: fetchPengeluaranFromSheet },
];

export default function PengaturanSistem() {
  const { toast } = useAppData();
  const [backingUp, setBackingUp] = useState(false);
  const [progress, setProgress] = useState('');

  const masterOk = isConfigured('master');
  const keuanganOk = isConfigured('keuangan');

  async function unduhBackupLengkap() {
    setBackingUp(true);
    try {
      const wb = XLSX.utils.book_new();
      const semuaSheet = [
        ...(masterOk ? SHEET_LIST_MASTER : []),
        ...(keuanganOk ? SHEET_LIST_KEUANGAN : []),
      ];
      for (const s of semuaSheet) {
        setProgress(`Mengambil ${s.label}...`);
        try {
          const rows = await s.fetchFn();
          const ws = XLSX.utils.json_to_sheet(rows);
          const safeName = s.label.slice(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        } catch (err) {
          console.warn(`Gagal ambil ${s.label}:`, err.message);
        }
      }
      const tanggal = todayWIB();
      XLSX.writeFile(wb, `Backup MI Ikhlasiyah - ${tanggal}.xlsx`);
      toast('Backup berhasil diunduh.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBackingUp(false);
      setProgress('');
    }
  }

  return (
    <Page pageId="pengaturan-sistem" title="Pengaturan Sistem" path="Pengaturan / System / Pengaturan Sistem">
      <div className="card">
        <div className="card-head"><div><h3>Info Koneksi</h3><p>Status sambungan ke Google Sheets saat ini.</p></div></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 18px', borderRadius: 8, background: masterOk ? 'var(--green-soft)' : 'var(--red-soft)', color: masterOk ? 'var(--green-dark)' : 'var(--red)', fontSize: 13, fontWeight: 600 }}>
              {masterOk ? 'Terhubung' : 'Belum Terhubung'} — Data Induk
            </div>
            <div style={{ padding: '10px 18px', borderRadius: 8, background: keuanganOk ? 'var(--green-soft)' : 'var(--red-soft)', color: keuanganOk ? 'var(--green-dark)' : 'var(--red)', fontSize: 13, fontWeight: 600 }}>
              {keuanganOk ? 'Terhubung' : 'Belum Terhubung'} — Data Keuangan
            </div>
          </div>
          {masterOk && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, wordBreak: 'break-all' }}>URL Data Induk: {getSheetsConfig('master').url}</p>}
          {keuanganOk && <p style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>URL Data Keuangan: {getSheetsConfig('keuangan').url}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Backup Data</h3><p>Unduh salinan seluruh data (semua sheet) sebagai satu file Excel, untuk arsip di luar Google Sheets.</p></div></div>
        <div className="card-body">
          <button className="btn btn-primary" onClick={unduhBackupLengkap} disabled={backingUp || (!masterOk && !keuanganOk)}>
            {backingUp ? (progress || 'Menyiapkan...') : 'Unduh Backup Lengkap (Excel)'}
          </button>
          {!masterOk && !keuanganOk && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Belum ada koneksi Sheets yang aktif.</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Restore Data</h3></div></div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Karena data tersimpan langsung di Google Sheets Anda, pemulihan data dilakukan lewat fitur bawaan Google
          Sheets sendiri: buka Sheet yang bersangkutan, menu File lalu Riwayat Versi, lalu Lihat Riwayat Versi.
          Di sana Anda bisa melihat dan mengembalikan ke kondisi sebelumnya kapan saja. Ini lebih aman dibanding
          proses import ulang manual yang rawan salah format.
        </div>
      </div>
    </Page>
  );
}
