import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SatuRaporPaud } from './DokumenRaporPaud';
import { SatuRaporSd } from '../raporSd/DokumenRaporSd';
import { SatuModul } from '../modulAjar/DokumenModul';
import { SatuRencanaPaud } from '../modulAjar/DokumenRencanaPaud';
import { SatuStsb } from '../stsb/DokumenStsb';
import { cssPage, ukuranHalaman } from '../../../db/halamanFields';

// Cetak rapor (PAUD atau SD -- dilihat dari d.jenis; 1 anak atau banyak) lewat jendela cetak browser.
// Dokumen dipasang langsung di <body> (bukan di dalam modal) supaya terpotong rapi
// per halaman A4, lalu dibersihkan lagi setelah dialog cetak ditutup.
// v1.66.2: rapor PAUD & SD dicetak di kertas F4 (215 x 330 mm). Modul ajar & RPPM tetap A4.
const UKURAN_F4 = '215mm 330mm';
export const kertasDokumen = (list) => (list.every(d => !d?.jenis || d.jenis === 'SD' || d.jenis === 'PAUD') ? 'F4' : 'A4');

export default function CetakRaporPaud({ dokumen, onSelesai }) {
  const list0 = Array.isArray(dokumen) ? dokumen : [dokumen];
  const f4 = kertasDokumen(list0) === 'F4';
  useEffect(() => {
    let selesai = false;
    // @page tidak bisa dibedakan per class body, jadi aturan ukuran kertas F4 dipasang
    // sementara selama mencetak lalu dilepas lagi.
    let gaya = null;
    const hal = list0.find(d => d?.jenis === 'STSB')?.st?.halaman;
    if (hal) {
      const u = ukuranHalaman(hal);
      gaya = document.createElement('style');
      gaya.id = 'rp-kertas-stsb';
      gaya.textContent = `@media print { ${cssPage(hal)} body.rp-printing .rp-hal.stsb { width: auto !important; min-height: ${u.tinggiIsi - 1}mm !important; padding: 0 !important; margin: 0 !important; } }`;
      document.head.appendChild(gaya);
    } else if (f4) {
      gaya = document.createElement('style');
      gaya.id = 'rp-kertas-f4';
      gaya.textContent = `@media print { @page { size: ${UKURAN_F4}; margin: 14mm 12mm; } body.rp-printing .rp-hal { min-height: 298mm; } }`;
      document.head.appendChild(gaya);
    }
    const bersih = () => {
      if (selesai) return; selesai = true;
      gaya?.remove();
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
    return () => { gaya?.remove(); document.body.classList.remove('rp-printing'); window.removeEventListener('afterprint', bersih); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = Array.isArray(dokumen) ? dokumen : [dokumen];
  return createPortal(
    <div id="rp-print-root" className="rp-dok">{list.map((d, i) => (d?.jenis === 'SD' ? <SatuRaporSd key={i} d={d} /> : d?.jenis === 'MODUL' ? <SatuModul key={i} d={d} /> : d?.jenis === 'RPPM' ? <SatuRencanaPaud key={i} d={d} /> : d?.jenis === 'STSB' ? <SatuStsb key={i} d={d} /> : <SatuRaporPaud key={i} d={d} />))}</div>,
    document.body,
  );
}
