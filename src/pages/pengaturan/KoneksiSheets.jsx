import Page from '../../components/layout/Page';
import ConnectionSettings from './ConnectionSettings';

export default function KoneksiSheets() {
  return (
    <Page pageId="koneksi-sheets" title="Pengaturan Koneksi Google Sheets" path="Pengaturan / System / Pengaturan Koneksi">
      <div className="card">
        <div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          🔒 Halaman ini <strong>khusus Admin</strong>. Sejak Cara 1 diaktifkan, koneksi ditanam permanen di kode
          (lihat <code>src/config/sheetsDefaults.js</code>) — halaman ini sekarang cuma menampilkan status, bukan form edit.
        </div>
      </div>
      <ConnectionSettings />
    </Page>
  );
}
