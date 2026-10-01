import { useLayoutEffect, useRef, useState } from 'react';

// Isi sel tabel 1 baris. Kalau teksnya lebih panjang dari lebar sel, dipotong "…"
// dan muncul tombol "more" utk membuka seluruh isi (dan "less" utk melipat lagi).
// Teks pendek (<= 24 karakter) langsung dirender polos tanpa pengukuran -- hemat
// utk tabel besar yg kebanyakan selnya pendek (NISN, tanggal, angka).
export default function ClipCell({ value, maxWidth = 260 }) {
  const teks = value === null || value === undefined ? '' : String(value);
  const ref = useRef(null);
  const [terpotong, setTerpotong] = useState(false);
  const [buka, setBuka] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || buka) return;
    setTerpotong(el.scrollWidth > el.clientWidth + 1);
  }, [teks, buka, maxWidth]);

  if (teks.length <= 24) return teks;
  return (
    <div className={`cell-clip-wrap${buka ? ' buka' : ''}`}>
      <span ref={ref} className="cell-clip" style={{ maxWidth }} title={buka ? undefined : teks}>{teks}</span>
      {(terpotong || buka) && (
        <button type="button" className="cell-more" onClick={() => setBuka(b => !b)} aria-expanded={buka}>
          {buka ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}
