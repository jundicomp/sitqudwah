import { formatRupiah } from '../../db/helpers';

// Tampilan nilai Rupiah yg konsisten dipakai di seluruh tabel: "Rp" selalu rata KIRI,
// angka rata KANAN (dalam sel yg sama) -- supaya digit satuan/puluhan/ratusan semua
// sejajar antar baris, gampang dibandingkan sekilas. Dipakai sbg pengganti nulis
// formatRupiah(x) polos di dalam <td>.
export default function Rupiah({ value, bold }) {
  const [prefix, ...rest] = formatRupiah(value).split(' ');
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : undefined }}>
      <span>{prefix}</span>
      <span>{rest.join(' ')}</span>
    </span>
  );
}
