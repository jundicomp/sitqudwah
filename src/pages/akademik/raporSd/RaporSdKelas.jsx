import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { BannerIdSiswa } from '../../../components/paud/shared';
import { useAppData } from '../../../context/AppContext';
import { siswaDiRombel, mapelUntukTingkat, predikatNilai, badgePredikat } from '../../../db/akademikFields';
import { BADGE_STATUS_SD, nilaiMapelSd, cekKelengkapanSd } from '../../../db/raporSdFields';
import CetakRaporPaud from '../raporPaud/CetakRaporPaud';
import RaporSdEditor from './RaporSdEditor';

// Daftar rapor SD satu rombel (format "Sekolah", dipakai utk semua jenjang non-PAUD).
export default function RaporSdKelas({ ta, semester, rombel }) {
  const { siswa, raporSekolah, rapor, nilai, pengaturanSd: p, mapelList } = useAppData();
  const [buka, setBuka] = useState(null);
  const [cetakSemua, setCetakSemua] = useState(false);

  const anak = useMemo(() => siswaDiRombel(siswa, rombel.tingkat, rombel.rombel), [siswa, rombel]);
  const daftarMapel = useMemo(() => mapelUntukTingkat(rombel.tingkat), [rombel.tingkat, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => anak.map(s => {
    const r = raporSekolah.find(x => x.idSiswa && x.idSiswa === s.idSiswa && x.tahunAjaran === ta && x.semester === semester) || null;
    const lama = !r && s.nisn ? rapor.find(x => x.nisn === s.nisn && x.tahunAjaran === ta && x.semester === semester) || null : null;
    const perMapel = nilaiMapelSd(nilai, s, ta, semester, p.bobot);
    const vals = Object.values(perMapel).map(x => x.nilai).filter(v => v !== null);
    const rata = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    const semua = [...daftarMapel, ...Object.keys(perMapel).filter(m => !daftarMapel.includes(m))];
    return {
      id: s.id, siswa: s, nama: s.nama, rapor: r, lama, status: r?.status || 'Belum Diisi',
      jmlMapel: Object.keys(perMapel).length, rata, kurang: r ? cekKelengkapanSd(r.isian, semua, perMapel).length : null,
    };
  }), [anak, raporSekolah, rapor, nilai, ta, semester, p.bobot, daftarMapel]);

  const terbit = rows.filter(r => r.status === 'Terbit' && r.rapor?.arsip);
  const jml = (st) => rows.filter(r => r.status === st).length;
  const dibuka = rows.find(r => r.id === buka);

  const columns = [
    { key: 'nama', label: 'Nama Siswa', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.siswa.idSiswa || 'belum ada ID'}{r.siswa.nisn ? ` · NISN ${r.siswa.nisn}` : ''}</div></> },
    { key: 'jmlMapel', label: 'Mapel Bernilai', sortable: true, render: r => r.jmlMapel ? `${r.jmlMapel} dari ${daftarMapel.length || r.jmlMapel}` : <span style={{ color: 'var(--muted)' }}>belum ada nilai</span> },
    { key: 'rata', label: 'Rata-rata', sortable: true, accessor: r => r.rata ?? -1, render: r => r.rata === null ? '—' : <><b>{r.rata}</b> <span className={`badge ${badgePredikat(predikatNilai(r.rata))}`}>{predikatNilai(r.rata)}</span></> },
    { key: 'kurang', label: 'Kelengkapan', sortable: true, accessor: r => r.kurang ?? 99, render: r => r.kurang === null ? (r.lama ? <span className="badge badge-muted" title="Isian dari rapor versi lama akan dibawa">ada draft lama</span> : '—') : r.kurang === 0 ? <span className="badge badge-green">lengkap</span> : <span className="badge badge-gold">{r.kurang} bagian kurang</span> },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_SD[r.status]}`}>{r.status}</span> },
    { key: 'aksi', label: '', render: r => <button className="btn btn-sm" onClick={() => setBuka(r.id)} disabled={!r.siswa.idSiswa} title={r.siswa.idSiswa ? '' : 'Buat ID Siswa dulu'}>{r.status === 'Terbit' ? 'Lihat rapor' : 'Isi rapor'}</button> },
  ];

  return (
    <>
      <BannerIdSiswa daftar={anak} />
      <div className="ringkas-bar" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-blue">Format Sekolah (SD)</span>
          <span className="badge badge-green">Terbit {jml('Terbit')}</span>
          <span className="badge badge-blue">Diajukan {jml('Diajukan')}</span>
          <span className="badge badge-gold">Draft {jml('Draft')}</span>
          <span className="badge badge-muted">Belum diisi {jml('Belum Diisi')}</span>
        </div>
        <button className="btn btn-sm" disabled={!terbit.length} onClick={() => setCetakSemua(true)}>🖨️ Cetak semua yang terbit ({terbit.length})</button>
      </div>
      <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
        searchFn={(r, t) => `${r.nama} ${r.siswa.nisn} ${r.siswa.idSiswa}`.toLowerCase().includes(t)} emptyMessage="Tidak ada siswa aktif di rombel ini." />
      {dibuka && <RaporSdEditor key={dibuka.id + ta + semester} siswa={dibuka.siswa} rombel={rombel} ta={ta} semester={semester} record={dibuka.rapor} raporLama={dibuka.lama} onClose={() => setBuka(null)} />}
      {cetakSemua && <CetakRaporPaud dokumen={terbit.map(r => r.rapor.arsip)} onSelesai={() => setCetakSemua(false)} />}
    </>
  );
}
