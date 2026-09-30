import { useEffect, useState } from 'react';
import { isConfigured, fetchFromSheet } from '../../services/googleSheets';

async function checkTarget(target, testSheet) {
  if (!isConfigured(target)) return 'fail';
  try {
    await fetchFromSheet(testSheet, target);
    return 'ok';
  } catch {
    return 'fail';
  }
}

const ICON_CONFIG = {
  checking: { color: '#B7B7B7', icon: '…' },
  ok: { color: '#1C7A3C', icon: '✓' },
  fail: { color: '#B23B2E', icon: '✕' },
};

function StatusLine({ status, label }) {
  const c = ICON_CONFIG[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--muted)' }}>
      <span style={{
        width: 15, height: 15, borderRadius: '50%', background: c.color, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9.5, fontWeight: 800, flexShrink: 0, lineHeight: 1,
      }}>{c.icon}</span>
      {label}
    </div>
  );
}

/**
 * Cek DUA koneksi sekaligus (Data Induk/siswa & Data Keuangan/tarif) secara paralel,
 * tampilkan masing-masing sbg baris status terpisah. onDone dipanggil sekali, setelah
 * KEDUANYA selesai dicek (dipakai LoginScreen utk menyembunyikan form selama proses ini).
 */
export default function ConnectionStatusBadge({ onDone }) {
  const [master, setMaster] = useState('checking');
  const [keuangan, setKeuangan] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, k] = await Promise.all([
        checkTarget('master', 'siswa'),
        checkTarget('keuangan', 'tarif'),
      ]);
      if (!cancelled) {
        setMaster(m);
        setKeuangan(k);
        onDone && onDone();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = (status, ok, fail, checking) => status === 'checking' ? checking : status === 'ok' ? ok : fail;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <StatusLine status={master} label={label(master, 'Data siswa terhubung', 'Data siswa belum terhubung', 'Memeriksa data siswa...')} />
      <StatusLine status={keuangan} label={label(keuangan, 'Data keuangan terhubung', 'Data keuangan belum terhubung', 'Memeriksa data keuangan...')} />
    </div>
  );
}
