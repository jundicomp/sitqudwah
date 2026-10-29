import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SatuRaporPaud } from './DokumenRaporPaud';

// Cetak rapor PAUD (1 anak atau banyak) lewat jendela cetak browser.
// Dokumen dipasang langsung di <body> (bukan di dalam modal) supaya terpotong rapi
// per halaman A4, lalu dibersihkan lagi setelah dialog cetak ditutup.
export default function CetakRaporPaud({ dokumen, onSelesai }) {
  useEffect(() => {
    let selesai = false;
    const bersih = () => {
      if (selesai) return; selesai = true;
      document.body.classList.remove('rp-printing');
      window.removeEventListener('afterprint', bersih);
      onSelesai && onSelesai();
    };
    document.body.classList.add('rp-printing');
    window.addEventListener('afterprint', bersih);
    // Tunggu foto selesai dimuat (maks 6 detik) sebelum membuka dialog cetak.
    const imgs = [...document.querySelectorAll('#rp-print-root img')];
    const tunggu = Promise.race([
      Promise.all(imgs.map(im => (im.complete ? null : new Promise(r => { im.onload = r; im.onerror = r; })))),
      new Promise(r => setTimeout(r, 6000)),
    ]);
    tunggu.then(() => { if (!selesai) { window.print(); setTimeout(bersih, 1000); } });
    return () => { document.body.classList.remove('rp-printing'); window.removeEventListener('afterprint', bersih); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = Array.isArray(dokumen) ? dokumen : [dokumen];
  return createPortal(
    <div id="rp-print-root" className="rp-dok">{list.map((d, i) => <SatuRaporPaud key={i} d={d} />)}</div>,
    document.body,
  );
}
