import Page from '../components/layout/Page';

export default function ComingSoon({ pageId, title, path }) {
  return (
    <Page pageId={pageId} title={title} path={path}>
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
          <h3 style={{ marginBottom: 6 }}>Belum dimigrasi ke React</h3>
          <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto' }}>
            Halaman <strong>{title}</strong> masih tersedia penuh di versi HTML asli, dan akan dimigrasi di putaran berikutnya
            mengikuti urutan modul yang sama.
          </p>
        </div>
      </div>
    </Page>
  );
}
