import { useAppData } from '../../context/AppContext';
import { APP_NAME } from '../../config/appInfo';

// v1.67.0: kop surat dokumen cetak. Data dari Pengaturan › Sekolah › Profil Sekolah
// (nama, NPSN, alamat, telepon, email, logo).
export default function KopSurat({ className = '' }) {
  const { profilSekolah: p } = useAppData();
  const nama = p?.nama || APP_NAME;
  const kontak = [p?.telepon && `Telp. ${p.telepon}`, p?.email && `Email: ${p.email}`].filter(Boolean).join(' · ');
  return (
    <div className={`kop-surat ${className}`}>
      {p?.logo
        ? <img className="kop-logo" src={p.logo} alt="Logo" />
        : <div className="kop-logo kop-inisial">{nama.slice(0, 2).toUpperCase()}</div>}
      <div className="kop-teks">
        <div className="kop-nama">{nama}</div>
        {p?.npsn && <div className="kop-npsn">NPSN: {p.npsn}</div>}
        {p?.alamat && <div className="kop-alamat">{p.alamat}</div>}
        {kontak && <div className="kop-kontak">{kontak}</div>}
      </div>
      <div className="kop-logo kop-penyeimbang" aria-hidden="true" />
    </div>
  );
}
