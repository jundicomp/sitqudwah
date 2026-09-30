import { useEffect, useState } from 'react';
import { getSheetsConfig, fetchFromSheet } from '../../services/googleSheets';
import { useAuth } from '../../context/AuthContext';

const TARGET_META = {
  master: {
    title: '🔗 Koneksi Data Induk',
    desc: 'Siswa, Kelas, Guru, Profil Sekolah, Tahun Ajaran, User, Log Aktivitas — semua dalam SATU file Sheets.',
    testSheet: 'siswa',
  },
  keuangan: {
    title: '💰 Koneksi Data Keuangan',
    desc: 'Tarif, Tagihan, Pembayaran, dst — file Sheets terpisah karena data ini terus bertambah tiap bulan.',
    testSheet: 'tarif',
  },
  akademik: {
    title: '📘 Koneksi Data Akademik',
    desc: 'Jadwal, Presensi, Nilai, Prestasi, Pelanggaran — file Sheets ketiga karena presensi & nilai bertambah tiap hari.',
    testSheet: 'jadwal',
  },
};

function ConnectionCard({ target }) {
  const meta = TARGET_META[target];
  const cfg = getSheetsConfig(target);
  const [status, setStatus] = useState('checking'); // checking | ok | fail

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchFromSheet(meta.testSheet, target);
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('fail');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>{meta.title}</h3>
          <p>{meta.desc}</p>
        </div>
      </div>
      <div className="card-body">
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600, background: status === 'ok' ? 'var(--green-soft)' : status === 'fail' ? 'var(--red-soft)' : '#EEE', color: status === 'ok' ? 'var(--green-dark)' : status === 'fail' ? 'var(--red)' : 'var(--muted)' }}>
          {status === 'checking' && 'Memeriksa koneksi...'}
          {status === 'ok' && '✓ Terhubung dan berfungsi normal'}
          {status === 'fail' && '✕ Gagal terhubung — cek URL/sandi di src/config/sheetsDefaults.js, dan pastikan Apps Script sudah di-redeploy'}
        </div>
        <div className="field">
          <label>URL Web App (ditanam di kode — read only)</label>
          <input type="text" value={cfg.url} readOnly style={{ background: '#F6F8F5', color: 'var(--muted)' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          Koneksi ini <strong>ditanam permanen di kode</strong> (Cara 1) — tidak bisa diubah dari halaman ini lagi.
          Untuk mengganti URL atau kata sandi, edit file <code>src/config/sheetsDefaults.js</code> di source code,
          lalu build ulang dan upload ulang.
        </p>
      </div>
    </div>
  );
}

export default function ConnectionSettings() {
  const { canAccess } = useAuth();
  const allowed = canAccess('koneksi-sheets');

  if (!allowed) {
    return (
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Pengaturan Koneksi Google Sheets</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Hanya <strong>Admin</strong> yang bisa melihat pengaturan ini.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConnectionCard target="master" />
      <ConnectionCard target="keuangan" />
      <ConnectionCard target="akademik" />
    </>
  );
}
