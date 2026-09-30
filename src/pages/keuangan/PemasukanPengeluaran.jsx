import { useMemo } from 'react';
import Page from '../../components/layout/Page';
import PemasukanLainTab from './PemasukanLainTab';
import JurnalPengeluaranTab from './JurnalPengeluaranTab';
import { isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { formatRupiah, todayWIB } from '../../db/helpers';
import InfoCard from '../../components/common/InfoCard';
import { IconTrendUp, IconTrendDown, IconCheckCircle, IconAlertTriangle } from '../../components/common/icons';
import useTabAccess from '../../hooks/useTabAccess';

export default function PemasukanPengeluaran() {
  const { tab, setTab, bolehTab } = useTabAccess('pemasukan-pengeluaran', ['pemasukan', 'pengeluaran']);
  const { pemasukanLain, pengeluaran, pemasukanLainLoaded, pengeluaranLoaded } = useAppData();

  const ringkasan = useMemo(() => {
    const [tahunIni, bulanIni] = todayWIB().split('-').map(Number);
    const dalamBulanIni = (tgl) => {
      const d = new Date(tgl);
      return !isNaN(d) && d.getMonth() === bulanIni - 1 && d.getFullYear() === tahunIni;
    };
    const pemasukanBulanIni = pemasukanLain.filter(p => dalamBulanIni(p.tanggal)).reduce((s, p) => s + p.nominal, 0);
    const pengeluaranBulanIni = pengeluaran.filter(p => dalamBulanIni(p.tanggal)).reduce((s, p) => s + p.nominal, 0);
    return {
      totalPemasukan: pemasukanLain.reduce((s, p) => s + p.nominal, 0),
      totalPengeluaran: pengeluaran.reduce((s, p) => s + p.nominal, 0),
      pemasukanBulanIni, pengeluaranBulanIni,
    };
  }, [pemasukanLain, pengeluaran]);

  const dataSiap = pemasukanLainLoaded && pengeluaranLoaded;

  return (
    <Page pageId="pemasukan-pengeluaran" title="Pemasukan & Pengeluaran Lain" path="Keuangan / Pemasukan & Pengeluaran Lain">
      {!isConfigured('keuangan') && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets Keuangan.
        </div></div>
      )}

      {dataSiap && (
        <div className="info-grid" style={{ marginBottom: 20 }}>
          <InfoCard icon={IconCheckCircle} color="c-green" value={formatRupiah(ringkasan.totalPemasukan)} label="Total Pemasukan Lain (Semua Waktu)" valueFontSize={17} />
          <InfoCard icon={IconAlertTriangle} color="c-red" value={formatRupiah(ringkasan.totalPengeluaran)} label="Total Pengeluaran (Semua Waktu)" valueFontSize={17} />
          <InfoCard icon={IconTrendUp} color="c-blue" value={formatRupiah(ringkasan.pemasukanBulanIni)} label="Pemasukan Lain Bulan Ini" valueFontSize={17} />
          <InfoCard icon={IconTrendDown} color="c-gold" value={formatRupiah(ringkasan.pengeluaranBulanIni)} label="Pengeluaran Bulan Ini" valueFontSize={17} />
        </div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('pemasukan') && <button className={`seg-tab ${tab === 'pemasukan' ? 'active' : ''}`} onClick={() => setTab('pemasukan')}>💰 PEMASUKAN LAIN</button>}
          {bolehTab('pengeluaran') && <button className={`seg-tab ${tab === 'pengeluaran' ? 'active' : ''}`} onClick={() => setTab('pengeluaran')}>📒 PENGELUARAN</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'pemasukan' && bolehTab('pemasukan') && <PemasukanLainTab />}
          {tab === 'pengeluaran' && bolehTab('pengeluaran') && <JurnalPengeluaranTab />}
        </div>
      </div>
    </Page>
  );
}
