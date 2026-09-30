import { useEffect, useState } from 'react';
import { isConfigured, fetchFromSheet } from '../../services/googleSheets';

// Terjemahkan error teknis jadi petunjuk yg bisa langsung ditindaklanjuti admin.
function alasan(err) {
  const m = String(err?.message || err || '');
  if (/kata sandi|akses ditolak|secret/i.test(m)) return 'kata sandi (secret) tidak cocok dgn Apps Script';
  if (/failed to fetch|networkerror|load failed|cors/i.test(m)) return 'URL tidak bisa diakses — cek deployment "Anyone" & internet';
  if (/json|unexpected token/i.test(m)) return 'balasan bukan dari Apps Script — cek URL /exec';
  return m.slice(0, 80) || 'tidak diketahui';
}

async function checkTarget(target, testSheet) {
  if (!isConfigured(target)) return { status: 'fail', pesan: 'URL/secret belum diisi di sheetsDefaults.js' };
  try {
    await fetchFromSheet(testSheet, target);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'fail', pesan: alasan(err) };
  }
}

const ICON_CONFIG = {
  checking: { color: '#B7B7B7', icon: '…' },
  ok: { color: '#1C7A3C', icon: '✓' },
  fail: { color: '#B23B2E', icon: '✕' },
};

function StatusLine({ status, label, pesan }) {
  const c = ICON_CONFIG[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--muted)' }}>
      <span style={{
        width: 15, height: 15, borderRadius: '50%', background: c.color, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9.5, fontWeight: 800, flexShrink: 0, lineHeight: 1,
      }}>{c.icon}</span>
      <span>{label}{status === 'fail' && pesan && <span style={{ display: 'block', fontSize: 10.5, color: '#B23B2E' }}>{pesan}</span>}</span>
    </div>
  );
}

/**
 * Cek DUA koneksi sekaligus (Data Induk/siswa & Data Keuangan/tarif) secara paralel,
 * tampilkan masing-masing sbg baris status terpisah. onDone dipanggil sekali, setelah
 * KEDUANYA selesai dicek (dipakai LoginScreen utk menyembunyikan form selama proses ini).
 */
export default function ConnectionStatusBadge({ onDone }) {
  const [hasil, setHasil] = useState({ master: { status: 'checking' }, keuangan: { status: 'checking' }, akademik: { status: 'checking' } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [master, keuangan, akademik] = await Promise.all([
        checkTarget('master', 'siswa'),
        checkTarget('keuangan', 'tarif'),
        checkTarget('akademik', 'jadwal'),
      ]);
      if (!cancelled) {
        setHasil({ master, keuangan, akademik });
        onDone && onDone();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baris = [
    ['master', 'Data induk'], ['keuangan', 'Data keuangan'], ['akademik', 'Data akademik'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {baris.map(([k, nama]) => {
        const h = hasil[k];
        const label = h.status === 'checking' ? `Memeriksa ${nama.toLowerCase()}...` : h.status === 'ok' ? `${nama} terhubung` : `${nama} belum terhubung`;
        return <StatusLine key={k} status={h.status} label={label} pesan={h.pesan} />;
      })}
    </div>
  );
}
