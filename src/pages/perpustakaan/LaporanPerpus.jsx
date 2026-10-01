import ClipCell from '../../components/common/ClipCell';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Page from '../../components/layout/Page';
import InfoCard from '../../components/common/InfoCard';
import { AkademikBelumTersambung, Field } from '../../components/akademik/shared';
import { ChartCard, Baris, WARNA } from '../../components/akademik/charts';
import { useAppData } from '../../context/AppContext';
import { dalamRentang } from '../../db/akademikFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { exportToExcel } from '../../utils/exportTable';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PALET = [WARNA.hijau, WARNA.biru, WARNA.emas, WARNA.ungu, WARNA.merah, WARNA.hijauTua, WARNA.abu, '#3A8F9E', '#C46A2B', '#7A7A2E'];
const top = (map, n = 10) => Object.values(map).sort((a, b) => b.n - a.n).slice(0, n);

function Tabel({ judul, sub, kolom, data, file }) {
  return (
    <div className="card" style={{ flex: '1 1 360px', minWidth: 0 }}>
      <div className="card-head"><div><h3>{judul}</h3>{sub && <p>{sub}</p>}</div>
        <button className="btn btn-sm" disabled={!data.length} onClick={() => exportToExcel(kolom.map(k => k[1]), data.map(d => Object.fromEntries(kolom.map(([k, l]) => [l, d[k]]))), file, judul)}>📊 Excel</button></div>
      <div className="card-body table-scroll">
        {!data.length ? <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>Belum ada data.</p> : (
          <table><thead><tr><th>#</th>{kolom.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
            <tbody>{data.map((d, i) => <tr key={i}><td>{i + 1}</td>{kolom.map(([k], j) => <td key={k}>{j === 0 ? <b><ClipCell value={d[k]} maxWidth={240} /></b> : d[k]}</td>)}</tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

export default function LaporanPerpus() {
  const { sirkulasi, buku, dendaPerpus, tahunAjaranAktif } = useAppData();
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(sekarangWIB().tanggal);
  useEffect(() => { if (!dari && tahunAjaranAktif?.mulai) setDari(String(tahunAjaranAktif.mulai).slice(0, 10)); }, [tahunAjaranAktif, dari]);

  const d = useMemo(() => {
    const data = sirkulasi.filter(x => dalamRentang(x.pinjam, dari, sampai));
    const kategoriOf = Object.fromEntries(buku.map(b => [b.kode, b.kategori || 'Lainnya']));
    const perBuku = {}; const perAgt = {}; const perKelas = {}; const perKat = {}; const perBulan = {};
    data.forEach(x => {
      (perBuku[x.kodeBuku] ||= { judul: x.judul, kode: x.kodeBuku, n: 0 }).n++;
      (perAgt[x.kodeAnggota] ||= { nama: x.nama, kelas: x.kelas, n: 0 }).n++;
      (perKelas[x.kelas || '-'] ||= { kelas: x.kelas || '-', n: 0 }).n++;
      const k = kategoriOf[x.kodeBuku] || 'Lainnya'; perKat[k] = (perKat[k] || 0) + 1;
      const b = x.pinjam.slice(0, 7); perBulan[b] = (perBulan[b] || 0) + 1;
    });
    const kembali = data.filter(x => x.status === 'Dikembalikan');
    const telat = kembali.filter(x => x.kembali > x.jatuhTempo).length;
    const denda = dendaPerpus.filter(x => dalamRentang(x.tanggal, dari, sampai));
    return {
      total: data.length, kembali: kembali.length, aktif: data.filter(x => x.status === 'Dipinjam').length,
      persenTelat: kembali.length ? Math.round((telat / kembali.length) * 100) : 0,
      denda: denda.reduce((a, x) => a + x.nominal, 0), dendaLunas: denda.filter(x => x.status === 'Lunas').reduce((a, x) => a + x.nominal, 0),
      topBuku: top(perBuku), topAgt: top(perAgt), topKelas: top(perKelas),
      kategori: Object.entries(perKat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      bulanan: Object.keys(perBulan).sort().map(k => ({ bulan: `${BULAN[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`, Peminjaman: perBulan[k] })),
      tidurTak: buku.filter(b => b.jenis !== 'Digital' && !perBuku[b.kode]).length,
    };
  }, [sirkulasi, buku, dendaPerpus, dari, sampai]);

  const ket = `${dari || 'awal'}_${sampai}`;
  return (
    <Page pageId="laporan-perpus" title="Laporan Sirkulasi" path="Perpustakaan / Laporan Sirkulasi">
      <AkademikBelumTersambung />
      <div className="filter-bar">
        <Field label="Dari"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
        <Field label="Sampai"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
      </div>
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={d.total} label={`Peminjaman · ${d.aktif} belum kembali`} color="c-green" />
        <InfoCard value={`${d.persenTelat}%`} label={`Terlambat dari ${d.kembali} pengembalian`} color="c-gold" />
        <InfoCard value={formatRupiah(d.denda)} label={`Denda · ${formatRupiah(d.dendaLunas)} lunas`} color="c-red" valueFontSize={20} />
        <InfoCard value={d.tidurTak} label="Judul fisik tak pernah dipinjam di periode ini" color="c-purple" />
      </div>
      <Baris>
        <ChartCard judul="Peminjaman per bulan" kosong={!d.bulanan.length && 'Belum ada peminjaman di periode ini.'}>
          <BarChart data={d.bulanan}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bulan" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="Peminjaman" fill={WARNA.hijau} radius={[3, 3, 0, 0]} /></BarChart>
        </ChartCard>
        <ChartCard judul="Peminjaman per kategori buku" kosong={!d.kategori.length && 'Belum ada data.'}>
          <PieChart><Pie data={d.kategori} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>{d.kategori.map((x, i) => <Cell key={x.name} fill={PALET[i % PALET.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
        </ChartCard>
      </Baris>
      <Baris>
        <Tabel judul="Buku terpopuler" kolom={[['judul', 'Judul'], ['kode', 'Kode'], ['n', 'Dipinjam']]} data={d.topBuku} file={`Buku_Terpopuler_${ket}`} />
        <Tabel judul="Peminjam teraktif" kolom={[['nama', 'Nama'], ['kelas', 'Kelas / Kategori'], ['n', 'Peminjaman']]} data={d.topAgt} file={`Peminjam_Teraktif_${ket}`} />
        <Tabel judul="Kelas paling rajin membaca" kolom={[['kelas', 'Kelas / Kategori'], ['n', 'Peminjaman']]} data={d.topKelas} file={`Peminjaman_per_Kelas_${ket}`} />
      </Baris>
    </Page>
  );
}
