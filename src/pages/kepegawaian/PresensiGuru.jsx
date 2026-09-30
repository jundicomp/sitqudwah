import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import DataTable from '../../components/common/DataTable';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { dalamRentang, badgeHadir } from '../../db/akademikFields';
import { STATUS_PRESENSI_GURU, SINGKAT_PRESENSI_GURU, PRESENSI_GURU_HEADERS, pegawaiAktif, badgePresensiGuru } from '../../db/kepegawaianFields';
import { todayWIB, formatTanggal } from '../../db/helpers';
import { upsertPresensiGuruToSheet, fetchPresensiGuruFromSheet, updatePresensiGuruInSheet, deletePresensiGuruFromSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'input', label: 'ISI PRESENSI' },
  { id: 'rekap', label: 'REKAP KEHADIRAN' },
  { id: 'tabel', label: 'DATA PRESENSI' },
];
const EDIT_FIELDS = [
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_PRESENSI_GURU, required: true },
  { key: 'Jam Masuk', label: 'Jam Masuk', type: 'time' },
  { key: 'Jam Pulang', label: 'Jam Pulang', type: 'time' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];
// Dinas luar dihitung sbg hadir (sedang bertugas).
const hitungHadir = (c) => c.Hadir + c['Dinas Luar'];

function IsiPresensi() {
  const { guru, presensiGuru, presensiGuruLoaded, refreshPresensiGuru, toast } = useAppData();
  const { currentUser } = useAuth();
  const [tanggal, setTanggal] = useState(todayWIB());
  const [kategori, setKategori] = useState('');
  const [isian, setIsian] = useState({});
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const semua = useMemo(() => pegawaiAktif(guru), [guru]);
  const kategoriList = useMemo(() => [...new Set(semua.map(g => g.kategori).filter(Boolean))], [semua]);
  const daftar = useMemo(() => semua.filter(g => !kategori || g.kategori === kategori), [semua, kategori]);
  const daftarKey = daftar.map(g => g.nama).join('|');
  const tersimpan = useMemo(() => Object.fromEntries(presensiGuru.filter(p => p.tanggal === tanggal).map(p => [p.nama, p])), [presensiGuru, tanggal]);

  useEffect(() => {
    setIsian(Object.fromEntries(daftar.map(g => {
      const t = tersimpan[g.nama];
      return [g.nama, { status: t?.status || '', masuk: t?.jamMasuk || '', pulang: t?.jamPulang || '', ket: t?.keterangan || '' }];
    })));
    setBerubah(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarKey, tersimpan]);

  const set = (nama, patch) => { setIsian(v => ({ ...v, [nama]: { ...v[nama], ...patch } })); setBerubah(true); };
  function semuaHadir() {
    setIsian(v => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.status ? x : { ...x, status: 'Hadir' }])));
    setBerubah(true);
  }
  const hitung = useMemo(() => {
    const c = Object.fromEntries([...STATUS_PRESENSI_GURU, 'kosong'].map(k => [k, 0]));
    daftar.forEach(g => { c[isian[g.nama]?.status || 'kosong']++; });
    return c;
  }, [daftar, isian]);

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const rows = daftar.filter(g => isian[g.nama]?.status).map(g => {
      const v = isian[g.nama];
      const lama = tersimpan[g.nama];
      const tetapScan = lama && lama.metode === 'Barcode' && v.status === 'Hadir' && lama.status === 'Hadir';
      return {
        Tanggal: tanggal, Nama: g.nama, NIP: g.nip || '', Kategori: g.kategori || '', Status: v.status, 'Jam Masuk': v.masuk, 'Jam Pulang': v.pulang, Keterangan: v.ket, 'Dicatat Oleh': currentUser.nama,
        Metode: tetapScan ? 'Barcode' : 'Manual', 'Menit Terlambat': tetapScan ? lama.menitTerlambat : 0, Denda: tetapScan ? lama.denda : 0,
      };
    });
    if (!rows.length) { toast('Belum ada status yang dipilih.', 'error'); return; }
    setMenyimpan(true);
    try {
      const { ditambah, diupdate } = await upsertPresensiGuruToSheet(rows);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Isi Presensi Guru', modul: 'Presensi Guru & Staff', detail: `${tanggal}: ${ditambah} baru, ${diupdate} diperbarui` });
      await refreshPresensiGuru();
      toast(`Presensi tersimpan: ${ditambah} baru, ${diupdate} diperbarui.`);
    } catch (err) { toast(err.message, 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Presensi harian guru &amp; staff</h3><p>Satu orang satu status per tanggal. Menyimpan ulang memperbarui data di tanggal yang sama.</p></div></div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tanggal"><input type="date" value={tanggal} max={todayWIB()} onChange={e => setTanggal(e.target.value)} /></Field>
          <Field label="Kategori"><Select value={kategori} onChange={setKategori} placeholder="Semua" options={kategoriList} /></Field>
          <button className="btn" onClick={semuaHadir} disabled={!daftar.length}>Tandai sisanya Hadir</button>
        </div>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13.5 }}>{formatTanggal(tanggal + 'T00:00:00')}</p>
        {!presensiGuruLoaded && isConfigured('akademik') ? <Kosong>Memuat data presensi…</Kosong> : !daftar.length ? <Kosong>Belum ada data guru &amp; staff aktif.</Kosong> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nama</th><th>Kategori</th><th>Status</th><th>Masuk</th><th>Pulang</th><th>Keterangan</th></tr></thead>
              <tbody>
                {daftar.map(g => {
                  const v = isian[g.nama] || { status: '', masuk: '', pulang: '', ket: '' };
                  return (
                    <tr key={g.nama}>
                      <td><b>{g.nama}</b>{g.nip && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.nip}</div>}</td>
                      <td>{g.kategori || '—'}</td>
                      <td>
                        <div className="status-toggle" role="radiogroup" aria-label={`Status ${g.nama}`}>
                          {STATUS_PRESENSI_GURU.map(st => (
                            <button key={st} type="button" role="radio" aria-checked={v.status === st} title={st}
                              className={v.status === st ? `on-${st === 'Dinas Luar' ? 'DL' : st}` : ''}
                              onClick={() => set(g.nama, { status: st })}>{SINGKAT_PRESENSI_GURU[st]}</button>
                          ))}
                        </div>
                      </td>
                      <td><input className="input-cell" type="time" value={v.masuk} onChange={e => set(g.nama, { masuk: e.target.value })} style={{ width: 110 }} /></td>
                      <td><input className="input-cell" type="time" value={v.pulang} onChange={e => set(g.nama, { pulang: e.target.value })} style={{ width: 110 }} /></td>
                      <td><input className="input-cell" value={v.ket} onChange={e => set(g.nama, { ket: e.target.value })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="save-bar">
          <div className="ringkas-bar">
            {STATUS_PRESENSI_GURU.map(st => <span key={st} className={`badge ${badgePresensiGuru(st)}`}>{st} {hitung[st]}</span>)}
            {hitung.kosong > 0 && <span className="badge badge-muted">Belum diisi {hitung.kosong}</span>}
          </div>
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah || !daftar.length}>{menyimpan ? 'Menyimpan…' : 'Simpan presensi'}</button>
        </div>
      </div>
    </div>
  );
}

function Rekap() {
  const { guru, presensiGuru, tahunAjaranAktif } = useAppData();
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayWIB());
  useEffect(() => { if (!dari && tahunAjaranAktif?.mulai) setDari(String(tahunAjaranAktif.mulai).slice(0, 10)); }, [tahunAjaranAktif, dari]);

  const rows = useMemo(() => {
    const per = {};
    presensiGuru.forEach(p => {
      if (!dalamRentang(p.tanggal, dari, sampai) || !STATUS_PRESENSI_GURU.includes(p.status)) return;
      per[p.nama] ||= Object.fromEntries(STATUS_PRESENSI_GURU.map(s => [s, 0]));
      per[p.nama][p.status]++;
    });
    return pegawaiAktif(guru).map(g => {
      const c = per[g.nama] || Object.fromEntries(STATUS_PRESENSI_GURU.map(s => [s, 0]));
      const total = STATUS_PRESENSI_GURU.reduce((a, s) => a + c[s], 0);
      return { id: g.nama, nama: g.nama, kategori: g.kategori, ...c, total, persen: total ? Math.round((hitungHadir(c) / total) * 100) : null };
    });
  }, [guru, presensiGuru, dari, sampai]);

  const columns = [
    { key: 'nama', label: 'Nama', sortable: true, render: r => <b>{r.nama}</b> },
    { key: 'kategori', label: 'Kategori', sortable: true },
    ...STATUS_PRESENSI_GURU.map(s => ({ key: s, label: SINGKAT_PRESENSI_GURU[s], sortable: true })),
    { key: 'total', label: 'Hari tercatat', sortable: true },
    { key: 'persen', label: '% Hadir', sortable: true, accessor: r => r.persen ?? -1, render: r => r.persen === null ? '—' : <span className={`badge ${badgeHadir(r.persen)}`}>{r.persen}%</span> },
  ];
  function exportData() {
    exportToExcel(['Nama', 'Kategori', ...STATUS_PRESENSI_GURU, 'Hari Tercatat', '% Hadir'], rows.map(r => ({
      Nama: r.nama, Kategori: r.kategori, ...Object.fromEntries(STATUS_PRESENSI_GURU.map(s => [s, r[s]])), 'Hari Tercatat': r.total, '% Hadir': r.persen ?? '',
    })), `Rekap_Presensi_Guru_${dari}_${sampai}`, `Rekap Kehadiran Guru & Staff (${dari || 'awal'} s.d. ${sampai})`);
  }
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rekap kehadiran guru &amp; staff</h3><p>Dinas luar dihitung sebagai hadir.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Dari"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
          <Field label="Sampai"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
          searchFn={(r, t) => `${r.nama} ${r.kategori}`.toLowerCase().includes(t)} emptyMessage="Belum ada data guru." />
      </div>
    </div>
  );
}

export default function PresensiGuru() {
  const { refreshPresensiGuru } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('presensi-guru', TABS.map(t => t.id));
  return (
    <Page pageId="presensi-guru" title="Presensi Guru & Staff" path="Kepegawaian / Presensi Guru & Staff">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'input' && bolehTab('input') && <IsiPresensi />}
          {tab === 'rekap' && bolehTab('rekap') && <Rekap />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable title="Data presensi guru & staff" subtitle="Koreksi satu per satu di sini."
              headers={PRESENSI_GURU_HEADERS} fields={EDIT_FIELDS}
              fetchFn={fetchPresensiGuruFromSheet} updateFn={updatePresensiGuruInSheet} deleteFn={deletePresensiGuruFromSheet}
              moduleLabel="Presensi Guru & Staff" labelKey="Nama" target="akademik"
              columnRenderers={{ Status: r => <span className={`badge ${badgePresensiGuru(r.Status)}`}>{r.Status}</span> }}
              searchFn={(r, t) => `${r.Nama} ${r.Tanggal} ${r.Status}`.toLowerCase().includes(t)} onChanged={refreshPresensiGuru} />
          )}
        </div>
      </div>
    </Page>
  );
}
