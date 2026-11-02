import { formatTanggal } from '../../../db/helpers';
import { namaTingkat } from '../../../config/jenjang';
import { terbilangKelas } from '../../../db/raporSdFields';

const tgl = (iso) => (iso ? formatTanggal(String(iso).slice(0, 10) + 'T00:00:00') : '');
const t = (v) => (v ? v : '');
const titik = '...........................................';

function Idt({ rows, lebar = '58mm' }) {
  return (
    <table className="rs-idt"><tbody>
      {rows.map(([label, value, indent], i) => (
        <tr key={i}><td style={{ width: lebar, paddingLeft: indent ? '8mm' : 0 }}>{label}</td><td style={{ width: '4mm' }}>{value === null ? '' : ':'}</td><td>{value === null ? '' : t(value)}</td></tr>
      ))}
    </tbody></table>
  );
}

// Satu rapor SD lengkap. `d` = hasil susunDokumenSd() (atau arsip tersimpan).
export function SatuRaporSd({ d }) {
  const a = d.anak; const sk = d.sekolah;
  const ttl = [a.tempatLahir, a.tanggalLahir ? tgl(a.tanggalLahir) : ''].filter(Boolean).join(', ');
  const alamatLengkap = [a.alamat, a.desa, a.kecamatan, a.kabupaten, a.provinsi].filter(Boolean).join(', ');
  const nisnNis = [a.nisn, a.idSiswa].filter(Boolean).join(' / ');
  let no = 0;
  return (
    <>
      <section className="rp-hal rs">
        <h1 style={{ marginBottom: '2mm' }}>RAPOR PESERTA DIDIK</h1>
        <h1 style={{ marginTop: 0 }}>{sk.judulJenjang}</h1>
        <div style={{ marginTop: '14mm' }}>
          <Idt lebar="48mm" rows={[
            ['Nama Sekolah', (sk.nama || '').toUpperCase()], ['NPSN', sk.npsn], ['NISN/NIS', nisnNis],
            ['Alamat Sekolah', (sk.alamat || '').toUpperCase()], ['Kode Pos', sk.kodePos], ['Kelurahan/Desa', (sk.desa || '').toUpperCase()],
            ['Kecamatan', (sk.kecamatan || '').toUpperCase()], ['Kabupaten/Kota', (sk.kabupaten || '').toUpperCase()],
            ['Provinsi', (sk.provinsi || '').toUpperCase()], ['Website', sk.website], ['E-mail', sk.email],
          ]} />
        </div>
      </section>

      <section className="rp-hal rs">
        <h1>IDENTITAS PESERTA DIDIK</h1>
        <Idt rows={[
          ['Nama Peserta Didik', a.nama], ['NISN/NIS', nisnNis], ['Tempat, Tanggal Lahir', ttl], ['Jenis Kelamin', a.jk], ['Agama', a.agama],
          ['Alamat Peserta Didik', alamatLengkap],
          ['Nama Orang Tua', null], ['Ayah', d.ortu.ayah, 1], ['Ibu', d.ortu.ibu, 1],
          ['Pekerjaan Orang Tua', null], ['Ayah', d.ortu.pekerjaanAyah, 1], ['Ibu', d.ortu.pekerjaanIbu, 1],
          ['Alamat Orang Tua', null], ['Jalan', a.alamat, 1], ['Kelurahan/Desa', a.desa, 1], ['Kecamatan', a.kecamatan, 1], ['Kabupaten/Kota', a.kabupaten, 1], ['Provinsi', a.provinsi, 1],
          ['Wali Peserta Didik', null], ['Nama', d.walimurid.nama, 1], ['Pekerjaan', d.walimurid.pekerjaan, 1], ['Alamat', d.walimurid.alamat, 1],
        ]} />
        <div style={{ marginTop: '8mm', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '14mm' }}>
          {a.foto ? <img className="rp-pasfoto" src={a.foto} alt="Pas foto" /> : <div className="rp-pasfoto kosong">Pas Foto<br />Ukuran 3x4</div>}
          <div style={{ minWidth: '70mm' }}>
            {d.tempat}, {tgl(d.tanggal)}<br />Kepala Sekolah,
            <div style={{ height: '20mm' }} />
            <b><u>{d.kepala || titik}</u></b><br />{d.kepalaNiy ? `NIY ${d.kepalaNiy}` : ''}
          </div>
        </div>
      </section>

      <section className="rp-hal rs rp-flow">
        <h1 style={{ marginBottom: '5mm' }}>RAPOR PESERTA DIDIK DAN PROFIL PESERTA DIDIK</h1>
        <table className="rs-kepala"><tbody>
          <tr><td>Nama Peserta Didik</td><td>:</td><td><b>{a.nama}</b></td><td>Kelas</td><td>:</td><td>{d.rombel || namaTingkat(d.tingkat)}</td></tr>
          <tr><td>NISN/NIS</td><td>:</td><td>{nisnNis}</td><td>Semester</td><td>:</td><td>{d.semester === 'Genap' ? '2 (Dua)' : '1 (Satu)'}</td></tr>
          <tr><td>Nama Sekolah</td><td>:</td><td>{(sk.singkat || sk.nama || '').toUpperCase()}</td><td>Tahun Pelajaran</td><td>:</td><td>{d.ta}</td></tr>
          <tr><td>Alamat Sekolah</td><td>:</td><td colSpan={4}>{sk.alamat}</td></tr>
        </tbody></table>

        <h2 className="rs-h">A. Sikap</h2>
        <table className="rp-tbl rs-tbl">
          <thead><tr><th colSpan={2}>Deskripsi</th></tr></thead>
          <tbody>
            <tr><td style={{ width: '42mm' }}><b>Sikap Spiritual</b></td><td className="j">{d.sikapSpiritual || '-'}</td></tr>
            <tr><td><b>Sikap Sosial</b></td><td className="j">{d.sikapSosial || '-'}</td></tr>
          </tbody>
        </table>

        <h2 className="rs-h">B. Pengetahuan</h2>
        <p style={{ margin: '0 0 2mm' }}><b>KKM Satuan Pendidikan: {d.kkmSatuan || ''}</b></p>
        <table className="rp-tbl rs-tbl">
          <thead>
            <tr><th rowSpan={2} style={{ width: '9mm' }}>No.</th><th rowSpan={2} style={{ width: '42mm' }}>Muatan Pelajaran</th><th colSpan={3}>Penilaian</th></tr>
            <tr><th style={{ width: '13mm' }}>Nilai</th><th style={{ width: '16mm' }}>Predikat</th><th>Deskripsi</th></tr>
          </thead>
          <tbody>
            {d.baris.map((b) => {
              no += 1;
              if (b.kelompok) {
                return [
                  <tr key={b.kelompok}><td className="c">{no}.</td><td colSpan={4}><b>{b.kelompok}</b></td></tr>,
                  ...b.anak.map((x, i) => (
                    <tr key={b.kelompok + x.mapel}><td /><td>{String.fromCharCode(97 + i)}. {x.mapel}</td><td className="c">{x.nilai ?? ''}</td><td className="c">{x.predikat}</td><td className="j">{x.deskripsi}</td></tr>
                  )),
                ];
              }
              return <tr key={b.mapel}><td className="c">{no}.</td><td>{b.mapel}</td><td className="c">{b.nilai ?? ''}</td><td className="c">{b.predikat}</td><td className="j">{b.deskripsi}</td></tr>;
            })}
          </tbody>
        </table>

        <div className="rs-blok">
          <h2 className="rs-h">C. Catatan Wali Kelas</h2>
          <div className="rs-kotak">{d.catatan || '-'}</div>
        </div>

        <div className="rs-blok">
        <h2 className="rs-h">D. Presensi</h2>
        <table className="rp-tbl rs-tbl" style={{ width: '90mm' }}><tbody>
          <tr><td>Sakit</td><td>: {Number(d.presensi.sakit) ? `${d.presensi.sakit} hari` : '-'}</td></tr>
          <tr><td>Izin</td><td>: {Number(d.presensi.izin) ? `${d.presensi.izin} hari` : '-'}</td></tr>
          <tr><td>Tanpa keterangan</td><td>: {Number(d.presensi.alpha) ? `${d.presensi.alpha} hari` : '-'}</td></tr>
        </tbody></table>
        </div>

        {d.keputusan && (
          <div className="rs-kotak" style={{ width: '110mm', marginTop: '5mm' }}>
            Keputusan:<br />Berdasarkan pencapaian seluruh kompetensi,<br />Peserta didik dinyatakan:<br /><br />
            <b>{d.keputusan.status === 'Tinggal' ? <>Tinggal di Kelas : {terbilangKelas(d.keputusan.kelas)}</> : d.keputusan.kelas ? <>Naik ke Kelas : {terbilangKelas(d.keputusan.kelas)}</> : <>Lulus</>}</b>
          </div>
        )}

        <div className="rs-ttd">
          <div>Mengetahui<br />Orang tua/wali<div className="rs-garis">{d.ortuTtd ? <b><u>{d.ortuTtd}</u></b> : titik}</div></div>
          <div>{d.tempat}, {tgl(d.tanggal)}<br />{d.sebutanWali}<div className="rs-garis"><b><u>{d.wali || titik}</u></b>{d.waliNiy ? <><br />NIY {d.waliNiy}</> : null}</div></div>
        </div>
        <div className="rs-ttd" style={{ justifyContent: 'center' }}>
          <div>Mengetahui,<br />Kepala Sekolah<div className="rs-garis"><b><u>{d.kepala || titik}</u></b>{d.kepalaNiy ? <><br />NIY {d.kepalaNiy}</> : null}</div></div>
        </div>
      </section>
    </>
  );
}

export default function DokumenRaporSd({ dokumen }) {
  const list = Array.isArray(dokumen) ? dokumen : [dokumen];
  return <div className="rp-dok">{list.map((d, i) => <SatuRaporSd key={i} d={d} />)}</div>;
}
