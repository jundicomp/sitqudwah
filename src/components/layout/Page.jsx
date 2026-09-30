import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

export default function Page({ pageId, title, path, children }) {
  const { canAccess } = useAuth();

  if (!canAccess(pageId)) {
    return (
      <>
        <Topbar title="Akses Ditolak" path={path} />
        <div className="content">
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <h3>🔒 Anda tidak punya akses ke halaman ini</h3>
              <p style={{ color: 'var(--muted)', marginTop: 8 }}>Hubungi Admin atau Kepala Sekolah kalau ini seharusnya bisa diakses.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={title} path={path} />
      <div className="content">{children}</div>
    </>
  );
}
