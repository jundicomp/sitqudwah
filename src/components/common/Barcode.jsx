import { barcodeRects } from '../../utils/code128';

// Barcode Code128 sbg SVG. height/width dalam px; teks di bawah opsional.
export default function Barcode({ value, height = 48, width, showText = true, fontSize = 11 }) {
  let data;
  try { data = barcodeRects(value); } catch { return <span style={{ color: 'var(--red)', fontSize: 12 }}>Kode tidak valid</span>; }
  const tinggiTeks = showText ? fontSize + 4 : 0;
  return (
    <svg viewBox={`0 0 ${data.total} ${height + tinggiTeks}`} width={width || data.total * 1.6} height={height + tinggiTeks}
      preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`} style={{ background: '#fff', display: 'block' }}>
      {data.rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="#000" />)}
      {showText && <text x={data.total / 2} y={height + fontSize + 1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>}
    </svg>
  );
}
