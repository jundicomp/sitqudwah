// Dokumen modul ajar — format sekolah (contoh: Modul Ajar Matematika Kelas 4 "Membandingkan Pecahan").
// `d` = hasil susunDokumenModul().
const kosong = (v) => !String(v ?? '').trim();

function Teks({ v }) {
  if (kosong(v)) return <span className="md-kosong">-</span>;
  return <>{String(v).trim().split('\n').map((b, i) => <div key={i}>{b || ' '}</div>)}</>;
}
// Format dokumen lama (sebelum ada Format Modul) -- urutan & judul bawaan.
const FORMAT_DEFAULT = [
  ['identitas', 'Identitas'], ['cp', 'Capaian Pembelajaran'], ['lintas', 'Lintas Disiplin Ilmu'], ['iktp', 'Indikator Ketercapaian Tujuan Pembelajaran (IKTP)'],
  ['pemicu', 'Topik Pembelajaran Kontekstual — Pertanyaan Pemicu'], ['identifikasi', 'Identifikasi'], ['desain', 'Desain Pembelajaran'],
  ['diferensiasi', 'Strategi Pembelajaran Berdiferensiasi'], ['dimensi', 'Dimensi Profil Pelajar Pancasila'], ['kegiatan', 'Kegiatan Pembelajaran'],
  ['asesmen', 'Asesmen Pembelajaran'], ['remedial', 'Remedial dan Pengayaan'], ['penutup', 'Penutup'], ['lampiran', 'Lampiran'],
].map(([id, judulTampil]) => ({ id, tipe: 'bawaan', judulTampil }));

function BagianTambahanDok({ b, nilai }) {
  if (b.tipe === 'tabel') {
    const tetap = (b.komponen || []).filter(Boolean);
    const simpan = Array.isArray(nilai) ? nilai : [];
    const baris = [...tetap.map(k => [k, simpan.find(r => r.komponen === k)?.deskripsi || '']), ...simpan.filter(r => !tetap.includes(r.komponen)).map(r => [r.komponen, r.deskripsi])];
    if (!baris.length) return <p className="md-p md-kosong">-</p>;
    return <Tabel kepala={['Komponen', 'Deskripsi']} baris={baris} />;
  }
  return <div className="md-p j"><Teks v={typeof nilai === 'string' ? nilai : ''} /></div>;
}

function Judul({ children }) { return <div className="md-bar">{children}</div>; }
function Tabel({ kepala, baris }) {
  return (
    <table className="md-tbl">
      <thead><tr><th style={{ width: '32%' }}>{kepala[0]}</th><th>{kepala[1]}</th></tr></thead>
      <tbody>{baris.map(([a, b], i) => <tr key={i}><td>{a}</td><td className="j"><Teks v={b} /></td></tr>)}</tbody>
    </table>
  );
}

export function SatuModul({ d }) {
  const i = d.isi;
  const faseKelas = [d.fase && `Fase ${d.fase}`, d.tingkat, d.semester].filter(Boolean).join(' / ');
  const BAGIAN = {
    identitas: (
      <>
      <Tabel kepala={['Komponen', 'Keterangan']} baris={[
        ['Penyusun', d.guru], ['Satuan Pendidikan', d.sekolah], ['Tahun Penyusunan', d.ta], ['Jenjang', d.jenjang],
        ['Mata Pelajaran', d.mapel], ['Fase / Kelas / Semester', faseKelas], ['Bab', d.bab], ['Materi Pokok', d.judul],
        ['Alokasi Waktu', d.alokasi], ['Kurikulum', i.kurikulum], ['Model Pembelajaran', d.model], ['Moda Pembelajaran', i.moda],
        ['Sarana dan Prasarana', i.sarana],
      ]} />
      </>
    ),
    cp: (
      <>
      <p className="md-p">Capaian Pembelajaran mengacu pada CP resmi untuk {d.fase ? `Fase ${d.fase}` : 'fase ini'}, mata pelajaran {d.mapel}.</p>
      {d.cp.length > 0 && (
        <table className="md-tbl">
          <thead><tr><th style={{ width: '22%' }}>Elemen</th><th>Capaian Pembelajaran{d.fase ? ` (Fase ${d.fase})` : ''}</th></tr></thead>
          <tbody>{d.cp.map((c, k) => <tr key={k}><td>{c.elemen}</td><td className="j">{c.capaian}</td></tr>)}</tbody>
        </table>
      )}
      </>
    ),
    lintas: (
      <>
      <div className="md-p j"><Teks v={i.lintasDisiplin} /></div>
      </>
    ),
    iktp: (
      <>
      {i.iktp.filter(x => !kosong(x.teks)).length
        ? <div className="md-p">{i.iktp.filter(x => !kosong(x.teks)).map((x, k) => <p key={k} className="md-iktp">{k + 1}. {x.teks}{x.level ? ` (${x.level})` : ''}</p>)}</div>
        : <p className="md-p md-kosong">-</p>}
      </>
    ),
    pemicu: (
      <>
      <div className="md-p j">{kosong(i.pertanyaanPemicu) ? <span className="md-kosong">-</span> : <span style={{ whiteSpace: 'pre-line' }}>Pertanyaan Pemicu: {String(i.pertanyaanPemicu).trim()}</span>}</div>
      </>
    ),
    identifikasi: (
      <>
      <Tabel kepala={['Komponen', 'Deskripsi']} baris={[['Kesiapan Murid', i.kesiapan], ['Karakteristik Materi Pelajaran', i.karakteristik]]} />
      </>
    ),
    desain: (
      <>
      <Tabel kepala={['Komponen', 'Deskripsi']} baris={[
        ['Tujuan Pembelajaran', i.tujuan || d.tp.map(x => x.tujuan).join('\n')], ['Topik Pembelajaran', i.topik], ['Praktik Pedagogis', i.praktik],
        ['Lingkungan Pembelajaran', i.lingkungan], ['Pemanfaatan Digital', i.digital],
      ]} />
      </>
    ),
    diferensiasi: (
      <>
      <Tabel kepala={['Aspek Diferensiasi', 'Bentuk Layanan']} baris={[
        ['Diferensiasi Konten', i.diferensiasi.konten], ['Diferensiasi Proses', i.diferensiasi.proses], ['Diferensiasi Produk', i.diferensiasi.produk],
      ]} />
      </>
    ),
    dimensi: (
      <>
      {i.dimensi.length
        ? <Tabel kepala={[d.dimensiJudul, 'Wujud Penerapan dalam Pembelajaran']} baris={i.dimensi.map(x => [x.nama, x.wujud])} />
        : <p className="md-p md-kosong">-</p>}
      </>
    ),
    kegiatan: (
      <>
      {i.kegiatan.map((p, k) => (
        <div key={k} className="md-pertemuan">
          <p className="md-p"><b>Pertemuan Ke-{k + 1}{d.menit ? ` (${d.menit} menit)` : ''}</b></p>
          {!kosong(p.subMateri) && <p className="md-p">Sub-bab/Materi: {p.subMateri}</p>}
          {!kosong(p.model || d.model) && <p className="md-p">Model Pembelajaran: {p.model || d.model}</p>}
          {!kosong(p.tujuan) && <p className="md-p j">Tujuan Pembelajaran: {p.tujuan}</p>}
          <table className="md-tbl md-keg">
            <thead><tr><th style={{ width: '22%' }}>Tahapan</th><th style={{ width: '11%' }}>Alokasi Waktu</th><th>Kegiatan Guru dan Murid</th></tr></thead>
            <tbody>
              {p.langkah.map((l, j) => (
                <tr key={j}>
                  <td><b>{l.tahap}</b>{l.sub ? <div className="md-sub">{l.sub}</div> : null}</td>
                  <td>{l.menit ? `${l.menit} menit` : ''}</td>
                  <td className="j"><Teks v={l.teks} /></td>
                </tr>
              ))}
              {!p.langkah.length && <tr><td colSpan={3} className="md-kosong">-</td></tr>}
            </tbody>
          </table>
        </div>
      ))}
      </>
    ),
    asesmen: (
      <>
      <table className="md-tbl">
        <thead><tr><th style={{ width: '14%' }}>Jenis</th><th style={{ width: '20%' }}>Teknik</th><th>Instrumen</th><th style={{ width: '20%' }}>Waktu Pelaksanaan</th></tr></thead>
        <tbody>{i.asesmen.map((a, k) => <tr key={k}><td>{a.jenis}</td><td><Teks v={a.teknik} /></td><td className="j"><Teks v={a.instrumen} /></td><td><Teks v={a.waktu} /></td></tr>)}</tbody>
      </table>
      </>
    ),
    remedial: (
      <>
      <Tabel kepala={['Komponen', 'Deskripsi']} baris={[['Remedial', i.remedial], ['Pengayaan', i.pengayaan]]} />
      </>
    ),
    penutup: (
      <>
      <div className="md-p j"><Teks v={i.penutup} /></div>
      </>
    ),
    lampiran: (
      <>
        <ol className="md-ol">{i.lampiran.map((l, k) => <li key={k}>{l.label || l.url}{l.url ? <span className="md-url"> — {l.url}</span> : null}</li>)}</ol>
      </>
    ),
  };

  return (
    <section className="rp-hal rp-flow md">
      <div className="md-kop">
        <div className="md-kop-1">MODUL AJAR — {(i.kurikulum || 'Kurikulum Merdeka').toUpperCase()}</div>
        <div className="md-kop-2">( {d.mapel.toUpperCase()} )</div>
        <div className="md-kop-3">{[d.jenjang, [d.fase && `Fase ${d.fase}`, d.kelas, d.semester].filter(Boolean).join(' / ')].filter(Boolean).join(' — ')}</div>
        <div className="md-kop-4">{d.bab || d.judul}</div>
      </div>

      {(d.format || FORMAT_DEFAULT).map(b => {
        if (b.id === 'lampiran' && !i.lampiran.length) return null;
        const judul = (b.judulTampil || b.judul || '').toUpperCase();
        return (
          <div key={b.id} className="md-bagian-dok">
            <Judul>{judul}</Judul>
            {b.tipe === 'bawaan' || !b.tipe ? BAGIAN[b.id] : <BagianTambahanDok b={b} nilai={i.tambahan?.[b.id]} />}
          </div>
        );
      })}

      <div className="md-ttd">
        <div>Mengetahui,<br />Kepala Sekolah<div className="md-garis">({d.kepala || '..............................'}){d.kepalaNiy ? <><br />NIY {d.kepalaNiy}</> : null}</div></div>
        <div>{d.tempat || '....................'}, ...................... 20.....<br />Guru Mata Pelajaran<div className="md-garis">({d.guru || '..............................'})</div></div>
      </div>
    </section>
  );
}

export default function DokumenModul({ dokumen }) {
  return <div className="rp-dok"><SatuModul d={dokumen} /></div>;
}
