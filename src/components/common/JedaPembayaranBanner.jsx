import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

// Pita kuning di halaman SPP / Tagihan / Tunggakan selama sistem pembayaran dijeda (v1.63.0).
export default function JedaPembayaranBanner() {
  const { statusPembayaran: st } = useAppData();
  const { canAccess } = useAuth();
  if (!st?.jeda) return null;
  return (
    <div className="draf-banner" role="status">
      <span>💤 <b>Sistem pembayaran siswa belum dipakai.</b> {st.pesan || `Tagihan SPP & biaya lain mulai tahun ajaran ${st.mulaiTa}.`} Tagihan tahun ajaran sebelum {st.mulaiTa} tidak dihitung.</span>
      {canAccess('pengaturan-keuangan') && <Link to="/pengaturan-keuangan" className="btn btn-sm">Pengaturan Keuangan</Link>}
    </div>
  );
}
