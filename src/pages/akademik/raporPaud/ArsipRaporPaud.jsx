import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas } from '../../../db/akses';
import { labelRombel, SEMESTER_OPTIONS } from '../../../db/akademikFields';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import CetakRaporPaud from './CetakRaporPaud';

// Arsip rapor (PAUD & SD) yg sudah terbit. Yg dicetak di sini = SALINAN saat terbit, jadi
// hasilnya selalu sama walau data siswa / pengaturan rapor berubah di kemudian hari.
export default function ArsipRaporPaud({ jenis = '' }) {
  const { raporPaud, raporSekolah, siswa } = useAppData();
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
    { key: 'aksi', label: '', render: r => <button className="btn btn-sm" onClick={() => setCetak([r.arsip])}>🖨️ Cetak</button> },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Arsip rapor{jenis ? ` ${jenis}` : ''}</h3><p>Rapor yang sudah terbit, disimpan persis seperti saat dibagikan. Bisa dicetak ulang kapan saja, juga setelah anak naik jenjang atau lulus.</p></div>
        <button className="btn btn-sm" disabled={!rows.length} onClick={() => setCetak(rows.map(r => r.arsip))}>🖨️ Cetak semua yang tampil ({rows.length})</button>
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
    </div>
  );
}
