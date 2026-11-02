import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pageIdPresensi } from './jenisPresensi';

// Tautan lama (#/scan-presensi?tab=guru, dst.) -> halaman baru per jenis (v1.62.0).
export default function RedirectPresensiLama({ halaman }) {
  const { search } = useLocation();
  const { canAccess } = useAuth();
  const diminta = new URLSearchParams(search).get('tab');
  const jenis = diminta === 'guru' || diminta === 'siswa' ? diminta
    : (canAccess(pageIdPresensi(halaman, 'siswa')) || !canAccess(pageIdPresensi(halaman, 'guru')) ? 'siswa' : 'guru');
  return <Navigate to={`/${pageIdPresensi(halaman, jenis)}`} replace />;
}
