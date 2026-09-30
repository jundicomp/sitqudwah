import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import DataTable from '../../components/common/DataTable';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { siswaDiRombel, dalamRentang, labelRombel } from '../../db/akademikFields';
import { pegawaiAktif } from '../../db/kepegawaianFields';
import { keMenit, sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'siswa', label: 'LAPORAN SISWA' },
  { id: 'guru', label: 'LAPORAN GURU & STAFF' },
];
const rataJam = (arr) => {
  const m = arr.filter(Boolean).map(keMenit);
  if (!m.length) return '';
  const r = Math.round(m.reduce((a, b) => a + b, 0) / m.length);
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
};

function rekap(records) {
  const hadir = records.filter(r => r.status === 'Hadir' || r.status === 'Dinas Luar');
  const telat = hadir.filter(r => r.menitTerlambat > 0);
  return {
    hadir: hadir.length, tidakHadir: records.length - hadir.length, telat: telat.length,
    menit: telat.reduce((a, r) => a + r.menitTerlambat, 0), denda: records.reduce((a, r) => a + (r.denda || 0), 0),
    scan: records.filter(r => r.metode === 'Barcode').length, tanpaPulang: hadir.filter(r => r.jamMasuk && !r.jamPulang).length,
    rataMasuk: rataJam(hadir.map(r => r.jamMasuk)),
  };
}

export default function LaporanPresensi() {
  const { siswa, guru, presensi, presensiGuru, tahunAjaranAktif } = useAppData();
  const { rombelList } = useAkademikOptions();
  const { tab, setTab, bolehTab } = useTabAccess('laporan-presensi', TABS.map(t => t.id));
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(sekarangWIB().tanggal);
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!dari && tahunAjaranAktif?.mulai) setDari(String(tahunAjaranAktif.mulai).slice(0, 10)); }, [tahunAjaranAktif, dari]);

  const rows = useMemo(() => {
    if (tab === 'siswa') {
      const rb = rombelList.find(r => r.key === rombelKey);
      const daftar = rb ? siswaDiRombel(siswa, rb.tingkat, rb.rombel) : siswa.filter(s => s.status === 'Aktif');
      const per = {};
      presensi.forEach(p => { if (dalamRentang(p.tanggal, dari, sampai)) (per[p.nisn] ||= []).push(p); });
      return daftar.map(s => ({ id: s.id, nama: s.nama, sub: s.nisn, grup: labelRombel(s.kelasTingkat, s.rombel), ...rekap(per[s.nisn] || []) }));
    }
    const per = {};
    presensiGuru.forEach(p => { if (dalamRentang(p.tanggal, dari, sampai)) (per[p.nama] ||= []).push(p); });
    return pegawaiAktif(guru).map(g => ({ id: g.nama, nama: g.nama, sub: g.nip, grup: g.kategori, ...rekap(per[g.nama] || []) }));
  }, [tab, siswa, guru, presensi, presensiGuru, rombelList, rombelKey, dari, sampai]);

  const total = { telat: rows.reduce((a, r) => a + r.telat, 0), denda: rows.reduce((a, r) => a + r.denda, 0) };
  const columns = [
    { key: 'nama', label: 'Nama', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.sub}</div></> },
    { key: 'grup', label: tab === 'siswa' ? 'Kelas' : 'Kategori', sortable: true },
    { key: 'hadir', label: 'Hari Hadir', sortable: true },
    { key: 'rataMasuk', label: 'Rata-rata Masuk', sortable: true, render: r => r.rataMasuk || '—' },
    { key: 'telat', label: 'Terlambat (kali)', sortable: true, render: r => r.telat ? <span className="badge badge-gold">{r.telat}</span> : '0' },
    { key: 'menit', label: 'Total Menit Telat', sortable: true },
    { key: 'denda', label: 'Total Denda', sortable: true, render: r => r.denda ? formatRupiah(r.denda) : '—' },
    { key: 'tanpaPulang', label: 'Tanpa Scan Pulang', sortable: true, render: r => r.tanpaPulang || '—' },
    { key: 'scan', label: 'Via Scan', sortable: true },
  ];

  function exportData() {
    const h = ['Nama', tab === 'siswa' ? 'NISN' : 'NIP', tab === 'siswa' ? 'Kelas' : 'Kategori', 'Hari Hadir', 'Tidak Hadir', 'Rata-rata Masuk', 'Terlambat (kali)', 'Total Menit Telat', 'Total Denda', 'Tanpa Scan Pulang', 'Via Scan'];
    exportToExcel(h, rows.map(r => ({ Nama: r.nama, [h[1]]: r.sub, [h[2]]: r.grup, 'Hari Hadir': r.hadir, 'Tidak Hadir': r.tidakHadir, 'Rata-rata Masuk': r.rataMasuk, 'Terlambat (kali)': r.telat, 'Total Menit Telat': r.menit, 'Total Denda': r.denda, 'Tanpa Scan Pulang': r.tanpaPulang, 'Via Scan': r.scan })),
      `Laporan_Presensi_${tab}_${dari}_${sampai}`, `Laporan Presensi ${tab === 'siswa' ? 'Siswa' : 'Guru & Staff'} (${dari || 'awal'} s.d. ${sampai})`);
  }

  return (
    <Page pageId="laporan-presensi" title="Laporan Presensi" path="Presensi Barcode / Laporan Presensi">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body">
          <div className="filter-bar">
            <Field label="Dari"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
            <Field label="Sampai"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
            {tab === 'siswa' && <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} placeholder="Semua kelas" options={rombelList.map(r => ({ value: r.key, label: r.label }))} /></Field>}
            <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
          </div>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className="badge badge-gold">{total.telat} kali terlambat</span>
            <span className="badge badge-red">Total denda {formatRupiah(total.denda)}</span>
          </div>
          <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={20} pageSizeOptions={[20, 50, 100, 'Semua']}
            searchFn={(r, t) => `${r.nama} ${r.sub} ${r.grup}`.toLowerCase().includes(t)} emptyMessage="Tidak ada data." />
        </div>
      </div>
    </Page>
  );
}
