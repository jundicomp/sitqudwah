import { useMemo } from 'react';
import Page from '../../components/layout/Page';
import StoredDataTable from './StoredDataTable';
import RombelTab from './RombelTab';
import KenaikanKelasTab from './KenaikanKelasTab';
import RiwayatSiswaTab from './RiwayatSiswaTab';
import PortofolioSiswaTab from './PortofolioSiswaTab';
import NotifikasiSiswaPerluTindakLanjut from '../../components/common/NotifikasiSiswaPerluTindakLanjut';
import { useAppData } from '../../context/AppContext';
import { isConfigured } from '../../services/googleSheets';
import useTabAccess from '../../hooks/useTabAccess';

export default function DataSiswaSheets() {
  const { siswa, siswaLoaded } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('siswa', ['tabel', 'rombel', 'kenaikan', 'riwayat', 'portofolio']);

  // Statistik atas HANYA menghitung siswa Aktif -- yg Lulus/Pindah/Berhenti ada di tab Riwayat Siswa.
  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);
  const stats = useMemo(() => {
    const perTingkat = {};
    siswaAktif.forEach(s => {
      const t = s.kelasTingkat || '-';
      perTingkat[t] = (perTingkat[t] || 0) + 1;
    });
    return { total: siswaAktif.length, perTingkat };
  }, [siswaAktif]);
  const tingkatList = Object.keys(stats.perTingkat).sort();

  return (
    <Page pageId="siswa" title="Data Siswa" path="Pengaturan / Modul / Data Siswa">
      <NotifikasiSiswaPerluTindakLanjut />

      {siswaLoaded && siswaAktif.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 20px', background: 'var(--green-soft)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-dark)' }}>{stats.total}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Siswa Aktif</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--muted)' }}>SEBARAN PER KELAS / TINGKAT</div>
                <div className="kelas-grid">
                  {tingkatList.map((t, i) => {
                    const gradients = [
                      'linear-gradient(135deg, var(--green), var(--green-dark))',
                      'linear-gradient(135deg, #3868C9, #123a7a)',
                      'linear-gradient(135deg, var(--purple), var(--purple-dark))',
                      'linear-gradient(135deg, #E0645F, #8f2c1f)',
                      'linear-gradient(135deg, #D9A441, #8a5b00)',
                      'linear-gradient(135deg, #16794a, #0d4a2c)',
                    ];
                    return (
                      <div key={t} className="kelas-card" style={{ background: gradients[i % gradients.length] }}>
                        <div className="val">{stats.perTingkat[t]}</div>
                        <div className="lbl">Kelas {t}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('tabel') && <button className={`seg-tab ${tab === 'tabel' ? 'active' : ''}`} onClick={() => setTab('tabel')}>📋 DATA SISWA (TABEL)</button>}
          {bolehTab('rombel') && <button className={`seg-tab ${tab === 'rombel' ? 'active' : ''}`} onClick={() => setTab('rombel')}>🏫 ROMBEL</button>}
          {bolehTab('kenaikan') && <button className={`seg-tab ${tab === 'kenaikan' ? 'active' : ''}`} onClick={() => setTab('kenaikan')}>🎒 KENAIKAN KELAS</button>}
          {bolehTab('riwayat') && <button className={`seg-tab ${tab === 'riwayat' ? 'active' : ''}`} onClick={() => setTab('riwayat')}>🎓 RIWAYAT SISWA</button>}
          {bolehTab('portofolio') && <button className={`seg-tab ${tab === 'portofolio' ? 'active' : ''}`} onClick={() => setTab('portofolio')}>🪪 PORTOFOLIO</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {!isConfigured() && (
            <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
              ℹ️ Belum tersambung ke Google Sheets. Minta <strong>Admin</strong> mengatur koneksi lewat menu
              <strong> Pengaturan &gt; System &gt; Pengaturan Koneksi</strong> dulu.
            </div></div>
          )}
          {tab === 'tabel' && bolehTab('tabel') && <StoredDataTable />}
          {tab === 'rombel' && bolehTab('rombel') && <RombelTab />}
          {tab === 'kenaikan' && bolehTab('kenaikan') && <KenaikanKelasTab />}
          {tab === 'riwayat' && bolehTab('riwayat') && <RiwayatSiswaTab />}
          {tab === 'portofolio' && bolehTab('portofolio') && <PortofolioSiswaTab />}
        </div>
      </div>
    </Page>
  );
}
