import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import pkg from '../../../package.json';
import { APP_NAME } from '../../config/appInfo';
import { NAV_STRUCTURE, groupHasAccess } from './navConfig';

// v1.51.0: sidebar desktop kini dirender dari navConfig (sumber yg sama dgn TabletRail &
// MobileNav), bisa diciutkan jadi ikon saja (tombol burger), dan grup menu bersifat
// akordeon: grup halaman yg sedang aktif tetap terbuka, plus maksimal 1 grup lain yg
// sedang dibuka -- membuka grup lain otomatis menutup yg sebelumnya.

const Arrow = () => (
  <svg className="nav-group-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>
);
const Burger = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
const KUNCI_CIUT = 'sq-sidebar-ciut';

// __BUILD_TIME__ ditanam Vite saat "npm run build" dijalankan (lihat vite.config.js) --
// bukan variabel biasa, jadi TIDAK BOLEH dihapus meski terlihat "undefined" di editor.
function formatWaktuBuild(isoString) {
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return formatter.format(d) + ' WIB';
  } catch {
    return '-';
  }
}

const bacaCiut = () => { try { return localStorage.getItem(KUNCI_CIUT) === '1'; } catch { return false; } };
const cocokPath = (pathname, to) => pathname === to || pathname.startsWith(to + '/');
const itemsGrup = (n) => (n.items ? n.items : (n.subgroups || []).flatMap(sg => sg.items));

function Item({ it, canAccess, onClick }) {
  if (!canAccess(it.pageId)) return null;
  return (
    <NavLink to={it.to} onClick={onClick} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
      {it.label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { canAccess } = useAuth();
  const { profilSekolah } = useAppData();
  const { pathname } = useLocation();
  const [ciut, setCiut] = useState(bacaCiut);
  const [dibuka, setDibuka] = useState(null);        // grup lain (selain grup aktif) yg sedang dibuka
  const [aktifDitutup, setAktifDitutup] = useState(false); // grup aktif sengaja ditutup user
  const [subDibuka, setSubDibuka] = useState(null);  // sub-grup Pengaturan yg dibuka
  const [flyout, setFlyout] = useState(null);        // { id, top } saat sidebar diciutkan
  const tutupTimer = useRef(null);

  const grupList = useMemo(() => NAV_STRUCTURE.filter(n => n.type === 'group' && groupHasAccess(n, canAccess)), [canAccess]);
  const grupAktif = useMemo(() => grupList.find(g => itemsGrup(g).some(it => cocokPath(pathname, it.to)))?.id || null, [grupList, pathname]);
  const subAktif = useMemo(() => {
    const g = grupList.find(x => x.id === grupAktif);
    return g?.subgroups?.find(sg => sg.items.some(it => cocokPath(pathname, it.to)))?.id || null;
  }, [grupList, grupAktif, pathname]);

  // Pindah halaman: grup halaman baru terbuka, grup "jelajah" sebelumnya ditutup.
  useEffect(() => { setDibuka(null); setAktifDitutup(false); setSubDibuka(null); setFlyout(null); }, [pathname]);
  useEffect(() => { try { localStorage.setItem(KUNCI_CIUT, ciut ? '1' : '0'); } catch { /* abaikan */ } }, [ciut]);

  const terbuka = (id) => (id === grupAktif ? !aktifDitutup : id === dibuka);
  const toggle = (id) => {
    if (id === grupAktif) { setAktifDitutup(v => !v); return; }
    setDibuka(d => (d === id ? null : id));
    setSubDibuka(null);
  };
  const subTerbuka = (id) => (subDibuka ? subDibuka === id : id === subAktif);

  const bukaFlyout = (id, e) => {
    clearTimeout(tutupTimer.current);
    const r = e.currentTarget.getBoundingClientRect();
    const g = grupList.find(x => x.id === id);
    const perkiraan = 52 + itemsGrup(g).filter(it => canAccess(it.pageId)).length * 34 + (g.subgroups?.length || 0) * 26;
    setFlyout({ id, top: Math.max(8, Math.min(r.top, window.innerHeight - perkiraan - 8)) });
  };
  const tutupFlyoutNanti = () => { clearTimeout(tutupTimer.current); tutupTimer.current = setTimeout(() => setFlyout(null), 180); };
  const tahanFlyout = () => clearTimeout(tutupTimer.current);
  const grupFlyout = flyout && grupList.find(g => g.id === flyout.id);

  const logo = profilSekolah?.logo ? (
    <img src={profilSekolah.logo} alt="Logo Sekolah" width="38" height="38" style={{ objectFit: 'contain', borderRadius: 8 }} />
  ) : (
    <svg width="38" height="38" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="#1C7A3C" />
      <text x="24" y="25" textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="#F0B429">SQ</text>
    </svg>
  );

  return (
    <aside className={`sidebar ${ciut ? 'ciut' : ''}`}>
      <div className="sidebar-head">
        <div className="sidebar-logo">{logo}</div>
        {!ciut && (
          <div className="sidebar-brand">
            <div className="brand-name">{profilSekolah?.nama || APP_NAME}</div>
            <div className="brand-sub">{APP_NAME}</div>
          </div>
        )}
        <button type="button" className="sidebar-burger" onClick={() => { setCiut(v => !v); setFlyout(null); }}
          aria-label={ciut ? 'Lebarkan menu' : 'Ciutkan menu'} title={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}>
          <Burger />
        </button>
      </div>

      <nav className="sidebar-nav">
        {canAccess('dashboard') && (
          <NavLink to="/dashboard" className={({ isActive }) => 'nav-item nav-top' + (isActive ? ' active' : '')} title={ciut ? 'Dashboard' : undefined}>
            <span className="nav-ikon">🏠</span>{!ciut && <span>Dashboard</span>}
          </NavLink>
        )}

        {grupList.map(g => (ciut ? (
          <button key={g.id} type="button" className={`nav-ikon-grup ${g.id === grupAktif ? 'aktif' : ''} ${flyout?.id === g.id ? 'hover' : ''}`}
            aria-label={g.label} onMouseEnter={e => bukaFlyout(g.id, e)} onMouseLeave={tutupFlyoutNanti}
            onClick={e => (flyout?.id === g.id ? setFlyout(null) : bukaFlyout(g.id, e))}>
            <span className="nav-ikon">{g.icon}</span>
          </button>
        ) : (
          <div key={g.id} className={`nav-group ${terbuka(g.id) ? 'open' : ''} ${g.id === grupAktif ? 'berisi-aktif' : ''}`}>
            <div className="nav-group-header" role="button" tabIndex={0} aria-expanded={terbuka(g.id)}
              onClick={() => toggle(g.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(g.id); } }}>
              <span><span className="nav-ikon">{g.icon}</span>{g.label}</span>
              <Arrow />
            </div>
            <div className="nav-group-items">
              {g.items && g.items.map(it => <Item key={it.to} it={it} canAccess={canAccess} />)}
              {g.subgroups && g.subgroups.filter(sg => sg.items.some(it => canAccess(it.pageId))).map(sg => (
                <div key={sg.id} className={`nav-group nav-subgroup ${subTerbuka(sg.id) ? 'open' : ''}`}>
                  <div className="nav-group-header" role="button" tabIndex={0} aria-expanded={subTerbuka(sg.id)}
                    onClick={() => setSubDibuka(subTerbuka(sg.id) ? '__tutup__' : sg.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSubDibuka(subTerbuka(sg.id) ? '__tutup__' : sg.id); } }}>
                    <span>{sg.groupLabel}</span>
                    <Arrow />
                  </div>
                  <div className="nav-group-items">
                    {sg.items.map(it => <Item key={it.to} it={it} canAccess={canAccess} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )))}
      </nav>

      {ciut && grupFlyout && (
        <div className="sidebar-flyout" style={{ top: flyout.top, maxHeight: `calc(100vh - ${flyout.top + 8}px)` }} onMouseEnter={tahanFlyout} onMouseLeave={tutupFlyoutNanti}>
          <div className="sidebar-flyout-judul">{grupFlyout.icon} {grupFlyout.label}</div>
          {grupFlyout.items && grupFlyout.items.map(it => <Item key={it.to} it={it} canAccess={canAccess} onClick={() => setFlyout(null)} />)}
          {grupFlyout.subgroups && grupFlyout.subgroups.filter(sg => sg.items.some(it => canAccess(it.pageId))).map(sg => (
            <div key={sg.id}>
              <div className="sidebar-flyout-sub">{sg.groupLabel}</div>
              {sg.items.map(it => <Item key={it.to} it={it} canAccess={canAccess} onClick={() => setFlyout(null)} />)}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-foot">
        {ciut ? <span title={`v${pkg.version}`}>v{pkg.version}</span> : (
          <>
            Jundicomp © 2026
            <div style={{ fontSize: 10.5, opacity: .7, marginTop: 3 }}>
              {canAccess('changelog') ? (
                <NavLink to="/changelog" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }} title="Lihat riwayat pembaruan aplikasi">
                  v{pkg.version}
                </NavLink>
              ) : (
                <span>v{pkg.version}</span>
              )} · {formatWaktuBuild(typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null)}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
