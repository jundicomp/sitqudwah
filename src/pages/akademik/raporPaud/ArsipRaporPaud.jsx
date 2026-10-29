import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas } from '../../../db/akses';
import { labelRombel, SEMESTER_OPTIONS } from '../../../db/akademikFields';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import CetakRaporPaud from './CetakRaporPaud';

// Arsip rapor PAUD yg sudah terbit. Yg dicetak di sini = SALINAN saat terbit, jadi
// hasilnya selalu sama walau data siswa / pengaturan rapor berubah di kemudian hari.
export default function ArsipRaporPaud() {
  const { raporPaud, siswa } = useAppData();
  const { currentUser } = useAuth();
  const { tahunAjaranOptions, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState('');
  const [cetak, setCetak] = useState(null);
  const semua = bolehLihatSemuaKelas(currentUser);
  // Wali kelas: hanya anak yg SEKARANG ada di kelasnya, plus rapor yg dulu dia terbitkan dari kelasnya.
  const rombelSaya = useMemo(() => rombelList.filter(r => r.wali && r.wali === currentUser?.guru), [rombelList, currentUser]);
  const idAnakSaya = useMemo(() => new Set(siswa.filter(s => rombelSaya.some(r => r.tingkat === s.kelasTingkat && r.rombel === s.rombel)).map(s => s.idSiswa)), [siswa, rombelSaya]);

  const rows = useMemo(() => raporPaud
    .filter(r => r.status === 'Terbit' && r.arsip)
    .filter(r => semua || idAnakSaya.has(r.idSiswa) || r.arsip?.wali === currentUser?.guru)
    .filter(r => (!ta || r.tahunAjaran === ta) && (!semester || r.semester === semester))
    .map(r => ({ ...r, kelas: labelRombel(r.tingkat, r.rombel) })), [raporPaud, semua, idAnakSaya, currentUser, ta, semester]);

  const columns = [
    { key: 'nama', label: 'Nama Anak', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.idSiswa}</div></> },
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
        <div><h3>Arsip rapor PAUD</h3><p>Rapor yang sudah terbit, disimpan persis seperti saat dibagikan. Bisa dicetak ulang kapan saja, juga setelah anak naik ke SD.</p></div>
        <button className="btn btn-sm" disabled={!rows.length} onClick={() => setCetak(rows.map(r => r.arsip))}>🖨️ Cetak semua yang tampil ({rows.length})</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} placeholder="Semua" /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} placeholder="Semua" /></Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="tanggalTerbit" defaultSortDir="desc" pageSize={25}
          searchFn={(r, t) => `${r.nama} ${r.idSiswa} ${r.kelas}`.toLowerCase().includes(t)} emptyMessage="Belum ada rapor PAUD yang terbit." />
      </div>
      {cetak && <CetakRaporPaud dokumen={cetak} onSelesai={() => setCetak(null)} />}
    </div>
  );
}
