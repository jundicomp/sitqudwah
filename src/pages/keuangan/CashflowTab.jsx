import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppData } from '../../context/AppContext';
import { rekapCashflowPerAkunBulanan } from '../../db/laporanHelpers';
import { AKUN_BAWAAN } from '../../db/akunBukuBesarFields';
import { formatRupiah } from '../../db/helpers';
import InfoCard from '../../components/common/InfoCard';
import { IconTrendUp, IconTrendDown, IconCheckCircle, IconAlertTriangle } from '../../components/common/icons';
import Rupiah from '../../components/common/Rupiah';
import { exportToExcel } from '../../utils/exportTable';

// Warna berbeda per akun kas/bank di chart & kartu -- cukup byk variasi utk beberapa akun.
const WARNA_AKUN = ['#123D22', '#1E4FA0', '#F0B429', '#8f2c1f', '#5B3E8E', '#16794a', '#8a5b00'];

export default function CashflowTab() {
  const { tahunAjaran, tahunAjaranAktif, pembayaran, pemasukanLain, pengeluaran, akun, pembayaranLoaded, pemasukanLainLoaded, pengeluaranLoaded } = useAppData();
  const [taLabel, setTaLabel] = useState(null);

  const labelDipakai = taLabel || tahunAjaranAktif?.label;

  // Daftar SEMUA akun kas/bank (Kas bawaan + custom Aktiva) -- setiap akun dapat garis
  // sendiri di chart dgn warna berbeda, TIDAK digabung jadi 1 angka "Kas" saja lagi.
  const daftarAkun = useMemo(() => {
    const bawaan = AKUN_BAWAAN.filter(a => a.isKasBank).map(a => a.nama);
    const custom = akun.filter(a => a.jenis === 'Aktiva').map(a => a.nama);
    return [...bawaan, ...custom];
  }, [akun]);

  const cashflow = useMemo(
    () => labelDipakai ? rekapCashflowPerAkunBulanan(labelDipakai, pembayaran, pemasukanLain, pengeluaran, daftarAkun) : [],
    [labelDipakai, pembayaran, pemasukanLain, pengeluaran, daftarAkun]
  );

  const ringkasanPerAkun = useMemo(() => daftarAkun.map(nama => {
    const totalMasuk = cashflow.reduce((s, c) => s + (c[nama + '__masuk'] || 0), 0);
    const totalKeluar = cashflow.reduce((s, c) => s + (c[nama + '__keluar'] || 0), 0);
    const saldoAkhir = cashflow.length > 0 ? cashflow[cashflow.length - 1][nama] : 0;
    return { nama, totalMasuk, totalKeluar, saldoAkhir };
  }), [cashflow, daftarAkun]);

  const totalMasukSemua = ringkasanPerAkun.reduce((s, a) => s + a.totalMasuk, 0);
  const totalKeluarSemua = ringkasanPerAkun.reduce((s, a) => s + a.totalKeluar, 0);
  const saldoAkhirSemua = ringkasanPerAkun.reduce((s, a) => s + a.saldoAkhir, 0);

  const dataSiap = pembayaranLoaded || pemasukanLainLoaded || pengeluaranLoaded;

  if (tahunAjaran.length === 0) {
    return <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran.</div></div>;
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>💵 Cashflow &amp; Kondisi Kas</h3><p>Arus kas masuk-keluar per bulan, dipisah per akun kas/bank, dan saldo kas berjalan sepanjang tahun ajaran.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={labelDipakai || ''} onChange={e => setTaLabel(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            {tahunAjaran.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => exportToExcel(
            ['Bulan', ...daftarAkun],
            cashflow.map(c => ({ Bulan: c.label, ...Object.fromEntries(daftarAkun.map(n => [n, c[n]])) })),
            'Cashflow', `Cashflow — ${labelDipakai}`
          )}>📊 Excel</button>
        </div>
      </div>
      <div className="card-body">
        {!dataSiap && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>}
        {dataSiap && (
          <>
            <div className="info-grid" style={{ marginBottom: 12 }}>
              <InfoCard icon={IconTrendUp} color="c-green" value={formatRupiah(totalMasukSemua)} label="Total Kas Masuk Setahun (Semua Akun)" valueFontSize={16} />
              <InfoCard icon={IconTrendDown} color="c-red" value={formatRupiah(totalKeluarSemua)} label="Total Kas Keluar Setahun (Semua Akun)" valueFontSize={16} />
              <InfoCard
                icon={saldoAkhirSemua >= 0 ? IconCheckCircle : IconAlertTriangle}
                color={saldoAkhirSemua >= 0 ? 'c-blue' : 'c-red'}
                value={formatRupiah(saldoAkhirSemua)}
                label="Total Saldo Akhir (Semua Akun)"
                valueFontSize={17}
              />
            </div>

            <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 10px' }}>SALDO AKHIR PER AKUN</div>
            <div className="info-grid" style={{ marginBottom: 20 }}>
              {ringkasanPerAkun.map((a, i) => (
                <div key={a.nama} style={{ borderRadius: 10, padding: '12px 16px', color: '#fff', background: WARNA_AKUN[i % WARNA_AKUN.length] }}>
                  <div style={{ fontSize: 11.5, opacity: .85 }}>{a.nama}</div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{formatRupiah(a.saldoAkhir)}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tren Saldo Kas Berjalan per Akun</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickFormatter={l => String(l).split(' ')[0]} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(1) + 'jt'} />
                  <Tooltip formatter={v => formatRupiah(v)} />
                  <Legend />
                  {daftarAkun.map((nama, i) => (
                    <Line key={nama} type="monotone" dataKey={nama} name={nama} stroke={WARNA_AKUN[i % WARNA_AKUN.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    {daftarAkun.map(nama => <th key={nama}>{nama}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cashflow.map(c => (
                    <tr key={c.label}>
                      <td>{c.label}</td>
                      {daftarAkun.map(nama => (
                        <td key={nama}><Rupiah value={c[nama]} bold /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
