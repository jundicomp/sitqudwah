import { useCallback, useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import DataTable from '../../components/common/DataTable';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { PELATIHAN_HEADERS, buildPelatihanFields, pegawaiAktif } from '../../db/kepegawaianFields';
import { todayWIB, formatTanggalAngka } from '../../db/helpers';
import { fetchPelatihanFromSheet, addPelatihanToSheet, updatePelatihanInSheet, deletePelatihanFromSheet } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'rekap', label: 'REKAP PER GURU' },
  { id: 'tabel', label: 'DAFTAR KEGIATAN' },
  { id: 'manual', label: 'CATAT KEGIATAN' },
];

function cekTanggal(row) {
  const selesai = row['Tanggal Selesai'] || row['Tanggal Mulai'];
  if (selesai < row['Tanggal Mulai']) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  return { ...row, 'Tanggal Selesai': selesai, 'Jumlah JP': row['Jumlah JP'] === '' ? 0 : Number(row['Jumlah JP']) };
}

function RekapPerGuru() {
  const { pelatihan, guru } = useAppData();
  const tahunList = useMemo(() => [...new Set(pelatihan.map(p => p.mulai.slice(0, 4)).filter(Boolean))].sort().reverse(), [pelatihan]);
  const [tahun, setTahun] = useState('');
  useEffect(() => { if (!tahun && tahunList.length) setTahun(tahunList[0]); }, [tahunList, tahun]);
  const periode = useMemo(() => pelatihan.filter(p => !tahun || p.mulai.startsWith(tahun)), [pelatihan, tahun]);

  const rows = useMemo(() => pegawaiAktif(guru).map(g => {
    const milik = periode.filter(p => p.guru === g.nama).sort((a, b) => b.mulai.localeCompare(a.mulai));
    return { id: g.nama, nama: g.nama, kategori: g.kategori, jumlah: milik.length, jp: milik.reduce((a, p) => a + p.jp, 0), sertifikat: milik.filter(p => p.sertifikat).length, terakhir: milik[0] };
  }), [guru, periode]);

  const columns = [
    { key: 'nama', label: 'Nama', sortable: true, render: r => <b>{r.nama}</b> },
    { key: 'kategori', label: 'Kategori', sortable: true },
    { key: 'jumlah', label: 'Kegiatan', sortable: true, render: r => r.jumlah ? r.jumlah : <span className="badge badge-gold">0</span> },
    { key: 'jp', label: 'Total JP', sortable: true },
    { key: 'sertifikat', label: 'Bersertifikat', sortable: true },
    { key: 'terakhir', label: 'Kegiatan Terakhir', accessor: r => r.terakhir?.mulai || '', render: r => r.terakhir ? <>{r.terakhir.kegiatan}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatTanggalAngka(r.terakhir.mulai)} · {r.terakhir.jenis}</div></> : '—' },
  ];
  function exportData() {
    exportToExcel(['Nama', 'Kategori', 'Jumlah Kegiatan', 'Total JP', 'Bersertifikat', 'Kegiatan Terakhir'], rows.map(r => ({
      Nama: r.nama, Kategori: r.kategori, 'Jumlah Kegiatan': r.jumlah, 'Total JP': r.jp, Bersertifikat: r.sertifikat, 'Kegiatan Terakhir': r.terakhir?.kegiatan || '',
    })), `Rekap_Pengembangan_Diri_${tahun || 'semua'}`, `Rekap Pelatihan & Sertifikasi ${tahun || 'Semua Tahun'}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Pengembangan diri per guru &amp; staff</h3><p>Yang belum mengikuti kegiatan apa pun di tahun terpilih ditandai kuning.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar"><Field label="Tahun kegiatan"><Select value={tahun} onChange={setTahun} placeholder="Semua tahun" options={tahunList} /></Field></div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
          searchFn={(r, t) => `${r.nama} ${r.kategori}`.toLowerCase().includes(t)} emptyMessage="Belum ada data guru." />
      </div>
    </div>
  );
}

export default function PelatihanSertifikasi() {
  const { pelatihan, guru, refreshPelatihan } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('pelatihan', TABS.map(t => t.id));
  const namaPegawai = useMemo(() => pegawaiAktif(guru).map(g => g.nama), [guru]);
  const fields = useMemo(() => buildPelatihanFields({ guruOptions: namaPegawai }), [namaPegawai]);
  const emptyRow = useCallback(() => ({ 'Nama Guru': '', 'Jenis Kegiatan': '', 'Nama Kegiatan': '', Tingkat: '', Penyelenggara: '', 'Tanggal Mulai': todayWIB(), 'Tanggal Selesai': '', 'Jumlah JP': '', 'No Sertifikat': '', Keterangan: '' }), []);
  const addFn = useCallback(async (f) => { await addPelatihanToSheet(cekTanggal(f)); await refreshPelatihan(); }, [refreshPelatihan]);
  const updateFn = useCallback((r) => updatePelatihanInSheet(cekTanggal(r)), []);

  const tahunIni = todayWIB().slice(0, 4);
  const stat = useMemo(() => {
    const ini = pelatihan.filter(p => p.mulai.startsWith(tahunIni));
    return { kegiatan: ini.length, jp: ini.reduce((a, p) => a + p.jp, 0), sertifikasi: pelatihan.filter(p => p.jenis === 'Sertifikasi Profesi').length, belum: namaPegawai.filter(n => !ini.some(p => p.guru === n)).length };
  }, [pelatihan, namaPegawai, tahunIni]);

  return (
    <Page pageId="pelatihan" title="Pelatihan & Sertifikasi" path="Kepegawaian / Pelatihan & Sertifikasi">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.kegiatan} label={`Kegiatan tahun ${tahunIni}`} color="c-green" />
        <InfoCard value={stat.jp} label={`Total JP tahun ${tahunIni}`} color="c-blue" />
        <InfoCard value={stat.sertifikasi} label="Sertifikasi profesi (semua)" color="c-purple" />
        <InfoCard value={stat.belum} label={`Belum ikut kegiatan ${tahunIni}`} color="c-gold" />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'rekap' && bolehTab('rekap') && <RekapPerGuru />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable title="Daftar kegiatan pengembangan diri" subtitle="Pelatihan, workshop, seminar, diklat, sertifikasi, studi lanjut, bimtek."
              headers={PELATIHAN_HEADERS} fields={fields}
              fetchFn={fetchPelatihanFromSheet} updateFn={updateFn} deleteFn={deletePelatihanFromSheet}
              moduleLabel="Pelatihan & Sertifikasi" labelKey="Nama Kegiatan" target="akademik"
              searchFn={(r, t) => `${r['Nama Guru']} ${r['Nama Kegiatan']} ${r['Jenis Kegiatan']} ${r.Penyelenggara}`.toLowerCase().includes(t)} onChanged={refreshPelatihan} />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik"
              title="Catat kegiatan" subtitle="Kosongkan tanggal selesai untuk kegiatan satu hari." />
          )}
        </div>
      </div>
    </Page>
  );
}
