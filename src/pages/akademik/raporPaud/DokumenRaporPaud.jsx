import { formatTanggal } from '../../../db/helpers';

const ANGKA = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas', 'Dua Belas'];
const terbilang = (n) => { const x = Number(n); return Number.isInteger(x) && ANGKA[x] ? `${x} (${ANGKA[x]})` : String(n || '-'); };
const tgl = (iso) => (iso ? formatTanggal(String(iso).slice(0, 10) + 'T00:00:00') : '');
const titik = (v) => (v ? v : '-');

function Hal({ nomor, children }) {
  return (
    <section className="rp-hal">
      {children}
      <div className="rp-hlm">{nomor}</div>
    </section>
  );
}

function KotakDeskripsi({ teks, semangat, foto, tanpaFoto }) {
  return (
    <div className="rp-kotak">
      <div className="rp-kh">Deskripsi Perkembangan Anak</div>
      <div className="rp-isi">
        <p style={{ margin: '0 0 4mm' }}>{teks || '-'}</p>
        {semangat && <p style={{ margin: 0 }}>{semangat}</p>}
      </div>
      {!tanpaFoto && (
        <>
          <div className="rp-kh atas">Foto Kegiatan</div>
          <div className="rp-foto">
            {foto.length ? foto.map(u => <img key={u} src={u} alt="Foto kegiatan" />) : <span style={{ color: '#777', fontSize: '10pt', padding: '10mm 0' }}>Belum ada foto</span>}
          </div>
        </>
      )}
    </div>
  );
}

function TabelCentang({ judulKolom, rows, skala, nomor }) {
  return (
    <table className="rp-tbl">
      <thead>
        <tr>
          {nomor && <th rowSpan={2} style={{ width: '10mm' }}>NO</th>}
          <th rowSpan={2}>{judulKolom}</th>
          <th colSpan={skala.length}>CAPAIAN PERKEMBANGAN</th>
        </tr>
        <tr>{skala.map(k => <th key={k} style={{ width: '14mm' }}>{k}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.nama}>
            {nomor && <td className="c">{i + 1}</td>}
            <td style={nomor ? undefined : { padding: '3mm 2mm' }}>{r.nama}</td>
            {skala.map(k => <td key={k} className="c">{r.capaian === k ? '√' : ''}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Satu dokumen rapor PAUD lengkap. `d` = hasil susunDokumenPaud() (atau arsip tersimpan).
export function SatuRaporPaud({ d }) {
  const a = d.anak; const k = d.keluarga;
  const ttl = [a.tempatLahir, a.tanggalLahir ? tgl(a.tanggalLahir) : ''].filter(Boolean).join(', ');
  const anakKe = a.anakKe ? `${terbilang(a.anakKe)}${a.jumlahSaudara ? ` Dari: ${terbilang(a.jumlahSaudara)} Bersaudara` : ''}` : '-';
  const tanggalTtd = `${d.tempat}, ${tgl(d.tanggal)}`;
  const elemenPertama = d.elemen[0];
  let hal = 0;
  return (
    <>
      <Hal nomor="i">
        <h1>KETERANGAN DIRI ANAK</h1>
        <h2>A.&nbsp;&nbsp;IDENTITAS ANAK</h2>
        <div className="rp-idt">
          <span>1.</span><span>Nama Lengkap</span><span>: {titik(a.nama)}</span>
          <span>2.</span><span>Nama Panggilan</span><span>: {titik(a.panggilan)}</span>
          <span>3.</span><span>NISN</span><span>: {titik(a.nisn)}</span>
          <span>4.</span><span>Jenis Kelamin</span><span>: {titik(a.jk)}</span>
          <span>5.</span><span>Tempat, Tanggal Lahir</span><span>: {titik(ttl)}</span>
          <span>6.</span><span>Anak Ke</span><span>: {anakKe}</span>
        </div>
        <h2>B.&nbsp;&nbsp;IDENTITAS KELUARGA</h2>
        <div className="rp-idt">
          <span>1.</span><span>Nama Ayah</span><span>: {titik(k.ayah)}</span>
          <span>2.</span><span>Pekerjaan</span><span>: {titik(k.pekerjaanAyah)}</span>
          <span>3.</span><span>Nomor Telp</span><span>: {titik(k.hpAyah)}</span>
          <span>4.</span><span>Nama Ibu</span><span>: {titik(k.ibu)}</span>
          <span>5.</span><span>Pekerjaan</span><span>: {titik(k.pekerjaanIbu)}</span>
          <span>6.</span><span>Alamat Lengkap</span><span>: {titik(k.alamat)}</span>
          <span>7.</span><span>Nomor Telp</span><span>: {titik(k.hpIbu)}</span>
        </div>
        <div style={{ marginTop: '10mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8mm' }}>
          {a.foto ? <img className="rp-pasfoto" src={a.foto} alt="Pas foto" /> : <div className="rp-pasfoto kosong">Pas foto</div>}
          <div style={{ textAlign: 'center', minWidth: '75mm' }}>
            {tanggalTtd}<br />{d.jabatanKepala.replace(/^Kepala Satuan /, 'Kepala ')}
            <div style={{ height: '20mm' }} />
            <b><u>{d.kepala || '................................'}</u></b>
          </div>
        </div>
      </Hal>

      <Hal nomor="ii">
        <h1>PETUNJUK PENGGUNAAN</h1>
        <ol style={{ margin: 0, paddingLeft: '6mm', textAlign: 'justify', lineHeight: 1.7 }}>
          {d.petunjuk.map((p, i) => <li key={i} style={{ marginBottom: '2mm' }}>{p.replace(/^\d+[.)]\s*/, '')}</li>)}
        </ol>
      </Hal>

      {d.elemen.map((e) => {
        hal += 1;
        return (
          <Hal key={e.nama} nomor={hal}>
            {e === elemenPertama && (
              <div className="rp-kop">LAPORAN PERKEMBANGAN ANAK DIDIK<br />{d.satuan.toUpperCase()}<br />SEMESTER {d.semesterRomawi}<br />TAHUN PELAJARAN {d.ta}</div>
            )}
            <h2>{e.huruf}.&nbsp;&nbsp;{e.nama.toUpperCase()}{e.sub ? <i> ({e.sub})</i> : null}</h2>
            <KotakDeskripsi teks={e.teks} semangat={e.semangat} foto={e.foto} />
          </Hal>
        );
      })}

      {(d.mulok.some(m => m.rows.length)) && (() => { hal += 1; return (
        <Hal nomor={hal}>
          <h2>MUATAN LOKAL</h2>
          {d.mulok.filter(m => m.rows.length).map((m, i) => (
            <div key={m.program} style={{ marginBottom: '6mm' }}>
              <h2 style={{ marginLeft: '6mm' }}>{i + 1}.&nbsp;&nbsp;{m.program.toUpperCase()}</h2>
              <div style={{ marginLeft: '6mm' }}><TabelCentang judulKolom="ASPEK PENILAIAN" rows={m.rows} skala={d.skala} nomor /></div>
            </div>
          ))}
        </Hal>
      ); })()}

      {(() => { hal += 1; return (
        <Hal nomor={hal}>
          <h2>KARAKTER SISWA</h2>
          {d.karakter.length > 0 && <TabelCentang judulKolom="BIDANG PENGEMBANGAN KARAKTER" rows={d.karakter} skala={d.skala} />}
          <div style={{ marginTop: '7mm', marginLeft: '-6mm' }}>
            <KotakDeskripsi teks={d.deskripsiKarakter} semangat={d.semangatKarakter} foto={[]} tanpaFoto />
          </div>
        </Hal>
      ); })()}

      {(() => { hal += 1; return (
        <Hal nomor={hal}>
          <h2>TUMBUH KEMBANG ANAK ( KESEHATAN )</h2>
          <table className="rp-tbl">
            <thead><tr><th style={{ width: '10mm' }}>No</th><th>Aspek Perkembangan</th><th style={{ width: '50mm' }}>Keterangan</th></tr></thead>
            <tbody>{d.kesehatan.map((x, i) => <tr key={x.nama}><td className="c">{i + 1}</td><td>{x.nama}</td><td className="c">{titik(x.nilai)}</td></tr>)}</tbody>
          </table>
          <h2 style={{ marginTop: '7mm' }}>PRESENSI KEHADIRAN</h2>
          <table className="rp-tbl">
            <thead><tr><th style={{ width: '10mm' }}>NO</th><th>KETERANGAN</th><th style={{ width: '50mm' }}>SEMESTER {d.semesterRomawi}</th></tr></thead>
            <tbody>
              {[['Sakit', d.presensi.sakit], ['Ijin', d.presensi.izin], ['Alpa / Tanpa Keterangan', d.presensi.alpha]].map(([n, v], i) => (
                <tr key={n}><td className="c">{i + 1}</td><td>{n}</td><td className="c">{Number(v) ? `${v} Hari` : '- Hari'}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="rp-ttd">
            <div className="baris">
              <div className="sel"><span style={{ marginTop: '9mm' }}>Wali Kelas</span><span>{d.wali || '................................'}</span></div>
              <div className="sel"><span>{tanggalTtd}<br /><br />Orang Tua / Wali Murid</span><span>................................</span></div>
            </div>
            <div className="bawah"><span>Mengetahui,<br />{d.jabatanKepala}</span><b>{d.kepala || '................................'}</b></div>
          </div>
        </Hal>
      ); })()}
    </>
  );
}

export default function DokumenRaporPaud({ id, dokumen }) {
  const list = Array.isArray(dokumen) ? dokumen : [dokumen];
  return (
    <div id={id} className="rp-dok rp-cetak">
      {list.map((d, i) => <SatuRaporPaud key={(d.anak?.idSiswa || '') + i} d={d} />)}
    </div>
  );
}
