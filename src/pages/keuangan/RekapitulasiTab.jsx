import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { rekapPemasukanBulanan } from '../../db/laporanHelpers';
import { formatRupiah } from '../../db/helpers';
import InfoCard from '../../components/common/InfoCard';
import { IconGraduationCap, IconMoney, IconTrendUp } from '../../components/common/icons';
import Rupiah from '../../components/common/Rupiah';
import { exportToExcel } from '../../utils/exportTable';

export default function RekapitulasiTab() {
  const { tahunAjaran, tahunAjaranAktif, pembayaran, pemasukanLain, pembayaranLoaded, pemasukanLainLoaded } = useAppData();
  const [taLabel, setTaLabel] = useState(null);
  const [bulanIdx, setBulanIdx] = useState(null); // null = "Semua Bulan"

  const labelDipakai = taLabel || tahunAjaranAktif?.label;
  const rekap = useMemo(() => labelDipakai ? rekapPemasukanBulanan(labelDipakai, pembayaran, pemasukanLain) : [], [labelDipakai, pembayaran, pemasukanLain]);
  const bulanTerpilih = bulanIdx !== null ? rekap[bulanIdx] : null;

  const totalSetahun = useMemo(() => ({
    spp: rekap.reduce((s, r) => s + r.spp, 0),
    lain: rekap.reduce((s, r) => s + r.lain, 0),
    lainnya: rekap.reduce((s, r) => s + r.lainnya, 0),
    total: rekap.reduce((s, r) => s + r.total, 0),
  }), [rekap]);

  // Kartu ringkasan mengikuti pilihan: kalau ada bulan spesifik dipilih, tampilkan
  // angka BULAN ITU SAJA -- kalau tidak, tampilkan total setahun spt biasa.
  const kartuDitampilkan = bulanTerpilih || totalSetahun;

  const dataSiap = pembayaranLoaded || pemasukanLainLoaded;

  if (tahunAjaran.length === 0) {
    return <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran. Atur dulu lewat menu Profil Sekolah &amp; Tahun Ajaran.</div></div>;
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>📈 Rekapitulasi Pemasukan</h3><p>{bulanTerpilih ? `Rincian ${bulanTerpilih.label}.` : 'Uang yang benar-benar diterima per bulan — Pemutihan Piutang tidak dihitung sbg pemasukan.'}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={labelDipakai || ''} onChange={e => { setTaLabel(e.target.value); setBulanIdx(null); }} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            {tahunAjaran.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
          <select value={bulanIdx === null ? '' : bulanIdx} onChange={e => setBulanIdx(e.target.value === '' ? null : Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            <option value="">Semua Bulan</option>
            {rekap.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => exportToExcel(
            ['Bulan', 'SPP', 'Biaya Lain Siswa', 'Pemasukan Lain', 'Total'],
            rekap.map(r => ({ Bulan: r.label, SPP: r.spp, 'Biaya Lain Siswa': r.lain, 'Pemasukan Lain': r.lainnya, Total: r.total })),
            'Rekapitulasi Pemasukan', `Rekapitulasi Pemasukan — ${labelDipakai}`
          )}>📊 Excel</button>
        </div>
      </div>
      <div className="card-body">
        {!dataSiap && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>}
        {dataSiap && (
          <>
            <div className="info-grid" style={{ marginBottom: 20 }}>
              <InfoCard icon={IconGraduationCap} color="c-green" value={formatRupiah(kartuDitampilkan.spp)} label={bulanTerpilih ? 'SPP Bulan Ini' : 'Total SPP Setahun'} valueFontSize={17} />
              <InfoCard icon={IconMoney} color="c-blue" value={formatRupiah(kartuDitampilkan.lain)} label={bulanTerpilih ? 'Biaya Lain Siswa Bulan Ini' : 'Total Biaya Lain Siswa'} valueFontSize={17} />
              <InfoCard icon={IconMoney} color="c-gold" value={formatRupiah(kartuDitampilkan.lainnya)} label={bulanTerpilih ? 'Pemasukan Lain Bulan Ini' : 'Total Pemasukan Lain (Non-Siswa)'} valueFontSize={17} />
              <InfoCard icon={IconTrendUp} color="c-purple" value={formatRupiah(kartuDitampilkan.total)} label={bulanTerpilih ? 'Total Bulan Ini' : 'Total Pemasukan'} valueFontSize={17} />
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Bulan</th><th>SPP</th><th>Biaya Lain Siswa</th><th>Pemasukan Lain (Non-Siswa)</th><th>Total</th></tr></thead>
                <tbody>
                  {rekap.map((r, i) => (
                    <tr key={r.label} style={i === bulanIdx ? { background: 'var(--green-soft)' } : undefined}>
                      <td>{r.label}</td>
                      <td><Rupiah value={r.spp} /></td>
                      <td><Rupiah value={r.lain} /></td>
                      <td><Rupiah value={r.lainnya} /></td>
                      <td><Rupiah value={r.total} bold /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800 }}>
                    <td>Total Setahun</td>
                    <td><Rupiah value={totalSetahun.spp} bold /></td>
                    <td><Rupiah value={totalSetahun.lain} bold /></td>
                    <td><Rupiah value={totalSetahun.lainnya} bold /></td>
                    <td><Rupiah value={totalSetahun.total} bold /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
