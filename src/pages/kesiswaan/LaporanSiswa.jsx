import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import {
  STATUS_PRESENSI, labelRombel, dalamRentang, semesterDariTanggal, predikatNilai, badgePredikat, badgeHadir,
  AMBANG_HADIR_CUKUP, AMBANG_POIN_TINGGI, siswaDiRombel,
} from '../../db/akademikFields';
import { formatTanggalAngka } from '../../db/helpers';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'siswa', label: 'REKAP PER SISWA' },
  { id: 'kelas', label: 'REKAP PER KELAS' },
];
const rata = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

// Kumpulkan semua data akademik & kesiswaan per NISN utk periode terpilih.
function useRekap({ ta, semester, rombelKey }) {
  const { siswa, presensi, nilai, prestasi, pelanggaran, tahunAjaran } = useAppData();
  const { rombelList } = useAkademikOptions();

  return useMemo(() => {
    const taObj = tahunAjaran.find(t => t.label === ta);
    const cocokSemester = (tgl) => semester === 'Semua' || semesterDariTanggal(tgl) === semester;
    const presensiP = presensi.filter(p => (taObj ? dalamRentang(p.tanggal, taObj.mulai, taObj.selesai) : true) && cocokSemester(p.tanggal));
    const nilaiP = nilai.filter(n => n.tahunAjaran === ta && (semester === 'Semua' || n.semester === semester) && n.nilai !== null);
    const prestasiP = prestasi.filter(p => p.tahunAjaran === ta && cocokSemester(p.tanggal));
    const pelanggaranP = pelanggaran.filter(p => p.tahunAjaran === ta && cocokSemester(p.tanggal));

    const group = (arr) => arr.reduce((m, x) => { (m[x.nisn] ||= []).push(x); return m; }, {});
    const gPres = group(presensiP); const gNil = group(nilaiP); const gPrs = group(prestasiP); const gPlg = group(pelanggaranP);

    const rombel = rombelList.find(r => r.key === rombelKey);
    const daftar = rombel ? siswaDiRombel(siswa, rombel.tingkat, rombel.rombel, false) : siswa;

    const perSiswa = daftar.map(s => {
      const pres = gPres[s.nisn] || [];
      const hitung = Object.fromEntries(STATUS_PRESENSI.map(st => [st, pres.filter(p => p.status === st).length]));
      const nil = gNil[s.nisn] || [];
      const perMapel = {};
      nil.forEach(n => { (perMapel[n.mapel] ||= []).push(n.nilai); });
      const rataMapel = Object.fromEntries(Object.entries(perMapel).map(([m, v]) => [m, rata(v)]));
      const nilaiRata = rata(Object.values(rataMapel));
      const plg = gPlg[s.nisn] || [];
      const poin = plg.reduce((a, p) => a + p.poin, 0);
      const persenHadir = pres.length ? Math.round((hitung.Hadir / pres.length) * 100) : null;
      const catatan = [];
      if (persenHadir !== null && persenHadir < AMBANG_HADIR_CUKUP) catatan.push('kehadiran rendah');
      if (nilaiRata !== null && nilaiRata < 70) catatan.push('nilai di bawah 70');
      if (poin >= AMBANG_POIN_TINGGI) catatan.push('poin pelanggaran tinggi');
      return {
        id: s.id, siswa: s, nama: s.nama, nisn: s.nisn, kelas: labelRombel(s.kelasTingkat, s.rombel),
        tingkat: s.kelasTingkat, rombel: s.rombel, status: s.status,
        hitung, hariTercatat: pres.length, persenHadir, rataMapel, nilaiRata,
        prestasi: gPrs[s.nisn] || [], pelanggaran: plg, poin, catatan,
      };
    });
    return { perSiswa, rombel };
  }, [siswa, presensi, nilai, prestasi, pelanggaran, tahunAjaran, rombelList, ta, semester, rombelKey]);
}

function DetailSiswa({ r, ta, semester, onClose }) {
  const mapel = Object.entries(r.rataMapel).sort((a, b) => a[0].localeCompare(b[0], 'id'));
  return (
    <Modal title={r.nama} subtitle={`${r.nisn || 'tanpa NISN'} · ${r.kelas || 'belum ada rombel'} · ${ta}${semester !== 'Semua' ? ' ' + semester : ''}`} onClose={onClose} wide>
      <div className="detail-section">
        <h4>Kehadiran</h4>
        {r.hariTercatat === 0 ? <Kosong>Belum ada presensi tercatat.</Kosong> : (
          <div className="ringkas-bar">
            {STATUS_PRESENSI.map(st => <span key={st} className="badge badge-muted">{st} {r.hitung[st]}</span>)}
            <span className={`badge ${badgeHadir(r.persenHadir)}`}>{r.persenHadir}% hadir dari {r.hariTercatat} hari</span>
          </div>
        )}

        <h4>Nilai per mata pelajaran</h4>
        {!mapel.length ? <Kosong>Belum ada nilai.</Kosong> : (
          <table>
            <thead><tr><th>Mata Pelajaran</th><th>Rata-rata</th><th>Predikat</th></tr></thead>
            <tbody>
              {mapel.map(([m, v]) => { const p = predikatNilai(v); return <tr key={m}><td>{m}</td><td><b>{v}</b></td><td><span className={`badge ${badgePredikat(p)}`}>{p}</span></td></tr>; })}
            </tbody>
          </table>
        )}

        <h4>Prestasi</h4>
        {!r.prestasi.length ? <Kosong>Belum ada prestasi tercatat.</Kosong> : (
          <ul className="warn-list">
            {r.prestasi.map(p => <li key={p.id}><b>{p.hasil}</b> {p.kegiatan} ({p.tingkatLomba}, {formatTanggalAngka(p.tanggal)})</li>)}
          </ul>
        )}

        <h4>Pelanggaran &amp; konseling</h4>
        {!r.pelanggaran.length ? <Kosong>Tidak ada catatan pelanggaran.</Kosong> : (
          <ul className="warn-list">
            {r.pelanggaran.map(p => <li key={p.id}>{formatTanggalAngka(p.tanggal)}: {p.jenis} <span className="badge badge-muted">{p.kategori} · {p.poin} poin · {p.statusTL}</span></li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function FilterBar({ ta, setTa, semester, setSemester, rombelKey, setRombelKey, tahunAjaranOptions, rombelList, tampilRombel = true }) {
  return (
    <div className="filter-bar">
      <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
      <Field label="Semester"><Select value={semester} onChange={setSemester} options={['Semua', 'Ganjil', 'Genap']} /></Field>
      {tampilRombel && (
        <Field label="Kelas / Rombel" grow>
          <Select value={rombelKey} onChange={setRombelKey} placeholder="Semua kelas" options={rombelList.map(r => ({ value: r.key, label: r.label }))} />
        </Field>
      )}
    </div>
  );
}

function RekapPerSiswa(props) {
  const { perSiswa, rombel } = useRekap(props);
  const [detail, setDetail] = useState(null);
  const [hanyaPerhatian, setHanyaPerhatian] = useState(false);
  const aktif = perSiswa.filter(r => r.status === 'Aktif' || r.hariTercatat || r.nilaiRata !== null);
  const data = hanyaPerhatian ? aktif.filter(r => r.catatan.length) : aktif;

  const columns = [
    { key: 'nama', label: 'Nama Siswa', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.nisn}</div></> },
    ...(rombel ? [] : [{ key: 'kelas', label: 'Kelas', sortable: true }]),
    { key: 'persenHadir', label: '% Hadir', sortable: true, accessor: r => r.persenHadir ?? -1,
      render: r => r.persenHadir === null ? '—' : <span className={`badge ${badgeHadir(r.persenHadir)}`} title={`H${r.hitung.Hadir} S${r.hitung.Sakit} I${r.hitung.Izin} A${r.hitung.Alpha}`}>{r.persenHadir}%</span> },
    { key: 'nilaiRata', label: 'Rata-rata Nilai', sortable: true, accessor: r => r.nilaiRata ?? -1,
      render: r => r.nilaiRata === null ? '—' : <><b>{r.nilaiRata}</b> <span className={`badge ${badgePredikat(predikatNilai(r.nilaiRata))}`}>{predikatNilai(r.nilaiRata)}</span></> },
    { key: 'jmlPrestasi', label: 'Prestasi', sortable: true, accessor: r => r.prestasi.length },
    { key: 'poin', label: 'Poin Pelanggaran', sortable: true,
      render: r => <span className={`badge ${r.poin >= AMBANG_POIN_TINGGI ? 'badge-red' : r.poin > 0 ? 'badge-gold' : 'badge-green'}`}>{r.poin}</span> },
    { key: 'catatan', label: 'Perlu perhatian', render: r => r.catatan.length ? <span style={{ color: 'var(--red)', fontSize: 12.5 }}>{r.catatan.join(', ')}</span> : '—' },
    { key: 'aksi', label: '', headerClassName: 'no-print', render: r => <button className="btn btn-sm no-print" onClick={() => setDetail(r)}>Detail</button> },
  ];

  function exportData() {
    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Status', 'Hadir', 'Sakit', 'Izin', 'Alpha', '% Hadir', 'Rata-rata Nilai', 'Predikat', 'Jumlah Prestasi', 'Poin Pelanggaran', 'Perlu Perhatian'];
    exportToExcel(headers, data.map(r => ({
      'Nama Siswa': r.nama, NISN: r.nisn, Kelas: r.kelas, Status: r.status,
      Hadir: r.hitung.Hadir, Sakit: r.hitung.Sakit, Izin: r.hitung.Izin, Alpha: r.hitung.Alpha, '% Hadir': r.persenHadir ?? '',
      'Rata-rata Nilai': r.nilaiRata ?? '', Predikat: predikatNilai(r.nilaiRata), 'Jumlah Prestasi': r.prestasi.length,
      'Poin Pelanggaran': r.poin, 'Perlu Perhatian': r.catatan.join(', '),
    })), `Laporan_Siswa_${props.ta}_${props.semester}`.replace(/[^\w-]+/g, '_'), `Laporan Siswa ${rombel?.label || 'Semua Kelas'} — ${props.ta} ${props.semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rekap per siswa</h3><p>Gabungan kehadiran, nilai, prestasi, dan pelanggaran. Klik Detail untuk rinciannya.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!data.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <FilterBar {...props} />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={hanyaPerhatian} onChange={e => setHanyaPerhatian(e.target.checked)} />
          Tampilkan hanya siswa yang perlu perhatian ({aktif.filter(r => r.catatan.length).length})
        </label>
        <DataTable columns={columns} data={data} rowKey={r => r.id} defaultSortKey="nama"
          searchFn={(r, t) => `${r.nama} ${r.nisn} ${r.kelas}`.toLowerCase().includes(t)}
          pageSize={20} pageSizeOptions={[20, 50, 100, 'Semua']} emptyMessage="Tidak ada siswa." />
      </div>
      {detail && <DetailSiswa r={detail} ta={props.ta} semester={props.semester} onClose={() => setDetail(null)} />}
    </div>
  );
}

function RekapPerKelas(props) {
  const { perSiswa } = useRekap({ ...props, rombelKey: '' });
  const rows = useMemo(() => props.rombelList.map(rb => {
    const anggota = perSiswa.filter(r => r.tingkat === rb.tingkat && r.rombel === rb.rombel && r.status === 'Aktif');
    const hadir = anggota.filter(r => r.persenHadir !== null).map(r => r.persenHadir);
    const nil = anggota.filter(r => r.nilaiRata !== null).map(r => r.nilaiRata);
    return {
      id: rb.key, kelas: rb.label, wali: rb.wali || '—', jumlah: anggota.length,
      rataHadir: hadir.length ? Math.round(rata(hadir)) : null, rataNilai: rata(nil),
      prestasi: anggota.reduce((a, r) => a + r.prestasi.length, 0),
      poin: anggota.reduce((a, r) => a + r.poin, 0),
      perhatian: anggota.filter(r => r.catatan.length).length,
    };
  }), [perSiswa, props.rombelList]);

  const columns = [
    { key: 'kelas', label: 'Kelas', sortable: true, render: r => <b>{r.kelas}</b> },
    { key: 'wali', label: 'Wali Kelas', sortable: true },
    { key: 'jumlah', label: 'Siswa Aktif', sortable: true },
    { key: 'rataHadir', label: 'Rata-rata Kehadiran', sortable: true, accessor: r => r.rataHadir ?? -1,
      render: r => r.rataHadir === null ? '—' : <span className={`badge ${badgeHadir(r.rataHadir)}`}>{r.rataHadir}%</span> },
    { key: 'rataNilai', label: 'Rata-rata Nilai', sortable: true, accessor: r => r.rataNilai ?? -1, render: r => r.rataNilai ?? '—' },
    { key: 'prestasi', label: 'Prestasi', sortable: true },
    { key: 'poin', label: 'Total Poin', sortable: true },
    { key: 'perhatian', label: 'Siswa Perlu Perhatian', sortable: true, render: r => r.perhatian ? <span className="badge badge-red">{r.perhatian}</span> : '0' },
  ];

  function exportData() {
    const headers = ['Kelas', 'Wali Kelas', 'Siswa Aktif', 'Rata-rata Kehadiran (%)', 'Rata-rata Nilai', 'Prestasi', 'Total Poin', 'Siswa Perlu Perhatian'];
    exportToExcel(headers, rows.map(r => ({
      Kelas: r.kelas, 'Wali Kelas': r.wali, 'Siswa Aktif': r.jumlah, 'Rata-rata Kehadiran (%)': r.rataHadir ?? '',
      'Rata-rata Nilai': r.rataNilai ?? '', Prestasi: r.prestasi, 'Total Poin': r.poin, 'Siswa Perlu Perhatian': r.perhatian,
    })), `Laporan_Kelas_${props.ta}_${props.semester}`.replace(/[^\w-]+/g, '_'), `Laporan per Kelas — ${props.ta} ${props.semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rekap per kelas</h3><p>Perbandingan antar rombel untuk periode terpilih (hanya siswa aktif).</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <FilterBar {...props} tampilRombel={false} />
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="kelas"
          searchFn={(r, t) => `${r.kelas} ${r.wali}`.toLowerCase().includes(t)} pageSize={50} emptyMessage="Belum ada data kelas." />
      </div>
    </div>
  );
}

export default function LaporanSiswa() {
  const { tab, setTab, bolehTab } = useTabAccess('laporan-siswa', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState('Semua');
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);

  const filter = { ta, setTa, semester, setSemester, rombelKey, setRombelKey, tahunAjaranOptions, rombelList };

  return (
    <Page pageId="laporan-siswa" title="Laporan Siswa" path="Kesiswaan / Laporan Siswa">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'siswa' && bolehTab('siswa') && <RekapPerSiswa {...filter} />}
          {tab === 'kelas' && bolehTab('kelas') && <RekapPerKelas {...filter} />}
        </div>
      </div>
    </Page>
  );
}
