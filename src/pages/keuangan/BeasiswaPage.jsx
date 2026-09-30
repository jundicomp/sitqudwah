import Page from '../../components/layout/Page';
import BeasiswaKategoriTab from './BeasiswaKategoriTab';
import BeasiswaSiswaTab from './BeasiswaSiswaTab';
import { isConfigured } from '../../services/googleSheets';
import useTabAccess from '../../hooks/useTabAccess';

export default function BeasiswaPage() {
  const { tab, setTab, bolehTab } = useTabAccess('beasiswa', ['kategori', 'siswa']);

  return (
    <Page pageId="beasiswa" title="Beasiswa" path="Keuangan / Beasiswa">
      {!isConfigured('keuangan') && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets Keuangan.
        </div></div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('kategori') && <button className={`seg-tab ${tab === 'kategori' ? 'active' : ''}`} onClick={() => setTab('kategori')}>🏷️ KATEGORI BEASISWA</button>}
          {bolehTab('siswa') && <button className={`seg-tab ${tab === 'siswa' ? 'active' : ''}`} onClick={() => setTab('siswa')}>👥 SISWA PENERIMA</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kategori' && bolehTab('kategori') && <BeasiswaKategoriTab />}
          {tab === 'siswa' && bolehTab('siswa') && <BeasiswaSiswaTab />}
        </div>
      </div>
    </Page>
  );
}
