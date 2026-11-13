import { useEffect, useRef, useState } from 'react';

// Tampilkan isi selebar kertas (mm) lalu perkecil utuh agar muat di layar sempit (HP),
// sehingga susunannya sama seperti hasil cetak -- tidak "turun" per kata.
const PX_PER_MM = 96 / 25.4;
export default function SkalaKertas({ lebarMm, children }) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const hitung = () => setZoom(Math.min(1, el.clientWidth / (lebarMm * PX_PER_MM)));
    hitung();
    const ro = new ResizeObserver(hitung);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lebarMm]);
  return (
    <div ref={ref} className="skala-kertas">
      <div style={{ width: `${lebarMm}mm`, zoom, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
