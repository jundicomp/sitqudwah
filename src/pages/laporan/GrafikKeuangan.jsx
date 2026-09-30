import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Page from '../../components/layout/Page';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import InfoCard from '../../components/common/InfoCard';
import { Field, Select } from '../../components/akademik/shared';
import { ChartCard, Baris, WARNA, juta } from '../../components/akademik/charts';
import { useAppData } from '../../context/AppContext';
import { dalamRentang } from '../../db/akademikFields';
import { rekapPemasukanBulanan, rekapPengeluaranBulanan } from '../../db/laporanHelpers';
import { formatRupiah } from '../../db/helpers';

const PALET = [WARNA.hijau, WARNA.biru, WARNA.emas, WARNA.ungu, WARNA.merah, WARNA.hijauTua, WARNA.abu];

export default function GrafikKeuangan() {
  const { pembayaran, pemasukanLain, pengeluaran, tagihanSpp, allTagihan, tagihanTerbayar, siswa, tahunAjaran } = useAppData();
  const { tahunAjaranOptions, taAktif } = useAkademikOptions();
  const [ta, setTa] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);

  const d = useMemo(() => {
    if (!ta) return null;
    const masuk = rekapPemasukanBulanan(ta, pembayaran, pemasukanLain);
    const keluar = rekapPengeluaranBulanan(ta, pengeluaran);
    let saldo = 0;
    const bulanan = masuk.map((b, i) => {
      const k = keluar[i]?.total || 0;
      saldo += b.total - k;
      return { bulan: b.label.split(' ')[0].slice(0, 3), SPP: b.spp, 'Biaya Lain': b.lain, 'Pemasukan Lain': b.lainnya, Pemasukan: b.total, Pengeluaran: k, 'Saldo Kumulatif': saldo };
    });
    const tot = (k) => bulanan.reduce((a, b) => a + b[k], 0);
    const komposisi = [['SPP', tot('SPP')], ['Biaya Lain', tot('Biaya Lain')], ['Pemasukan Lain', tot('Pemasukan Lain')]].map(([name, value]) => ({ name, value })).filter(x => x.value > 0);
    const taObj = tahunAjaran.find(t => t.label === ta);
    const perKat = {};
    pengeluaran.filter(p => !taObj || dalamRentang(String(p.tanggal).slice(0, 10), taObj.mulai, taObj.selesai)).forEach(p => { perKat[p.kategori || 'Lainnya'] = (perKat[p.kategori || 'Lainnya'] || 0) + (Number(p.nominal) || 0); });
    const kategoriKeluar = Object.entries(perKat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // Tingkat penagihan SPP per bulan tagihan (bukan bulan bayar).
    const perLabel = {};
    tagihanSpp.filter(t => t.tahunAjaran === ta).forEach(t => {
      const key = `${t.tahunKalender}-${String(t.bulan).padStart(2, '0')}|${t.label}`;
      const x = (perLabel[key] ||= { tagihan: 0, bayar: 0 });
      x.tagihan += t.nominal; x.bayar += Math.min(t.nominal, tagihanTerbayar(t.refType, t.no, t.nisn));
    });
    const koleksi = Object.keys(perLabel).sort().map(k => ({ bulan: k.split('|')[1].split(' ')[0].slice(0, 3), 'Tingkat Penagihan': perLabel[k].tagihan ? Math.round((perLabel[k].bayar / perLabel[k].tagihan) * 1000) / 10 : 0 }));
    const tingkatOf = Object.fromEntries(siswa.map(s => [s.nisn, s.kelasTingkat || '-']));
    const tungTingkat = {};
    allTagihan.filter(t => t.tahunAjaran === ta).forEach(t => {
      const sisa = t.nominal - tagihanTerbayar(t.refType, t.no, t.nisn);
      if (sisa > 0) { const k = tingkatOf[t.nisn] || '-'; tungTingkat[k] = (tungTingkat[k] || 0) + sisa; }
    });
    const tunggakan = Object.keys(tungTingkat).sort().map(k => ({ kelas: k === '-' ? 'Tanpa kelas' : `Kelas ${k}`, Tunggakan: tungTingkat[k] }));
    return { bulanan, komposisi, kategoriKeluar, koleksi, tunggakan, masuk: tot('Pemasukan'), keluar: tot('Pengeluaran'), totTunggak: Object.values(tungTingkat).reduce((a, b) => a + b, 0) };
  }, [ta, pembayaran, pemasukanLain, pengeluaran, tagihanSpp, allTagihan, tagihanTerbayar, siswa, tahunAjaran]);

  const rupiah = v => formatRupiah(v);
  return (
    <Page pageId="grafik-keuangan" title="Grafik Keuangan" path="Laporan & Grafik / Grafik Keuangan">
      <div className="filter-bar"><Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field></div>
      {d && (
        <>
          <div className="info-grid" style={{ marginBottom: 16 }}>
            <InfoCard value={formatRupiah(d.masuk)} label="Total pemasukan" color="c-green" valueFontSize={20} />
            <InfoCard value={formatRupiah(d.keluar)} label="Total pengeluaran" color="c-red" valueFontSize={20} />
            <InfoCard value={formatRupiah(d.masuk - d.keluar)} label="Surplus / defisit" color="c-blue" valueFontSize={20} />
            <InfoCard value={formatRupiah(d.totTunggak)} label="Tunggakan tahun ajaran ini" color="c-gold" valueFontSize={20} />
          </div>
          <ChartCard judul="Pemasukan vs pengeluaran per bulan" sub="Garis = saldo kumulatif sejak awal tahun ajaran (tanpa saldo awal)." tinggi={300}>
            <BarChart data={d.bulanan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={juta} tick={{ fontSize: 11 }} />
              <Tooltip formatter={rupiah} /><Legend />
              <Bar dataKey="Pemasukan" fill={WARNA.hijau} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Pengeluaran" fill={WARNA.merah} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
          <Baris>
            <ChartCard judul="Saldo kumulatif" kosong={!d.bulanan.length && 'Belum ada data.'}>
              <LineChart data={d.bulanan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} /><YAxis tickFormatter={juta} tick={{ fontSize: 11 }} />
                <Tooltip formatter={rupiah} />
                <Line type="monotone" dataKey="Saldo Kumulatif" stroke={WARNA.biru} strokeWidth={2.5} />
              </LineChart>
            </ChartCard>
            <ChartCard judul="Tingkat penagihan SPP" sub="% tagihan SPP tiap bulan yang sudah terbayar." kosong={!d.koleksi.length && 'Belum ada tagihan SPP di tahun ajaran ini.'}>
              <BarChart data={d.koleksi}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="Tingkat Penagihan" fill={WARNA.hijauTua} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>
          </Baris>
          <Baris>
            <ChartCard judul="Sumber pemasukan" kosong={!d.komposisi.length && 'Belum ada pemasukan.'}>
              <PieChart>
                <Pie data={d.komposisi} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>{d.komposisi.map((x, i) => <Cell key={x.name} fill={PALET[i]} />)}</Pie>
                <Tooltip formatter={rupiah} /><Legend />
              </PieChart>
            </ChartCard>
            <ChartCard judul="Pengeluaran per kategori" kosong={!d.kategoriKeluar.length && 'Belum ada pengeluaran.'}>
              <PieChart>
                <Pie data={d.kategoriKeluar} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>{d.kategoriKeluar.map((x, i) => <Cell key={x.name} fill={PALET[i % PALET.length]} />)}</Pie>
                <Tooltip formatter={rupiah} /><Legend />
              </PieChart>
            </ChartCard>
            <ChartCard judul="Tunggakan per tingkat" kosong={!d.tunggakan.length && 'Tidak ada tunggakan.'}>
              <BarChart data={d.tunggakan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="kelas" tick={{ fontSize: 11 }} /><YAxis tickFormatter={juta} tick={{ fontSize: 11 }} />
                <Tooltip formatter={rupiah} />
                <Bar dataKey="Tunggakan" fill={WARNA.emas} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>
          </Baris>
        </>
      )}
    </Page>
  );
}
