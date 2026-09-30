// Pembungkus kecil recharts utk halaman Laporan & Grafik -- warna diambil dari palet tema.
import { ResponsiveContainer } from 'recharts';

export const WARNA = { hijau: '#1C7A3C', hijauTua: '#123D22', emas: '#F0B429', merah: '#B23B2E', biru: '#1E4FA0', ungu: '#5B3E8E', abu: '#8A9A90' };
export const WARNA_STATUS = { Hadir: WARNA.hijau, Sakit: WARNA.biru, Izin: WARNA.emas, Alpha: WARNA.merah, 'Dinas Luar': WARNA.ungu };
export const WARNA_PREDIKAT = { A: WARNA.hijauTua, B: WARNA.hijau, C: WARNA.emas, D: WARNA.merah };
export const juta = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}rb` : String(v));

export function ChartCard({ judul, sub, tinggi = 260, kosong, children, aksi }) {
  return (
    <div className="card" style={{ flex: '1 1 420px', minWidth: 0 }}>
      <div className="card-head"><div><h3>{judul}</h3>{sub && <p>{sub}</p>}</div>{aksi}</div>
      <div className="card-body">
        {kosong ? <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>{kosong}</p> : (
          <ResponsiveContainer width="100%" height={tinggi}>{children}</ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function Baris({ children }) {
  return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>{children}</div>;
}
