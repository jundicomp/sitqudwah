import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { initials, avatarColor } from '../../db/helpers';
import StatusKoneksiHeader from './StatusKoneksiHeader';

export default function Topbar({ title, path }) {
  const { currentUser, logout } = useAuth();
  const { tahunAjaranAktif } = useAppData();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        <p className="topbar-path">{path}</p>
      </div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusKoneksiHeader />
        <div className="topbar-badge">Tahun Ajaran Aktif: {tahunAjaranAktif ? tahunAjaranAktif.label : '-'}</div>
        {currentUser && (
          <div className="topbar-user">
            <div
              onClick={() => navigate('/profil-saya')}
              title="Lihat Profil Saya"
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <div className="topbar-user-avatar" style={{ background: avatarColor(currentUser.id) }}>{initials(currentUser.nama)}</div>
              <div>
                <div className="topbar-user-name">{currentUser.nama}</div>
                <div className="topbar-user-role">{currentUser.role}</div>
              </div>
            </div>
            <button className="topbar-logout" onClick={logout} title="Keluar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
