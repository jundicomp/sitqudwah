import Page from '../../components/layout/Page';
import ProfilSekolahForm from './ProfilSekolahForm';
import TahunAjaranTab from './TahunAjaranTab';
import AkreditasiTab from './AkreditasiTab';
import PeriodeSemesterTab from './PeriodeSemesterTab';
import { isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import useTabAccess from '../../hooks/useTabAccess';

export default function ProfilSekolahDanTahunAjaran() {
  const { tahunAjaranAktif } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('profil', ['profil', 'tahun', 'akreditasi', 'semester']);

  return (
    <Page pageId="profil" title="Profil Sekolah & Tahun Ajaran" path="Pengaturan / Modul / Profil Sekolah">
      {!isConfigured() && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets. Minta <strong>Admin</strong> mengatur koneksi lewat menu Pengaturan Koneksi dulu.
        </div></div>
      )}

      {tahunAjaranAktif && (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tahun Ajaran Aktif Saat Ini</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--green-dark)' }}>{tahunAjaranAktif.label}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('profil') && <button className={`seg-tab ${tab === 'profil' ? 'active' : ''}`} onClick={() => setTab('profil')}>🏫 PROFIL SEKOLAH</button>}
          {bolehTab('tahun') && <button className={`seg-tab ${tab === 'tahun' ? 'active' : ''}`} onClick={() => setTab('tahun')}>📅 TAHUN AJARAN</button>}
          {bolehTab('semester') && <button className={`seg-tab ${tab === 'semester' ? 'active' : ''}`} onClick={() => setTab('semester')}>🗓️ PERIODE SEMESTER</button>}
          {bolehTab('akreditasi') && <button className={`seg-tab ${tab === 'akreditasi' ? 'active' : ''}`} onClick={() => setTab('akreditasi')}>🏅 AKREDITASI</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'profil' && bolehTab('profil') && <ProfilSekolahForm />}
          {tab === 'tahun' && bolehTab('tahun') && <TahunAjaranTab />}
          {tab === 'semester' && bolehTab('semester') && <PeriodeSemesterTab />}
          {tab === 'akreditasi' && bolehTab('akreditasi') && <AkreditasiTab />}
        </div>
      </div>
    </Page>
  );
}
