import { useId, useMemo } from 'react';
import Page from '../../components/layout/Page';
import useSheetResource from '../../hooks/useSheetResource';
import { normalizeSheetPeminjaman } from '../../db/peminjamanFields';
import { normalizeSheetPemeliharaan } from '../../db/pemeliharaanFields';
import { fetchPeminjamanFromSheet, fetchPemeliharaanFromSheet } from '../../services/googleSheets';
import { formatRupiah, parseTanggalFleksibel, formatTanggalTampil, todayWIB } from '../../db/helpers';
import { useAppData } from '../../context/AppContext';
import { printElementById } from '../../utils/exportTable';
import { exportLaporanKeWord } from '../../utils/exportWord';
import InfoCard from '../../components/common/InfoCard';
import { IconCheckCircle, IconAlertTriangle, IconXCircle, IconMoney } from '../../components/common/icons';
import Rupiah from '../../components/common/Rupiah';

const KONDISI_LIST = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

export default function LaporanRekapAset() {
  const { aset, asetLoaded, profilSekolah } = useAppData();
  const peminjamanRes = useSheetResource(fetchPeminjamanFromSheet, normalizeSheetPeminjaman);
  const pemeliharaanRes = useSheetResource(fetchPemeliharaanFromSheet, normalizeSheetPemeliharaan);
  const printId = 'print-' + useId().replace(/:/g, '');

  const perKategori = useMemo(() => {
    const map = {};
    aset.forEach(a => {
      if (!map[a.kategori]) map[a.kategori] = { Baik: 0, 'Rusak Ringan': 0, 'Rusak Berat': 0, total: 0, nilai: 0 };
      map[a.kategori]['Baik'] += a.baik;
      map[a.kategori]['Rusak Ringan'] += a.rusakRingan;
      map[a.kategori]['Rusak Berat'] += a.rusakBerat;
      map[a.kategori].total += a.total;
      map[a.kategori].nilai += a.nilaiTotal;
    });
    return map;
  }, [aset]);

  const totalKondisi = useMemo(() => {
    const t = { Baik: 0, 'Rusak Ringan': 0, 'Rusak Berat': 0, nilai: 0 };
    aset.forEach(a => {
      t['Baik'] += a.baik;
      t['Rusak Ringan'] += a.rusakRingan;
      t['Rusak Berat'] += a.rusakBerat;
      t.nilai += a.nilaiTotal;
    });
    return t;
  }, [aset]);

  const sedangDipinjam = useMemo(() => {
    const now = new Date();
    return peminjamanRes.data
      .filter(p => p.status === 'Dipinjam')
      .map(p => {
        const rencana = parseTanggalFleksibel(p.rencanaKembali);
        const terlambat = rencana && rencana < now;
        return { ...p, terlambat };
      });
  }, [peminjamanRes.data]);

  const ringkasanPemeliharaan = useMemo(() => {
    const totalBiaya = pemeliharaanRes.data.reduce((s, p) => s + p.biaya, 0);
    const selesai = pemeliharaanRes.data.filter(p => p.status === 'Selesai').length;
    const prosesnya = pemeliharaanRes.data.filter(p => p.status === 'Dalam Proses').length;
    return { totalBiaya, selesai, prosesnya, total: pemeliharaanRes.data.length };
  }, [pemeliharaanRes.data]);

  const dataSiap = asetLoaded && peminjamanRes.loaded && pemeliharaanRes.loaded;
  const namaSekolah = profilSekolah?.nama || 'MI Ikhlasiyah';

  function handleExportPdf() {
    printElementById(printId);
  }

  async function handleExportWord() {
    const kategoriRows = Object.entries(perKategori).map(([k, v]) => [k, v['Baik'], v['Rusak Ringan'], v['Rusak Berat'], v.total, formatRupiah(v.nilai)]);
    const pinjamRows = sedangDipinjam.map(p => [p.namaAset, `${p.peminjam} (${p.jenisPeminjam})`, p.jumlah, formatTanggalTampil(p.rencanaKembali), p.terlambat ? 'Terlambat' : 'Dipinjam']);

    await exportLaporanKeWord({
      judul: 'LAPORAN REKAP ASET',
      subjudul: `${namaSekolah} — Dicetak ${todayWIB()}`,
      filename: 'Laporan Rekap Aset',
      bagian: [
        {
          judul: '1. Kondisi Aset per Kategori',
          catatan: `Jumlah unit dan nilai estimasi dikelompokkan per kategori. Total Nilai Estimasi Sarpras: ${formatRupiah(totalKondisi.nilai)}`,
          headers: ['Kategori', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Total', 'Nilai Estimasi'],
          rows: kategoriRows,
          kosongMessage: 'Belum ada data aset.',
        },
        {
          judul: '2. Aset Sedang Dipinjam',
          catatan: `${sedangDipinjam.length} aset belum dikembalikan.`,
          headers: ['Nama Aset', 'Peminjam', 'Jumlah', 'Rencana Kembali', 'Status'],
          rows: pinjamRows,
          kosongMessage: 'Tidak ada aset yang sedang dipinjam.',
        },
        {
          judul: '3. Ringkasan Pemeliharaan',
          ringkasanTeks: `Total Riwayat: ${ringkasanPemeliharaan.total} | Selesai: ${ringkasanPemeliharaan.selesai} | Dalam Proses: ${ringkasanPemeliharaan.prosesnya} | Total Biaya Pemeliharaan: ${formatRupiah(ringkasanPemeliharaan.totalBiaya)}`,
        },
      ],
    });
  }

  return (
    <Page pageId="laporan-rekap-aset" title="Laporan Rekap Aset" path="Sarpras / Laporan Rekap Aset">
      {!dataSiap && <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</div></div>}

      {dataSiap && (
        <>
          <div className="card no-print">
            <div className="card-body" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={handleExportWord}>📝 Export Word</button>
              <button className="btn btn-primary" onClick={handleExportPdf}>🖨️ Export PDF</button>
            </div>
          </div>

          <div id={printId}>
            {/* Judul utama laporan -- cuma tampil rapi saat di-print/export PDF, di layar biasa sudah ada judul halaman di atas */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>LAPORAN REKAP ASET</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{namaSekolah} — Dicetak {todayWIB()}</div>
            </div>

            <div className="info-grid" style={{ marginBottom: 20 }}>
              <InfoCard icon={IconCheckCircle} color="c-green" value={totalKondisi['Baik']} label="Unit Kondisi Baik" />
              <InfoCard icon={IconAlertTriangle} color="c-gold" value={totalKondisi['Rusak Ringan']} label="Unit Rusak Ringan" />
              <InfoCard icon={IconXCircle} color="c-red" value={totalKondisi['Rusak Berat']} label="Unit Rusak Berat" />
              <InfoCard icon={IconMoney} color="c-purple" value={formatRupiah(totalKondisi.nilai)} label="Total Nilai Estimasi Sarpras" valueFontSize={17} />
            </div>

            <div className="card">
              <div className="card-head"><div><h3>1. Kondisi Aset per Kategori</h3><p>Jumlah unit dan nilai estimasi dikelompokkan per kategori dan kondisi.</p></div></div>
              <div className="card-body">
                {Object.keys(perKategori).length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada data aset.</p>}
                {Object.keys(perKategori).length > 0 && (
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Kategori</th>{KONDISI_LIST.map(k => <th key={k}>{k}</th>)}<th>Total Unit</th><th style={{ textAlign: 'right' }}>Nilai Estimasi</th></tr></thead>
                      <tbody>
                        {Object.entries(perKategori).map(([kategori, v]) => (
                          <tr key={kategori}>
                            <td>{kategori}</td>
                            {KONDISI_LIST.map(k => <td key={k}>{v[k] || 0}</td>)}
                            <td style={{ fontWeight: 700 }}>{v.total}</td>
                            <td style={{ textAlign: 'right' }}><Rupiah value={v.nilai} bold /></td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: 800, background: '#F6F8F5' }}>
                          <td>Total Keseluruhan</td>
                          {KONDISI_LIST.map(k => <td key={k}>{totalKondisi[k] || 0}</td>)}
                          <td>{totalKondisi['Baik'] + totalKondisi['Rusak Ringan'] + totalKondisi['Rusak Berat']}</td>
                          <td style={{ textAlign: 'right' }}><Rupiah value={totalKondisi.nilai} bold /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div><h3>2. Aset Sedang Dipinjam</h3><p>{sedangDipinjam.length} aset belum dikembalikan.</p></div></div>
              <div className="card-body">
                {sedangDipinjam.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Tidak ada aset yang sedang dipinjam.</p>}
                {sedangDipinjam.length > 0 && (
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Nama Aset</th><th>Peminjam</th><th>Jumlah</th><th>Rencana Kembali</th><th>Status</th></tr></thead>
                      <tbody>
                        {sedangDipinjam.map(p => (
                          <tr key={p.id}>
                            <td>{p.namaAset}</td>
                            <td>{p.peminjam} ({p.jenisPeminjam})</td>
                            <td>{p.jumlah}</td>
                            <td>{formatTanggalTampil(p.rencanaKembali)}</td>
                            <td>{p.terlambat ? <span className="badge badge-red">Terlambat</span> : <span className="badge badge-gold">Dipinjam</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div><h3>3. Ringkasan Pemeliharaan</h3><p>Riwayat servis dan perbaikan aset.</p></div></div>
              <div className="card-body">
                <div className="info-grid">
                  <div style={{ padding: '10px 20px', background: '#F6F8F5', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{ringkasanPemeliharaan.total}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Total Riwayat</div>
                  </div>
                  <div style={{ padding: '10px 20px', background: '#F6F8F5', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{ringkasanPemeliharaan.selesai}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Selesai</div>
                  </div>
                  <div style={{ padding: '10px 20px', background: '#F6F8F5', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{ringkasanPemeliharaan.prosesnya}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Dalam Proses</div>
                  </div>
                  <div style={{ padding: '10px 20px', background: 'var(--green-soft)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>{formatRupiah(ringkasanPemeliharaan.totalBiaya)}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Total Biaya Pemeliharaan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
