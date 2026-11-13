import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ukuranHalaman } from '../../db/halamanFields';

// =====================================================================
// LEMBAR CETAK (v1.71.0): pratinjau dokumen per lembar kertas, persis seperti
// hasil print. Isi dipecah per "blok" (mis. kop+judul, lalu tiap soal); blok
// tidak pernah terbelah -- kalau tidak muat, pindah ke lembar berikutnya.
// Yang dicetak = lembar-lembar yg sama (WYSIWYG), ukuran & margin dari `halaman`.
// =====================================================================
const PX_PER_MM = 96 / 25.4;

function Lembar({ u, nomor, total, children, tampilNomor }) {
  return (
    <div className="lembar" style={{ width: `${u.w}mm`, height: `${u.h}mm`, padding: `${u.atas}mm ${u.kanan}mm ${u.bawah}mm ${u.kiri}mm` }}>
      <div className="lembar-isi doc-print">{children}</div>
      {tampilNomor && total > 1 && <div className="lembar-nomor" style={{ bottom: `${Math.max(3, u.bawah / 2 - 2)}mm`, right: `${u.kanan}mm` }}>Halaman {nomor} dari {total}</div>}
    </div>
  );
}

const LembarCetak = forwardRef(function LembarCetak({ blok, halaman, nomorHalaman = true, onJumlah }, ref) {
  const u = ukuranHalaman(halaman);
  const ukurRef = useRef(null);
  const wadahRef = useRef(null);
  const [halamanBlok, setHalamanBlok] = useState([blok.map((_, i) => i)]);
  const [zoom, setZoom] = useState(1);
  const [cetak, setCetak] = useState(false);

  // Ukur tinggi tiap blok lalu kemas ke lembar-lembar.
  const kemas = useCallback(() => {
    const el = ukurRef.current;
    if (!el) return;
    const batas = u.tinggiIsi * PX_PER_MM - 2; // sedikit toleransi pembulatan
    const tinggi = [...el.children].map(c => c.getBoundingClientRect().height);
    const hasil = [];
    let kini = [], isi = 0;
    tinggi.forEach((t, i) => {
      if (kini.length && isi + t > batas) { hasil.push(kini); kini = []; isi = 0; }
      kini.push(i); isi += t;
    });
    if (kini.length) hasil.push(kini);
    setHalamanBlok(hasil.length ? hasil : [[]]);
  }, [u.tinggiIsi]);

  useLayoutEffect(() => { kemas(); }, [kemas, blok, u.w, u.kiri, u.kanan]);
  // Gambar (logo kop) bisa selesai dimuat belakangan -> ukur ulang.
  useEffect(() => {
    const imgs = [...(ukurRef.current?.querySelectorAll('img') || [])];
    imgs.forEach(im => im.addEventListener('load', kemas));
    document.fonts?.ready?.then(kemas);
    return () => imgs.forEach(im => im.removeEventListener('load', kemas));
  }, [kemas, blok]);
  useEffect(() => { onJumlah?.(halamanBlok.length); }, [halamanBlok.length, onJumlah]);

  // Perkecil tampilan bila wadah lebih sempit dari kertas.
  useEffect(() => {
    const el = wadahRef.current;
    if (!el) return undefined;
    const hitung = () => setZoom(Math.min(1, (el.clientWidth - 24) / (u.w * PX_PER_MM)));
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(el);
    return () => ro.disconnect();
  }, [u.w]);

  useImperativeHandle(ref, () => ({ cetak: () => setCetak(true), jumlah: halamanBlok.length }), [halamanBlok.length]);

  useEffect(() => {
    if (!cetak) return undefined;
    const gaya = document.createElement('style');
    gaya.textContent = `@media print { @page { size: ${u.w}mm ${u.h}mm; margin: 0; } }`;
    document.head.appendChild(gaya);
    document.body.classList.add('lb-printing');
    let selesai = false;
    const bersih = () => {
      if (selesai) return; selesai = true;
      document.body.classList.remove('lb-printing'); gaya.remove(); setCetak(false);
      window.removeEventListener('afterprint', bersih);
    };
    window.addEventListener('afterprint', bersih);
    const t = setTimeout(() => { window.print(); setTimeout(bersih, 1000); }, 150);
    return () => clearTimeout(t);
  }, [cetak, u.w, u.h]);

  const daftar = (tampilNomor) => halamanBlok.map((idx, i) => (
    <Lembar key={i} u={u} nomor={i + 1} total={halamanBlok.length} tampilNomor={tampilNomor}>
      {idx.map(j => <div key={blok[j].key} className="lembar-blok">{blok[j].node}</div>)}
    </Lembar>
  ));

  return (
    <div className="lembar-wadah" ref={wadahRef}>
      {/* pengukur tak terlihat, lebar = lebar area isi kertas */}
      <div className="lembar-ukur doc-print" ref={ukurRef} style={{ width: `${u.w - u.kiri - u.kanan}mm` }} aria-hidden="true">
        {blok.map(b => <div key={b.key} className="lembar-blok">{b.node}</div>)}
      </div>
      <div className="lembar-tumpuk" style={{ zoom }}>{daftar(nomorHalaman)}</div>
      {cetak && createPortal(<div id="lembar-print-root">{daftar(nomorHalaman)}</div>, document.body)}
    </div>
  );
});

export default LembarCetak;
