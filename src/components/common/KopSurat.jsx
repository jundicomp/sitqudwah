import { useAppData } from '../../context/AppContext';
import { susunKop, peringkatTerbaru, gabungKopPaud, teleponDenganSebutan } from '../../db/kopFields';

// Kop surat dokumen cetak. Data: Pengaturan › Sekolah › Profil Sekolah (+ data tambahan);
// field yg tampil, garis & gaya: kartu "Kop Surat" di halaman yg sama.
// jenjang="PAUD" -> kop PAUD (isian kosong ikut kop umum).
// Prop profil/tambahan/kop dipakai untuk pratinjau sebelum disimpan.
export default function KopSurat({ jenjang, profil, tambahan, kop, kopPaud, className = '' }) {
  const app = useAppData();
  let P = profil || app.profilSekolah, T = tambahan || app.tambahanProfil, K = kop || app.pengaturanKop;
  let akr = peringkatTerbaru(app.akreditasi);
  if (jenjang === 'PAUD') {
    const g = gabungKopPaud(P, T, kopPaud || app.pengaturanKopPaud);
    P = g.profil; T = g.tambahan; K = g.kop;
    if (String(g.kop?.data?.akreditasi || '').trim()) akr = '';
  }
  const k = susunKop(P, T, K, akr);
  const gaya2 = k.gaya === '2';
  const adaLogo = k.logoKiri || k.logoKanan;
  const tel = teleponDenganSebutan(k.sebutanTelepon, k.telepon);
  const sambung = (...x) => x.filter(Boolean).join(' ');

  let baris;
  if (gaya2) {
    // Baris 1: "Alamat: jalan + desa"; baris 2: kecamatan, kabupaten, ... + telepon.
    const b1 = k.alamat ? `Alamat: ${k.alamat}` : '';
    const b2 = sambung(k.wilayah.replaceAll(', ', ' '), k.kodePos && `Kode Pos ${k.kodePos}`, tel);
    const kontak = [k.email && `Email: ${k.email}`, k.website && `Website: ${k.website}`].filter(Boolean).join(' · ');
    baris = (
      <>
        {b1 && <div className="kop-baris kop-sambung">{b1}</div>}
        {b2 && <div className="kop-baris kop-sambung">{b2}</div>}
        {kontak && <div className="kop-baris">{kontak}</div>}
      </>
    );
  } else {
    const kontak = [
      k.kodePos && <b key="kp">Kode Pos {k.kodePos}</b>,
      k.email && <span key="em">e-mail: <span className="kop-email">{k.email}</span></span>,
      tel && <b key="tl">{tel}</b>,
    ].filter(Boolean);
    baris = (
      <>
        {k.alamat && <div className="kop-baris">{k.alamat}</div>}
        {k.wilayah && <div className="kop-baris">{k.wilayah}</div>}
        {kontak.length > 0 && <div className="kop-baris">{kontak.reduce((a, x, i) => (i ? [...a, ' ', x] : [x]), [])}</div>}
        {k.website && <div className="kop-baris"><b>Website Sekolah : {k.website}</b></div>}
      </>
    );
  }

  // Kolom logo kiri & kanan dibuat sama lebar -> teks kop selalu tepat di tengah.
  const lebarKolom = Math.max(k.logoKiri ? k.logoKiriMm : 0, k.logoKanan ? k.logoKananMm : 0) * 1.2;
  const gayaIsi = adaLogo ? { gridTemplateColumns: `${lebarKolom}mm minmax(0,1fr) ${lebarKolom}mm` } : undefined;
  const logo = (src, mm, sisi) => (
    <div className={`kop-logo ${sisi}`}>{src && <img src={src} alt="" style={{ height: `${mm}mm`, maxWidth: `${lebarKolom}mm` }} />}</div>
  );
  return (
    <div className={`kop-surat ${gaya2 ? 'kop-gaya2' : ''} ${className}`}>
      <div className={`kop-isi ${adaLogo ? 'ada-logo' : ''}`} style={gayaIsi}>
        {adaLogo && logo(k.logoKiri, k.logoKiriMm, 'kiri')}
        <div className="kop-teks">
          {k.barisAtas && <div className="kop-atas">{k.barisAtas}</div>}
          {k.nama && <div className="kop-nama">{k.nama}</div>}
          {(k.npsn || k.akreditasi) && (
            <div className="kop-npsn">
              {k.npsn && <span>NPSN: {k.npsn}</span>}
              {k.npsn && k.akreditasi && <span className="kop-pemisah">|</span>}
              {k.akreditasi && <span>{gaya2 ? 'AKREDITASI' : 'Akreditasi'}: {k.akreditasi}</span>}
            </div>
          )}
          {baris}
        </div>
        {adaLogo && logo(k.logoKanan, k.logoKananMm, 'kanan')}
      </div>
      {k.garis !== '0' && <div className={`kop-garis g${k.garis}`} />}
    </div>
  );
}
