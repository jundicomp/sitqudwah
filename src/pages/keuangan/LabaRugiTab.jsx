import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { rekapPemasukanBulanan, rekapPengeluaranBulanan, pembayaranAsli, bulanTahunAjaran } from '../../db/laporanHelpers';
import { KATEGORI_PENGELUARAN_OPTIONS } from '../../db/pengeluaranFields';
import { formatRupiah, parseTanggalFleksibel } from '../../db/helpers';
import InfoCard from '../../components/common/InfoCard';
import { IconTrendUp, IconTrendDown, IconCheckCircle, IconAlertTriangle } from '../../components/common/icons';
import Rupiah from '../../components/common/Rupiah';
import { exportToExcel } from '../../utils/exportTable';

export default function LabaRugiTab() {
  const { tahunAjaran, tahunAjaranAktif, pembayaran, pengeluaran, pemasukanLain, pembayaranLoaded, pengeluaranLoaded, pemasukanLainLoaded } = useAppData();
  const [taLabel, setTaLabel] = useState(null);
  const [bulanIdx, setBulanIdx] = useState(null); // null = "Semua Bulan" (tabel ringkas)

  const labelDipakai = taLabel || tahunAjaranAktif?.label;
  const bulanList = useMemo(() => labelDipakai ? bulanTahunAjaran(labelDipakai) : [], [labelDipakai]);
  const bulanTerpilih = bulanIdx !== null ? bulanList[bulanIdx] : null;

  const gabungan = useMemo(() => {
    if (!labelDipakai) return [];
    const pemasukan = rekapPemasukanBulanan(labelDipakai, pembayaran, pemasukanLain);
    const pengeluaranBulan = rekapPengeluaranBulanan(labelDipakai, pengeluaran);
    return pemasukan.map((p, i) => ({
      label: p.label,
      pemasukan: p.total,
      pengeluaran: pengeluaranBulan[i].total,
      labaRugi: p.total - pengeluaranBulan[i].total,
    }));
  }, [labelDipakai, pembayaran, pengeluaran, pemasukanLain]);

  const totalSetahun = useMemo(() => ({
    pemasukan: gabungan.reduce((s, g) => s + g.pemasukan, 0),
    pengeluaran: gabungan.reduce((s, g) => s + g.pengeluaran, 0),
    labaRugi: gabungan.reduce((s, g) => s + g.labaRugi, 0),
  }), [gabungan]);

  // Rincian utk 1 BULAN SPESIFIK -- disusun VERTIKAL (Pendapatan lalu Pengeluaran lalu
  // Laba/Rugi), persis gaya Neraca, bukan tabel ringkas 12-baris.
  const rincianBulan = useMemo(() => {
    if (!bulanTerpilih) return null;
    const dalamBulan = (tglRaw) => {
      const d = parseTanggalFleksibel(tglRaw);
      return d && d.getMonth() === bulanTerpilih.monthIdx && d.getFullYear() === bulanTerpilih.calYear;
    };
    const asli = pembayaranAsli(pembayaran).filter(p => dalamBulan(p.tanggalBayar));
    const spp = asli.filter(p => p.refType === 'SPP').reduce((s, p) => s + p.nominal, 0);
    const biayaLainSiswa = asli.filter(p => p.refType === 'LAIN').reduce((s, p) => s + p.nominal, 0);
    const pemasukanLainBulan = pemasukanLain.filter(p => dalamBulan(p.tanggal)).reduce((s, p) => s + p.nominal, 0);
    const totalPendapatan = spp + biayaLainSiswa + pemasukanLainBulan;

    const pengeluaranBulan = pengeluaran.filter(p => dalamBulan(p.tanggal));
    const perKategori = KATEGORI_PENGELUARAN_OPTIONS.map(k => ({
      kategori: k,
      nominal: pengeluaranBulan.filter(p => p.kategori === k).reduce((s, p) => s + p.nominal, 0),
    }));
    const totalPengeluaran = perKategori.reduce((s, k) => s + k.nominal, 0);

    return { spp, biayaLainSiswa, pemasukanLainBulan, totalPendapatan, perKategori, totalPengeluaran, labaRugi: totalPendapatan - totalPengeluaran };
  }, [bulanTerpilih, pembayaran, pemasukanLain, pengeluaran]);

  const dataSiap = pembayaranLoaded || pengeluaranLoaded || pemasukanLainLoaded;

  if (tahunAjaran.length === 0) {
    return <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran.</div></div>;
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>📊 Laba Rugi</h3><p>{bulanTerpilih ? `Rincian ${bulanTerpilih.label}.` : 'Selisih pemasukan sungguhan dan pengeluaran, per bulan.'}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={labelDipakai || ''} onChange={e => { setTaLabel(e.target.value); setBulanIdx(null); }} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            {tahunAjaran.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
          <select value={bulanIdx === null ? '' : bulanIdx} onChange={e => setBulanIdx(e.target.value === '' ? null : Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            <option value="">Semua Bulan (Ringkas)</option>
            {bulanList.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => {
            if (bulanTerpilih && rincianBulan) {
              exportToExcel(
                ['Bagian', 'Keterangan', 'Nominal'],
                [
                  { Bagian: 'Pendapatan', Keterangan: 'Pendapatan SPP', Nominal: rincianBulan.spp },
                  { Bagian: 'Pendapatan', Keterangan: 'Pendapatan Biaya Lain Siswa', Nominal: rincianBulan.biayaLainSiswa },
                  { Bagian: 'Pendapatan', Keterangan: 'Pendapatan Lain-lain (Non-Siswa)', Nominal: rincianBulan.pemasukanLainBulan },
                  { Bagian: 'Pendapatan', Keterangan: 'Total Pendapatan', Nominal: rincianBulan.totalPendapatan },
                  ...rincianBulan.perKategori.map(k => ({ Bagian: 'Pengeluaran', Keterangan: `Beban ${k.kategori}`, Nominal: k.nominal })),
                  { Bagian: 'Pengeluaran', Keterangan: 'Total Pengeluaran', Nominal: rincianBulan.totalPengeluaran },
                  { Bagian: 'Laba/Rugi', Keterangan: 'Laba/Rugi Bersih', Nominal: rincianBulan.labaRugi },
                ],
                'Laba Rugi', `Laba Rugi — ${bulanTerpilih.label}`
              );
            } else {
              exportToExcel(
                ['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba/Rugi'],
                gabungan.map(g => ({ Bulan: g.label, Pemasukan: g.pemasukan, Pengeluaran: g.pengeluaran, 'Laba/Rugi': g.labaRugi })),
                'Laba Rugi', `Laba Rugi — ${labelDipakai}`
              );
            }
          }}>📊 Excel</button>
        </div>
      </div>
      <div className="card-body">
        {!dataSiap && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>}

        {dataSiap && !bulanTerpilih && (
          <>
            <div className="info-grid" style={{ marginBottom: 20 }}>
              <InfoCard icon={IconTrendUp} color="c-green" value={formatRupiah(totalSetahun.pemasukan)} label="Total Pemasukan" valueFontSize={18} />
              <InfoCard icon={IconTrendDown} color="c-red" value={formatRupiah(totalSetahun.pengeluaran)} label="Total Pengeluaran" valueFontSize={18} />
              <InfoCard
                icon={totalSetahun.labaRugi >= 0 ? IconCheckCircle : IconAlertTriangle}
                color={totalSetahun.labaRugi >= 0 ? 'c-blue' : 'c-red'}
                value={formatRupiah(totalSetahun.labaRugi)}
                label={totalSetahun.labaRugi >= 0 ? 'Laba Setahun' : 'Rugi Setahun'}
                valueFontSize={18}
              />
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Bulan</th><th>Pemasukan</th><th>Pengeluaran</th><th>Laba / Rugi</th></tr></thead>
                <tbody>
                  {gabungan.map(g => (
                    <tr key={g.label}>
                      <td>{g.label}</td>
                      <td><Rupiah value={g.pemasukan} /></td>
                      <td><Rupiah value={g.pengeluaran} /></td>
                      <td style={{ color: g.labaRugi >= 0 ? 'var(--green-dark)' : 'var(--red)' }}>
                        <Rupiah value={g.labaRugi} bold />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800 }}>
                    <td>Total Setahun</td>
                    <td><Rupiah value={totalSetahun.pemasukan} bold /></td>
                    <td><Rupiah value={totalSetahun.pengeluaran} bold /></td>
                    <td style={{ color: totalSetahun.labaRugi >= 0 ? 'var(--green-dark)' : 'var(--red)' }}>
                      <Rupiah value={totalSetahun.labaRugi} bold />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {dataSiap && bulanTerpilih && rincianBulan && (
          <div className="table-scroll">
            <table>
              <thead><tr><th colSpan={2}>PENDAPATAN</th></tr></thead>
              <tbody>
                <tr><td>Pendapatan SPP</td><td><Rupiah value={rincianBulan.spp} bold /></td></tr>
                <tr><td>Pendapatan Biaya Lain Siswa</td><td><Rupiah value={rincianBulan.biayaLainSiswa} bold /></td></tr>
                <tr><td>Pendapatan Lain-lain (Non-Siswa)</td><td><Rupiah value={rincianBulan.pemasukanLainBulan} bold /></td></tr>
                <tr style={{ fontWeight: 800, background: '#F6F8F5' }}><td>Total Pendapatan</td><td><Rupiah value={rincianBulan.totalPendapatan} bold /></td></tr>
              </tbody>
              <thead><tr><th colSpan={2}>PENGELUARAN (BEBAN)</th></tr></thead>
              <tbody>
                {rincianBulan.perKategori.map(k => (
                  <tr key={k.kategori}><td>Beban {k.kategori}</td><td><Rupiah value={k.nominal} bold /></td></tr>
                ))}
                <tr style={{ fontWeight: 800, background: '#F6F8F5' }}><td>Total Pengeluaran</td><td><Rupiah value={rincianBulan.totalPengeluaran} bold /></td></tr>
              </tbody>
              <thead><tr><th colSpan={2}>LABA / RUGI BERSIH</th></tr></thead>
              <tbody>
                <tr style={{ fontWeight: 800, background: rincianBulan.labaRugi >= 0 ? 'var(--green-soft)' : '#F8E7E3' }}>
                  <td>Total Pendapatan dikurangi Total Pengeluaran</td>
                  <td style={{ color: rincianBulan.labaRugi >= 0 ? 'var(--green-dark)' : 'var(--red)' }}>
                    <Rupiah value={rincianBulan.labaRugi} bold />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
