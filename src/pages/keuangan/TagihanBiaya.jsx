import Page from '../../components/layout/Page';
import PenerbitanSppTab from './PenerbitanSppTab';
import PenerbitanLainTab from './PenerbitanLainTab';
import TarifTab from './TarifTab';
import { isConfigured } from '../../services/googleSheets';
import useTabAccess from '../../hooks/useTabAccess';

export default function TagihanBiaya() {
  const { tab, setTab, bolehTab } = useTabAccess('tagihan', ['penerbitan', 'lain', 'tarif']);

  return (
    <Page pageId="tagihan" title="Tagihan & Biaya" path="Keuangan / Tagihan & Biaya">
      {!isConfigured('keuangan') && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets Keuangan. Minta <strong>Admin</strong> mengatur koneksi lewat menu
          <strong> Pengaturan &gt; System &gt; Pengaturan Koneksi</strong> — bagian "Koneksi Data Keuangan".
        </div></div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('penerbitan') && <button className={`seg-tab ${tab === 'penerbitan' ? 'active' : ''}`} onClick={() => setTab('penerbitan')}>📅 PENERBITAN SPP</button>}
          {bolehTab('lain') && <button className={`seg-tab ${tab === 'lain' ? 'active' : ''}`} onClick={() => setTab('lain')}>🧾 PENERBITAN LAIN</button>}
          {bolehTab('tarif') && <button className={`seg-tab ${tab === 'tarif' ? 'active' : ''}`} onClick={() => setTab('tarif')}>💰 TARIF</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'penerbitan' && bolehTab('penerbitan') && <PenerbitanSppTab />}
          {tab === 'lain' && bolehTab('lain') && <PenerbitanLainTab />}
          {tab === 'tarif' && bolehTab('tarif') && <TarifTab />}
        </div>
      </div>
    </Page>
  );
}
