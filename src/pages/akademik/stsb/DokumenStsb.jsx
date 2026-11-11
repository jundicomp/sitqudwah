import KopSurat from '../../../components/common/KopSurat';

// Dokumen cetak STSB PAUD (v1.68.0). d = hasil susunStsb().
// Teks **tebal** di kalimat keikutsertaan dicetak tebal.
function Tebal({ teks }) {
  return String(teks || '').split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : x));
}
const Baris = ({ teks }) => String(teks || '').split('\n').map((x, i) => <div key={i}>{x || ' '}</div>);

function Identitas({ rows }) {
  return (
    <table className="stsb-idt">
      <tbody>
        {rows.map(([l, v, tebal]) => (
          <tr key={l}><td className="l">{l}</td><td className="t">:</td><td className={tebal ? 'v b' : 'v'}>{v || '-'}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function NamaTtd({ nama, labelNomor, nomor }) {
  return (
    <>
      <div className="stsb-nama">{nama || '..............................'}</div>
      {labelNomor && nomor && <div className="stsb-nomor">{labelNomor} {nomor}</div>}
    </>
  );
}

export function SatuStsb({ d }) {
  const { st, anak } = d;
  return (
    <>
      <div className="rp-hal stsb">
        <KopSurat jenjang="PAUD" />
        <div className="stsb-judul">
          <h1>{st.judul}</h1>
          <div>{st.labelTahun} {d.ta}</div>
          <div>No: {d.nomor || '…'}</div>
        </div>
        <p className="stsb-diberi">Diberikan kepada:</p>
        <Identitas rows={[
          ['Nama', anak.nama, true], ['No. Induk Siswa', anak.nis], ['No. Induk Siswa Nasional', anak.nisn],
          ['Tempat/Tanggal Lahir', anak.ttl], ['Nama Ibu', anak.ibu], ['Kelompok Usia', anak.usia], ['Alamat', anak.alamat],
        ]} />
        <p className="stsb-kalimat"><Tebal teks={st.kalimat} /></p>
        <div className={`stsb-ttd ${d.kiri.aktif ? '' : 'tanpa-kiri'}`}>
          {d.kiri.aktif && (
            <div className="stsb-blok">
              <div>{d.kiri.pembuka}</div>
              <Baris teks={d.kiri.jabatan} />
              <div className="stsb-ruang" />
              <NamaTtd nama={d.kiri.nama} labelNomor={d.kiri.labelNomor} nomor={d.kiri.nomor} />
            </div>
          )}
          <div className="stsb-foto-sel">
            {st.pasFoto && (anak.foto ? <img className="stsb-foto" src={anak.foto} alt="" /> : <div className="stsb-foto kosong">Pas Foto</div>)}
          </div>
          <div className="stsb-blok">
            <div>{st.tempat}{st.tempat ? ', ' : ''}{d.tanggal || '…'}</div>
            <Baris teks={d.kanan.jabatan} />
            <div className="stsb-ruang" />
            <NamaTtd nama={d.kanan.nama} labelNomor={d.kanan.labelNomor} nomor={d.kanan.nomor} />
          </div>
        </div>
      </div>
      {st.halaman2 && (
        <div className="rp-hal stsb">
          <div className="stsb-judul"><h1>{st.judul2}</h1></div>
          <Identitas rows={[
            ['Nama', anak.nama, true], ['No. Induk Siswa', anak.nis], ['No. Induk Siswa Nasional', anak.nisn],
            ['Agama', anak.agama], ['Kelompok Usia', anak.usia],
          ]} />
          <table className="stsb-nilai">
            <thead><tr><th style={{ width: '13%' }}>No.</th><th>Aspek Perkembangan dan Pencapaiannya</th><th style={{ width: '17%' }}>Nilai</th></tr></thead>
            <tbody>
              {d.nilai.map((x, i) => <tr key={x.aspek}><td className="c">{i + 1}.</td><td>{x.aspek}</td><td className="c b">{x.kode}</td></tr>)}
            </tbody>
          </table>
          <div className="stsb-bawah">
            <div className="stsb-ket">
              <div>Keterangan:</div>
              <table><tbody>{st.skala.map(k => <tr key={k.kode}><td>{k.kode}</td><td>:</td><td>{k.nama}</td></tr>)}</tbody></table>
            </div>
            <div className="stsb-blok">
              <div>{st.tempat}{st.tempat ? ', ' : ''}{d.tanggal || '…'}</div>
              <Baris teks={d.kanan.jabatan} />
              <div className="stsb-ruang" />
              <NamaTtd nama={d.kanan.nama} labelNomor={d.kanan.labelNomor} nomor={d.kanan.nomor} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
