import { useEffect, useState, useRef } from 'react';
import { cekKoneksi, isConfigured } from '../../services/googleSheets';

const INTERVAL_CEK_MS = 25000; // cek ulang tiap 25 detik -- cukup sering utk terasa "otomatis",
// tapi tidak terlalu sering sampai ikut membebani kuota Apps Script.

// 1 titik pulse (D=Data Induk / K=Keuangan). warna: hijau=terhubung, merah=tidak,
// kuning=lagi mengecek (cuma sesaat, sebelum hasil pertama datang).
function StatusPulse({ target, label }) {
  const [status, setStatus] = useState('kuning'); // 'hijau' | 'merah' | 'kuning'
  const batalRef = useRef(false);

  useEffect(() => {
    batalRef.current = false;

    async function cekSekali() {
      if (!isConfigured(target)) { if (!batalRef.current) setStatus('merah'); return; }
      const ok = await cekKoneksi(target);
      if (!batalRef.current) setStatus(ok ? 'hijau' : 'merah');
    }

    cekSekali(); // cek pertama langsung saat komponen muncul
    const timer = setInterval(cekSekali, INTERVAL_CEK_MS);
    return () => { batalRef.current = true; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const keterangan = status === 'hijau' ? `${label} terhubung` : status === 'merah' ? `${label} tidak terhubung` : `${label} memeriksa...`;

  return (
    <div className="status-pulse-wrap" title={keterangan}>
      <span className={`status-pulse-dot ${status}`} />
      <span>{label}</span>
    </div>
  );
}

// D = Data Induk (master), K = Keuangan -- 2 titik berdampingan di header.
export default function StatusKoneksiHeader() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <StatusPulse target="master" label="D" />
      <StatusPulse target="keuangan" label="K" />
      <StatusPulse target="akademik" label="A" />
    </div>
  );
}
