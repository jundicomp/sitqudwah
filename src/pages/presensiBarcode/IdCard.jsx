import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import Barcode from '../../components/common/Barcode';
import { TabBar, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { siswaDiRombel, labelRombel } from '../../db/akademikFields';
import { pegawaiAktif } from '../../db/kepegawaianFields';
import { kodeSiswa, kodeGuru } from '../../db/presensiBarcodeFields';
import { formatTanggalTampil } from '../../db/helpers';
import { printElementById } from '../../utils/exportTable';

const TABS = [
  { id: 'siswa', label: 'KARTU SISWA' },
  { id: 'guru', label: 'KARTU GURU & STAFF' },
];

function Kepala({ profil, jenis }) {
  return (
    <div className="idcard-top">
      {profil?.logo ? <img src={profil.logo} alt="" /> : <div className="logo" />}
      <div><div className="sek">{profil?.nama || 'MI Ikhlasiyah'}</div><div className="jenis">{jenis}</div></div>
    </div>
  );
}

function Kartu({ o, tipe, profil, ta, idPrefix }) {
  const kode = tipe === 'siswa' ? kodeSiswa(o) : kodeGuru(o);
  return (
    <>
      <div className="idcard" id={`${idPrefix}-depan`}>
        <div className="idcard-strip" />
        <Kepala profil={profil} jenis={tipe === 'siswa' ? 'KARTU PELAJAR' : 'KARTU PEGAWAI'} />
        <div className="idcard-body">
          <div className="idcard-nama">{o.nama}</div>
          {tipe === 'siswa' ? (
            <>
              <div className="idcard-row">NISN: <b>{o.nisn || '-'}</b></div>
              <div className="idcard-row">Kelas: {labelRombel(o.kelasTingkat, o.rombel) || '-'}</div>
              <div className="idcard-row">TTL: {o.tempatLahir || '-'}, {o.tanggalLahir ? formatTanggalTampil(o.tanggalLahir) : '-'}</div>
              <div className="idcard-row">Tahun Ajaran: {ta || '-'}</div>
            </>
          ) : (
            <>
              <div className="idcard-row">NIP: <b>{o.nip || '-'}</b></div>
              <div className="idcard-row">{o.kategori || 'Pegawai'}{o.jabatan ? ` · ${o.jabatan}` : ''}</div>
              {o.mapel && <div className="idcard-row">Mapel: {o.mapel}</div>}
            </>
          )}
        </div>
      </div>
      <div className="idcard back" id={`${idPrefix}-belakang`}>
        <Kepala profil={profil} jenis="KARTU PRESENSI" />
        <div className="idcard-body">
          Tunjukkan kartu ini ke scanner saat datang dan pulang. Kartu berlaku selama terdaftar aktif.
          Jika menemukan kartu ini, mohon kembalikan ke {profil?.nama || 'sekolah'}{profil?.alamat ? `, ${profil.alamat}` : ''}.
        </div>
        <div className="idcard-bar">{kode ? <Barcode value={kode} height={44} width={260} fontSize={10} /> : <span style={{ fontSize: 11, color: 'var(--red)' }}>NISN kosong — barcode tidak bisa dibuat</span>}</div>
      </div>
    </>
  );
}

async function unduhJpg(elementId, namaFile) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/jpeg', 0.95);
  a.download = namaFile;
  a.click();
}

export default function IdCard() {
  const { siswa, guru, profilSekolah, tahunAjaranAktif } = useAppData();
  const { rombelList } = useAkademikOptions();
  const { tab, setTab, bolehTab } = useTabAccess('id-card', TABS.map(t => t.id));
  const [rombelKey, setRombelKey] = useState('');
  const [cari, setCari] = useState('');
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);

  const orang = useMemo(() => {
    const t = cari.trim().toLowerCase();
    let list;
    if (tab === 'siswa') {
      const rb = rombelList.find(r => r.key === rombelKey);
      list = t ? siswa.filter(s => s.status === 'Aktif') : rb ? siswaDiRombel(siswa, rb.tingkat, rb.rombel) : [];
    } else list = pegawaiAktif(guru);
    return t ? list.filter(o => `${o.nama} ${o.nisn || o.nip || ''}`.toLowerCase().includes(t)) : list;
  }, [tab, siswa, guru, rombelList, rombelKey, cari]);
  const tanpaKode = tab === 'siswa' ? orang.filter(o => !o.nisn).length : 0;

  return (
    <Page pageId="id-card" title="Barcode & ID Card" path="Presensi Barcode / Barcode & ID Card">
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={t => { setTab(t); setCari(''); }} bolehTab={bolehTab} />
        <div className="card-body">
          <div className="filter-bar">
            {tab === 'siswa' && <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: r.label }))} /></Field>}
            <Field label="Cari nama" grow><input value={cari} onChange={e => setCari(e.target.value)} placeholder={tab === 'siswa' ? 'nama atau NISN (semua kelas)' : 'nama atau NIP'} /></Field>
            <button className="btn btn-primary" onClick={() => printElementById('idcard-cetak')} disabled={!orang.length}>🖨️ Cetak {orang.length} kartu</button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
            Ukuran kartu 85,6 × 54 mm (ukuran KTP), sisi depan dan belakang berdampingan. Cetak di kertas A4 lalu potong, atau unduh per kartu sebagai JPG untuk dicetak di percetakan.
            {tanpaKode > 0 && <b style={{ color: 'var(--red)' }}> {tanpaKode} siswa belum punya NISN sehingga barcode-nya kosong.</b>}
          </p>
          {!orang.length ? <Kosong>Tidak ada data untuk ditampilkan.</Kosong> : (
            <div id="idcard-cetak" className="idcard-sheet">
              {orang.map(o => (
                <div key={o.id} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <Kartu o={o} tipe={tab} profil={profilSekolah} ta={tahunAjaranAktif?.label} idPrefix={`kartu-${o.id}`} />
                  <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => unduhJpg(`kartu-${o.id}-depan`, `Kartu_${o.nama}_depan.jpg`)}>JPG depan</button>
                    <button className="btn btn-sm" onClick={() => unduhJpg(`kartu-${o.id}-belakang`, `Kartu_${o.nama}_belakang.jpg`)}>JPG belakang</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
