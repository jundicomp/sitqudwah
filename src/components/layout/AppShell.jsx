import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TabletRail from './TabletRail';
import MobileNav from './MobileNav';
import ToastContainer from '../common/ToastContainer';
import UserAktifPanel from './UserAktifPanel';

// Sidebar (desktop), TabletRail (tablet, ~641-1024px), dan MobileNav (hp,
// <=640px) SEMUA di-mount bersamaan -- CSS (@media di theme.css) yang
// menentukan mana yang tampil sesuai lebar layar, jadi tidak butuh deteksi
// ukuran layar lewat JS.
export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <TabletRail />
      <div className="main">
        <Outlet />
      </div>
      <MobileNav />
      <ToastContainer />
      <UserAktifPanel />
    </div>
  );
}
