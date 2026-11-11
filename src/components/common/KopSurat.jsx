import { useAppData } from '../../context/AppContext';
import { susunKop, peringkatTerbaru } from '../../db/kopFields';

// Kop surat dokumen cetak (v1.67.1). Data: Pengaturan › Sekolah › Profil Sekolah
// (+ data tambahan); field yg tampil & jenis garis: kartu "Kop Surat" di halaman yg sama.
// Prop profil/tambahan/kop dipakai untuk pratinjau sebelum disimpan.
export default function KopSurat({ profil, tambahan, kop, className = '' }) {
  const app = useAppData();
  const k = susunKop(profil || app.profilSekolah, tambahan || app.tambahanProfil, kop || app.pengaturanKop, peringkatTerbaru(app.akreditasi));
  const adaLogo = k.logoKiri || k.logoKanan;
  const adaKontak = k.kodePos || k.email || k.telepon;
  return (
    <div className={`kop-surat ${className}`}>
      <div className="kop-isi">
        {adaLogo && <div className="kop-logo">{k.logoKiri && <img src={k.logoKiri} alt="" />}</div>}
        <div className="kop-teks">
          {k.barisAtas && <div className="kop-atas">{k.barisAtas}</div>}
          {k.nama && <div className="kop-nama">{k.nama}</div>}
          {(k.npsn || k.akreditasi) && (
            <div className="kop-npsn">
              {k.npsn && <span>NPSN: {k.npsn}</span>}
              {k.npsn && k.akreditasi && <span className="kop-pemisah">|</span>}
              {k.akreditasi && <span>Akreditasi: {k.akreditasi}</span>}
            </div>
          )}
          {k.alamat && <div className="kop-baris">{k.alamat}</div>}
          {k.wilayah && <div className="kop-baris">{k.wilayah}</div>}
          {adaKontak && (
            <div className="kop-baris">
              {[
                k.kodePos && <b key="kp">Kode Pos {k.kodePos}</b>,
                k.email && <span key="em">e-mail: <span className="kop-email">{k.email}</span></span>,
                k.telepon && <b key="tl">{k.sebutanTelepon} {k.telepon}</b>,
              ].filter(Boolean).reduce((a, x, i) => (i ? [...a, ' ', x] : [x]), [])}
            </div>
          )}
          {k.website && <div className="kop-baris"><b>Website Sekolah : {k.website}</b></div>}
        </div>
        {adaLogo && <div className="kop-logo">{k.logoKanan && <img src={k.logoKanan} alt="" />}</div>}
      </div>
      {k.garis !== '0' && <div className={`kop-garis g${k.garis}`} />}
    </div>
  );
}
