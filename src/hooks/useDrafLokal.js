import { useCallback, useEffect, useRef, useState } from 'react';

// v1.61.4 -- Simpan otomatis isian yg BELUM disimpan ke perangkat (localStorage).
// Kalau halaman tidak sengaja ter-refresh (tarik layar ke bawah di HP), baterai habis,
// atau tab tertutup, isian bisa dipulihkan saat editor dibuka lagi.
// Selama ada isian belum tersimpan, browser juga menanyakan dulu sebelum halaman ditutup.
const AWALAN = 'sq-draf:';
const KEDALUWARSA = 14 * 24 * 3600e3;
const kotor = new Set();
export const adaIsianBelumTersimpan = () => kotor.size > 0;

function baca(K) {
  try {
    const o = JSON.parse(localStorage.getItem(K) || 'null');
    if (!o || !o.nilai || Date.now() - (o.waktu || 0) > KEDALUWARSA) { localStorage.removeItem(K); return null; }
    return o;
  } catch { return null; }
}

// Bersihkan draf basi sekali saat aplikasi dimuat.
try {
  Object.keys(localStorage).filter(k => k.startsWith(AWALAN)).forEach(k => baca(k));
} catch { /* abaikan */ }

export default function useDrafLokal(kunci, nilai, { aktif = true } = {}) {
  const K = AWALAN + kunci;
  const json = JSON.stringify(nilai);
  const awal = useRef(json);
  const [draf, setDraf] = useState(() => {
    const o = aktif ? baca(K) : null;
    return o && JSON.stringify(o.nilai) !== json ? o : null;
  });

  useEffect(() => {
    if (!aktif) { kotor.delete(K); return undefined; }
    // Selama tawaran "Pulihkan" tampil, draf lama baru tertimpa kalau user mulai mengetik lagi.
    const beda = json !== awal.current;
    if (beda) kotor.add(K); else kotor.delete(K);
    if (!beda) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(K, JSON.stringify({ nilai: JSON.parse(json), waktu: Date.now() })); } catch { /* penuh/diblokir */ }
    }, 400);
    return () => clearTimeout(t);
  }, [K, json, aktif]);

  useEffect(() => () => { kotor.delete(K); }, [K]);

  // Panggil setelah BERHASIL menyimpan ke Sheets.
  const tersimpan = useCallback((nilaiTersimpan) => {
    awal.current = JSON.stringify(nilaiTersimpan === undefined ? JSON.parse(json) : nilaiTersimpan);
    kotor.delete(K);
    try { localStorage.removeItem(K); } catch { /* abaikan */ }
  }, [K, json]);
  const pulihkan = useCallback(() => { const v = draf?.nilai; setDraf(null); return v; }, [draf]);
  const buang = useCallback(() => { setDraf(null); try { localStorage.removeItem(K); } catch { /* abaikan */ } }, [K]);
  return { draf, pulihkan, buang, tersimpan };
}
