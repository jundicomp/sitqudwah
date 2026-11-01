import { formatTanggal } from '../../../db/helpers';

// Dokumen Rencana Pelaksanaan Pembelajaran Mingguan (RPPM) PAUD. `d` = susunDokumenRencana().
const tgl = (iso) => (iso ? formatTanggal(iso + 'T00:00:00') : '');
const kosong = (v) => !String(v ?? '').trim();
function Teks({ v }) {
  if (kosong(v)) return <span className="md-kosong">-</span>;
  return <>{String(v).trim().split('\n').map((b, i) => <div key={i}>{b || ' '}</div>)}</>;
}
const Judul = ({ children }) => <div className="md-bar">{children}</div>;

export function SatuRencanaPaud({ d }) {
  const i = d.isi;
  const periode = [d.mulai && tgl(d.mulai), d.selesai && tgl(d.selesai)].filter(Boolean).join(' – ');
  return (
    <section className="rp-hal rp-flow md">
      <div className="md-kop">
        <div className="md-kop-1">RENCANA PELAKSANAAN PEMBELAJARAN MINGGUAN (RPPM)</div>
        <div className="md-kop-2">{(d.satuan || '').toUpperCase()}</div>
        <div className="md-kop-3">{d.kelas}{d.rombel ? ` ${d.rombel}` : ''} — Semester {d.semester} {d.ta}</div>
      </div>
      <Judul>IDENTITAS</Judul>
      <table className="md-tbl"><tbody>
        {[['Satuan PAUD', d.satuan], ['Kelompok', `${d.kelas}${d.rombel ? ` ${d.rombel}` : ''}`], ['Semester / Minggu ke', `${d.semester}${d.minggu ? ` / ${d.minggu}` : ''}`],
          ['Tema', d.tema], ['Subtema', d.subtema], ['Waktu pelaksanaan', periode], ['Guru kelas', d.guru]].map(([a, b]) => (
          <tr key={a}><td style={{ width: '32%' }}>{a}</td><td>{b || '-'}</td></tr>
        ))}
      </tbody></table>

      <Judul>TUJUAN PEMBELAJARAN</Judul>
      <div className="md-p j"><Teks v={i.tujuan} /></div>
      {i.elemen.length > 0 && <p className="md-p"><b>Elemen yang dikembangkan:</b> {i.elemen.join(', ')}</p>}

      <Judul>KEGIATAN PEMBELAJARAN</Judul>
      <table className="md-tbl md-keg">
        <thead><tr><th style={{ width: '11%' }}>Hari</th><th style={{ width: '20%' }}>Pembukaan</th><th>Kegiatan Inti</th><th style={{ width: '20%' }}>Penutup</th><th style={{ width: '16%' }}>Elemen</th></tr></thead>
        <tbody>
          {i.hari.map(h => (
            <tr key={h.hari}><td><b>{h.hari}</b></td><td className="j"><Teks v={h.pembukaan} /></td><td className="j"><Teks v={h.inti} /></td><td className="j"><Teks v={h.penutup} /></td><td>{h.elemen.join(', ') || '-'}</td></tr>
          ))}
          {!i.hari.length && <tr><td colSpan={5} className="md-kosong">-</td></tr>}
        </tbody>
      </table>

      <Judul>ALAT DAN BAHAN</Judul>
      <div className="md-p j"><Teks v={i.alat} /></div>

      <Judul>RENCANA ASESMEN</Judul>
      <p className="md-p"><b>Teknik:</b> {i.teknik.length ? i.teknik.join(', ') : '-'}</p>
      <div className="md-p j"><Teks v={i.asesmen} /></div>

      {!kosong(i.catatan) && <><Judul>CATATAN</Judul><div className="md-p j"><Teks v={i.catatan} /></div></>}

      <div className="md-ttd">
        <div>Mengetahui,<br />{d.jabatanKepala || 'Kepala Sekolah'}<div className="md-garis">({d.kepala || '..............................'}){d.kepalaNiy ? <><br />NIY {d.kepalaNiy}</> : null}</div></div>
        <div>{d.tempat || '....................'}, ...................... 20.....<br />Guru Kelas<div className="md-garis">({d.guru || '..............................'})</div></div>
      </div>
    </section>
  );
}

export default function DokumenRencanaPaud({ dokumen }) {
  return <div className="rp-dok"><SatuRencanaPaud d={dokumen} /></div>;
}
