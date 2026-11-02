import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas, bolehMenerbitkan } from '../../../db/akses';
import { terapkanTtd, ortuDariDokumen } from '../../../db/penandatanganFields';
import { upsertRaporPaudToSheet, upsertRaporSekolahToSheet, addLogEntry } from '../../../services/googleSheets';
import Modal from '../../../components/common/Modal';
import { labelRombel, SEMESTER_OPTIONS } from '../../../db/akademikFields';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import CetakRaporPaud from './CetakRaporPaud';

// Arsip rapor (PAUD & SD) yg sudah terbit. Yg dicetak di sini = SALINAN saat terbit, jadi
// hasilnya selalu sama walau data siswa / pengaturan rapor berubah di kemudian hari.
export default function ArsipRaporPaud({ jenis = '' }) {
  const { raporPaud, raporSekolah, siswa, guru, penandatangan, refreshRaporPaud, refreshRaporSekolah, toast } = useAppData();
  const [perbarui, setPerbarui] = useState(null); // daftar baris arsip
  const { currentUser } = useAuth();
  const { tahunAjaranOptions, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState('');
  const [formatPilih, setFormat] = useState('');
  const format = jenis || formatPilih;
  const [cetak, setCetak] = useState(null);
  const semua = bolehLihatSemuaKelas(currentUser);
  // Wali kelas: hanya anak yg SEKARANG ada di kelasnya, plus rapor yg dulu dia terbitkan dari kelasnya.
  const rombelSaya = useMemo(() => rombelList.filter(r => r.wali && r.wali === currentUser?.guru), [rombelList, currentUser]);
  const idAnakSaya = useMemo(() => new Set(siswa.filter(s => rombelSaya.some(r => r.tingkat === s.kelasTingkat && r.rombel === s.rombel)).map(s => s.idSiswa)), [siswa, rombelSaya]);

  const rows = useMemo(() => [...raporPaud.map(r => ({ ...r, format: 'PAUD' })), ...raporSekolah.map(r => ({ ...r, format: 'SD' }))]
    .filter(r => r.status === 'Terbit' && r.arsip)
    .filter(r => !format || r.format === format)
    .filter(r => semua || idAnakSaya.has(r.idSiswa) || r.arsip?.wali === currentUser?.guru)
    .filter(r => (!ta || r.tahunAjaran === ta) && (!semester || r.semester === semester))
    .map(r => ({ ...r, kelas: labelRombel(r.tingkat, r.rombel) })), [raporPaud, raporSekolah, semua, idAnakSaya, currentUser, ta, semester, format]);

  const columns = [
    { key: 'nama', label: 'Nama Siswa', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.idSiswa}</div></> },
    { key: 'format', label: 'Format', sortable: true, render: r => <span className={`badge ${r.format === 'PAUD' ? 'badge-gold' : 'badge-blue'}`}>{r.format}</span> },
    { key: 'tahunAjaran', label: 'Tahun Ajaran', sortable: true },
    { key: 'semester', label: 'Semester', sortable: true },
    { key: 'kelas', label: 'Kelas saat itu', sortable: true },
    { key: 'tanggalTerbit', label: 'Terbit', sortable: true },
    { key: 'wali', label: 'Wali Kelas', accessor: r => r.arsip?.wali || '-' },
    { key: 'aksi', label: '', render: r => <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-sm" onClick={() => setCetak([r.arsip])}>🖨️ Cetak</button>{bolehMenerbitkan(currentUser) && <button className="btn btn-sm" onClick={() => setPerbarui([r])} title="Perbarui penandatangan" aria-label={`Perbarui penandatangan ${r.nama}`}>✍️</button>}</div> },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Arsip rapor{jenis ? ` ${jenis}` : ''}</h3><p>Rapor yang sudah terbit, disimpan persis seperti saat dibagikan. Bisa dicetak ulang kapan saja, juga setelah anak naik jenjang atau lulus.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bolehMenerbitkan(currentUser) && <button className="btn btn-sm" disabled={!rows.length} onClick={() => setPerbarui(rows)}>✍️ Perbarui penandatangan ({rows.length})</button>}
          <button className="btn btn-sm" disabled={!rows.length} onClick={() => setCetak(rows.map(r => r.arsip))}>🖨️ Cetak semua yang tampil ({rows.length})</button>
        </div>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} placeholder="Semua" /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} placeholder="Semua" /></Field>
          {!jenis && <Field label="Format"><Select value={format} onChange={setFormat} options={['PAUD', 'SD']} placeholder="Semua" /></Field>}
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.format + r.id} defaultSortKey="tanggalTerbit" defaultSortDir="desc" pageSize={25}
          searchFn={(r, t) => `${r.nama} ${r.idSiswa} ${r.kelas}`.toLowerCase().includes(t)} emptyMessage="Belum ada rapor yang terbit." />
      </div>
      {cetak && <CetakRaporPaud dokumen={cetak} onSelesai={() => setCetak(null)} />}
      {perbarui && <PerbaruiTtd rows={perbarui} penandatangan={penandatangan} guru={guru} toast={toast} currentUser={currentUser}
        onClose={() => setPerbarui(null)} onSelesai={async () => { await Promise.all([refreshRaporPaud(), refreshRaporSekolah()]); setPerbarui(null); }} />}
    </div>
  );
}

// v1.60.0: ganti HANYA bagian tanda tangan di arsip rapor yg sudah terbit.
const ringkasTtd = (d) => ({
  kepala: [d.kepala, d.kepalaNiy && `NIY ${d.kepalaNiy}`].filter(Boolean).join(' · '),
  wali: [d.wali, d.waliNiy && `NIY ${d.waliNiy}`].filter(Boolean).join(' · '),
  ortu: d.ortuTtd || '',
});
function PerbaruiTtd({ rows, penandatangan, guru, toast, currentUser, onClose, onSelesai }) {
  const [menyimpan, setMenyimpan] = useState(false);
  const daftar = rows.map(r => {
    const baru = terapkanTtd(r.arsip, penandatangan[r.format], { guru, ortu: ortuDariDokumen({ ...r.arsip, jenis: r.format }) });
    const a = ringkasTtd(r.arsip), b = ringkasTtd(baru);
    return { r, baru, a, b, beda: a.kepala !== b.kepala || a.wali !== b.wali || a.ortu !== b.ortu || r.arsip.jabatanKepala !== baru.jabatanKepala || r.arsip.tempat !== baru.tempat };
  });
  const berubah = daftar.filter(x => x.beda);
  const satu = rows.length === 1 ? daftar[0] : null;

  async function jalankan() {
    setMenyimpan(true);
    try {
      const baris = (x) => ({
        'Tahun Ajaran': x.r.tahunAjaran, Semester: x.r.semester, 'ID Siswa': x.r.idSiswa, NISN: x.r.nisn, 'Nama Siswa': x.r.nama,
        Tingkat: x.r.tingkat, Rombel: x.r.rombel, Isian: JSON.stringify(x.r.isian || {}), Status: x.r.status,
        'Tanggal Terbit': x.r.tanggalTerbit, Arsip: JSON.stringify(x.baru),
        'Diubah Oleh': currentUser.nama, 'Diubah Pada': new Date().toISOString(),
      });
      const paud = berubah.filter(x => x.r.format === 'PAUD').map(baris);
      const sd = berubah.filter(x => x.r.format === 'SD').map(baris);
      if (paud.length) await upsertRaporPaudToSheet(paud);
      if (sd.length) await upsertRaporSekolahToSheet(sd);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Perbarui Penandatangan Rapor', modul: 'Rapor Digital', detail: `${berubah.length} rapor: ${berubah.slice(0, 5).map(x => x.r.nama).join(', ')}${berubah.length > 5 ? ', …' : ''}` });
      toast(`Penandatangan ${berubah.length} rapor diperbarui.`);
      await onSelesai();
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  const sel = (v) => (v ? v : <span style={{ color: 'var(--red)' }}>…………</span>);
  return (
    <Modal title="Perbarui penandatangan" onClose={onClose}
      subtitle={satu ? `${satu.r.nama} · ${satu.r.kelas} · ${satu.r.tahunAjaran} ${satu.r.semester} · terbit ${satu.r.tanggalTerbit}` : `${rows.length} rapor yang tampil · ${berubah.length} akan berubah`}
      actions={<><button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" disabled={!berubah.length || menyimpan} onClick={jalankan}>{menyimpan ? 'Memperbarui…' : berubah.length ? `Perbarui${rows.length > 1 ? ` ${berubah.length} rapor` : ''}` : 'Sudah sesuai'}</button></>}>
      {satu ? (
        <table style={{ fontSize: 13 }}>
          <thead><tr><th /><th>Tercetak sekarang</th><th>Sesudah diperbarui</th></tr></thead>
          <tbody>
            <tr><td>Kepala</td><td>{sel(satu.a.kepala)}</td><td><b>{sel(satu.b.kepala)}</b></td></tr>
            <tr><td>Wali kelas</td><td>{sel(satu.a.wali)}</td><td><b>{sel(satu.b.wali)}</b></td></tr>
            <tr><td>Orang tua</td><td>{sel(satu.a.ortu)}</td><td><b>{sel(satu.b.ortu)}</b></td></tr>
          </tbody>
        </table>
      ) : (
        <div className="table-scroll" style={{ maxHeight: '50vh' }}><table style={{ fontSize: 12.5 }}>
          <thead><tr><th>Siswa</th><th>Kepala sesudah</th><th>Wali kelas sesudah</th><th>Orang tua sesudah</th></tr></thead>
          <tbody>{berubah.map(x => <tr key={x.r.format + x.r.id}><td>{x.r.nama}</td><td>{sel(x.b.kepala)}</td><td>{sel(x.b.wali)}</td><td>{sel(x.b.ortu)}</td></tr>)}
            {!berubah.length && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>Semua rapor sudah memakai penandatangan terbaru.</td></tr>}</tbody>
        </table></div>
      )}
      <div className="banner-info" style={{ marginTop: 12 }}><span>Hanya bagian tanda tangan yang diganti. Nilai, deskripsi, foto, dan tanggal rapor tetap. Kepala dipilih sesuai tanggal rapor.</span></div>
    </Modal>
  );
}
