import Page from '../../components/layout/Page';
import BukuBesarTab from './BukuBesarTab';
import CashflowTab from './CashflowTab';
import RekapitulasiTab from './RekapitulasiTab';
import LabaRugiTab from './LabaRugiTab';
import NeracaTab from './NeracaTab';
import { isConfigured } from '../../services/googleSheets';
import useTabAccess from '../../hooks/useTabAccess';

export default function LaporanKeuangan() {
  const { tab, setTab, bolehTab } = useTabAccess('laporan-keuangan', ['bukubesar', 'cashflow', 'rekap', 'labarugi', 'neraca']);

  return (
    <Page pageId="laporan-keuangan" title="Laporan Keuangan" path="Keuangan / Laporan Keuangan">
      {!isConfigured('keuangan') && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets Keuangan.
        </div></div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('bukubesar') && <button className={`seg-tab ${tab === 'bukubesar' ? 'active' : ''}`} onClick={() => setTab('bukubesar')}>📒 BUKU BESAR</button>}
          {bolehTab('cashflow') && <button className={`seg-tab ${tab === 'cashflow' ? 'active' : ''}`} onClick={() => setTab('cashflow')}>💵 CASHFLOW</button>}
          {bolehTab('rekap') && <button className={`seg-tab ${tab === 'rekap' ? 'active' : ''}`} onClick={() => setTab('rekap')}>📈 REKAPITULASI</button>}
          {bolehTab('labarugi') && <button className={`seg-tab ${tab === 'labarugi' ? 'active' : ''}`} onClick={() => setTab('labarugi')}>📊 LABA RUGI</button>}
          {bolehTab('neraca') && <button className={`seg-tab ${tab === 'neraca' ? 'active' : ''}`} onClick={() => setTab('neraca')}>⚖️ NERACA</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'bukubesar' && bolehTab('bukubesar') && <BukuBesarTab />}
          {tab === 'cashflow' && bolehTab('cashflow') && <CashflowTab />}
          {tab === 'rekap' && bolehTab('rekap') && <RekapitulasiTab />}
          {tab === 'labarugi' && bolehTab('labarugi') && <LabaRugiTab />}
          {tab === 'neraca' && bolehTab('neraca') && <NeracaTab />}
        </div>
      </div>
    </Page>
  );
}
