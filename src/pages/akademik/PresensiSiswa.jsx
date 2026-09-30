import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import DataTable from '../../components/common/DataTable';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  STATUS_PRESENSI, PRESENSI_HEADERS, siswaDiRombel, dalamRentang, badgeHadir, badgeStatusPresensi, labelRombel,
} from '../../db/akademikFields';
import { todayWIB, formatTanggal } from '../../db/helpers';
import {
  upsertPresensiToSheet, fetchPresensiFromSheet, updatePresensiInSheet, deletePresensiFromSheet, addLogEntry, isConfigured,
} from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'input', label: 'ISI PRESENSI' },
  { id: 'rekap', label: 'REKAP KEHADIRAN' },
  { id: 'tabel', label: 'DATA PRESENSI' },
];
const SINGKAT = { Hadir: 'H', Sakit: 'S', Izin: 'I', Alpha: 'A' };
const EDIT_FIELDS = [
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_PRESENSI, required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

// Kalau status tetap Hadir, jam & keterlambatan hasil scan dipertahankan; kalau diubah
// jadi Sakit/Izin/Alpha, data scan dikosongkan (tidak relevan lagi).
function pertahankanScan(lama, statusBaru) {
  if (lama && statusBaru === 'Hadir' && lama.status === 'Hadir') {
    return { 'Jam Masuk': lama.jamMasuk, 'Jam Pulang': lama.jamPulang, Metode: lama.metode, 'Menit Terlambat': lama.menitTerlambat, Denda: lama.denda };
  }
  return { 'Jam Masuk': '', 'Jam Pulang': '', Metode: 'Manual', 'Menit Terlambat': 0, Denda: 0 };
}

function namaHari(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' });
}

// ---------------------------------------------------------------------------
function IsiPresensi() {
  const { siswa, presensi, presensiLoaded, refreshPresensi, toast } = useAppData();
  const { currentUser } = useAuth();
  const { rombelList } = useAkademikOptions();
  const [tanggal, setTanggal] = useState(todayWIB());
  const [rombelKey, setRombelKey] = useState('');
  const [isian, setIsian] = useState({}); // { nisn: { status, ket } }
  const [menyimpan, setMenyimpan] = useState(false);
  const [berubah, setBerubah] = useState(false);

  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  const daftar = useMemo(() => rombel ? siswaDiRombel(siswa, rombel.tingkat, rombel.rombel) : [], [siswa, rombel]);
  const tanpaNisn = daftar.filter(s => !s.nisn);

  const tersimpan = useMemo(() => {
    const map = {};
    presensi.forEach(p => { if (p.tanggal === tanggal) map[p.nisn] = p; });
    return map;
  }, [presensi, tanggal]);
  const sudahDiisi = daftar.filter(s => tersimpan[s.nisn]).length;

  // Isi ulang form HANYA saat ganti tanggal/kelas atau data presensi tersimpan berubah
  // (stlh simpan). Polling data siswa tiap 30 dtk menghasilkan array baru walau isinya
  // sama -- makanya pakai daftarKey (string) supaya isian yg belum disimpan tdk hilang.
  const daftarKey = daftar.map(s => s.nisn || s.id).join(',');
  useEffect(() => {
    const awal = {};
    daftar.forEach(s => {
      const t = tersimpan[s.nisn];
      awal[s.nisn || s.id] = { status: t?.status || '', ket: t?.keterangan || '' };
    });
    setIsian(awal);
    setBerubah(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarKey, tersimpan]);

  function set(key, patch) {
    setIsian(v => ({ ...v, [key]: { ...v[key], ...patch } }));
    setBerubah(true);
  }
  function semuaHadir() {
    setIsian(v => {
      const baru = { ...v };
      Object.keys(baru).forEach(k => { if (!baru[k].status) baru[k] = { ...baru[k], status: 'Hadir' }; });
      return baru;
    });
    setBerubah(true);
  }

  const hitung = useMemo(() => {
    const c = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0, kosong: 0 };
    daftar.forEach(s => { const st = isian[s.nisn || s.id]?.status; if (st) c[st]++; else c.kosong++; });
    return c;
  }, [daftar, isian]);

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const rows = daftar.filter(s => s.nisn && isian[s.nisn]?.status).map(s => ({
      Tanggal: tanggal, NISN: s.nisn, 'Nama Siswa': s.nama, Tingkat: s.kelasTingkat, Rombel: s.rombel,
      Status: isian[s.nisn].status, Keterangan: isian[s.nisn].ket || '', 'Dicatat Oleh': currentUser.nama,
      // Pertahankan data hasil scan barcode (kalau ada) -- upsert menimpa SELURUH baris.
      ...pertahankanScan(tersimpan[s.nisn], isian[s.nisn].status),
    }));
    if (!rows.length) { toast('Belum ada status yang dipilih.', 'error'); return; }
    setMenyimpan(true);
    try {
      const { ditambah, diupdate } = await upsertPresensiToSheet(rows);
      await addLogEntry({
        username: currentUser.username, namaUser: currentUser.nama, aksi: 'Isi Presensi', modul: 'Presensi Siswa',
        detail: `${rombel.label}, ${tanggal}: ${ditambah} baru, ${diupdate} diperbarui (H${hitung.Hadir} S${hitung.Sakit} I${hitung.Izin} A${hitung.Alpha})`,
      });
      await refreshPresensi();
      toast(`Presensi tersimpan: ${ditambah} baru, ${diupdate} diperbarui.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMenyimpan(false);
    }
  }

  const minggu = new Date(tanggal + 'T00:00:00').getDay() === 0;

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Isi presensi harian</h3><p>Satu siswa satu status per tanggal. Menyimpan ulang di tanggal yang sama akan memperbarui, bukan menggandakan.</p></div>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tanggal"><input type="date" value={tanggal} max={todayWIB()} onChange={e => setTanggal(e.target.value)} /></Field>
          <Field label="Kelas / Rombel" grow>
            <Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: `${r.label}${r.wali ? ' — ' + r.wali : ''}` }))} />
          </Field>
          <button className="btn" onClick={semuaHadir} disabled={!daftar.length}>Tandai sisanya Hadir</button>
        </div>

        <div className="ringkas-bar" style={{ marginBottom: 12 }}>
          <b>{namaHari(tanggal)}, {formatTanggal(tanggal + 'T00:00:00')}</b>
          {minggu && <span className="badge badge-gold">Hari Minggu</span>}
          <span className="badge badge-muted">{sudahDiisi}/{daftar.length} sudah tersimpan</span>
        </div>

        {tanpaNisn.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--red)' }}>
            {tanpaNisn.length} siswa belum punya NISN sehingga presensinya tidak bisa disimpan: {tanpaNisn.map(s => s.nama).join(', ')}.
            Lengkapi di Data Siswa.
          </p>
        )}

        {!presensiLoaded && isConfigured('akademik') ? <Kosong>Memuat data presensi…</Kosong>
          : !daftar.length ? <Kosong>Tidak ada siswa aktif di rombel ini.</Kosong>
          : (
            <div className="table-scroll">
              <table>
                <thead><tr><th style={{ width: 40 }}>#</th><th>Nama Siswa</th><th>NISN</th><th>Status</th><th>Keterangan</th></tr></thead>
                <tbody>
                  {daftar.map((s, i) => {
                    const key = s.nisn || s.id;
                    const v = isian[key] || { status: '', ket: '' };
                    return (
                      <tr key={key}>
                        <td>{i + 1}</td>
                        <td><b>{s.nama}</b></td>
                        <td style={{ color: 'var(--muted)' }}>{s.nisn || '—'}</td>
                        <td>
                          <div className="status-toggle" role="radiogroup" aria-label={`Status ${s.nama}`}>
                            {STATUS_PRESENSI.map(st => (
                              <button key={st} type="button" role="radio" aria-checked={v.status === st} title={st}
                                className={v.status === st ? `on-${st}` : ''} disabled={!s.nisn}
                                onClick={() => set(key, { status: st })}>{SINGKAT[st]}</button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input className="input-cell" value={v.ket} disabled={!s.nisn}
                            placeholder={v.status && v.status !== 'Hadir' ? 'mis. demam, acara keluarga' : ''}
                            onChange={e => set(key, { ket: e.target.value })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        <div className="save-bar">
          <div className="ringkas-bar">
            {STATUS_PRESENSI.map(st => <span key={st} className={`badge ${badgeStatusPresensi(st)}`}>{st} {hitung[st]}</span>)}
            {hitung.kosong > 0 && <span className="badge badge-muted">Belum diisi {hitung.kosong}</span>}
          </div>
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !daftar.length || !berubah}>
            {menyimpan ? 'Menyimpan…' : 'Simpan presensi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function RekapKehadiran() {
  const { siswa, presensi, tahunAjaranAktif } = useAppData();
  const { rombelList } = useAkademikOptions();
  const [rombelKey, setRombelKey] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayWIB());

  useEffect(() => {
    if (!dari && tahunAjaranAktif?.mulai) setDari(String(tahunAjaranAktif.mulai).slice(0, 10));
  }, [tahunAjaranAktif, dari]);

  const rombel = rombelList.find(r => r.key === rombelKey);
  const daftar = useMemo(() => (
    rombel ? siswaDiRombel(siswa, rombel.tingkat, rombel.rombel)
      : siswa.filter(s => s.status === 'Aktif')
  ), [siswa, rombel]);

  const rows = useMemo(() => {
    const perNisn = {};
    presensi.forEach(p => {
      if (!dalamRentang(p.tanggal, dari, sampai) || !STATUS_PRESENSI.includes(p.status)) return;
      if (!perNisn[p.nisn]) perNisn[p.nisn] = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 };
      perNisn[p.nisn][p.status]++;
    });
    return daftar.map(s => {
      const c = perNisn[s.nisn] || { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 };
      const total = c.Hadir + c.Sakit + c.Izin + c.Alpha;
      return {
        id: s.id, nama: s.nama, nisn: s.nisn, kelas: labelRombel(s.kelasTingkat, s.rombel), ...c, total,
        persen: total ? Math.round((c.Hadir / total) * 100) : null,
      };
    });
  }, [presensi, daftar, dari, sampai]);

  const columns = [
    { key: 'nama', label: 'Nama Siswa', sortable: true, render: r => <b>{r.nama}</b> },
    ...(rombel ? [] : [{ key: 'kelas', label: 'Kelas', sortable: true }]),
    { key: 'Hadir', label: 'H', sortable: true }, { key: 'Sakit', label: 'S', sortable: true },
    { key: 'Izin', label: 'I', sortable: true }, { key: 'Alpha', label: 'A', sortable: true },
    { key: 'total', label: 'Hari tercatat', sortable: true },
    { key: 'persen', label: '% Hadir', sortable: true, accessor: r => r.persen ?? -1,
      render: r => r.persen === null ? '—' : <span className={`badge ${badgeHadir(r.persen)}`}>{r.persen}%</span> },
  ];

  function exportRekap() {
    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Hari Tercatat', '% Hadir'];
    exportToExcel(headers, rows.map(r => ({
      'Nama Siswa': r.nama, NISN: r.nisn, Kelas: r.kelas, Hadir: r.Hadir, Sakit: r.Sakit, Izin: r.Izin, Alpha: r.Alpha,
      'Hari Tercatat': r.total, '% Hadir': r.persen === null ? '' : r.persen,
    })), `Rekap_Kehadiran_${dari}_${sampai}`, `Rekap Kehadiran ${rombel?.label || 'Semua Kelas'} (${dari || 'awal'} s.d. ${sampai})`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rekap kehadiran</h3><p>Hitungan dari presensi yang tercatat pada rentang tanggal terpilih.</p></div>
        <button className="btn btn-sm" onClick={exportRekap} disabled={!rows.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Dari"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
          <Field label="Sampai"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
          <Field label="Kelas / Rombel" grow>
            <Select value={rombelKey} onChange={setRombelKey} placeholder="Semua kelas" options={rombelList.map(r => ({ value: r.key, label: r.label }))} />
          </Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama"
          searchFn={(r, t) => `${r.nama} ${r.nisn} ${r.kelas}`.toLowerCase().includes(t)}
          pageSize={20} pageSizeOptions={[20, 50, 100, 'Semua']} emptyMessage="Tidak ada siswa." />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function PresensiSiswa() {
  const { refreshPresensi } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('presensi', TABS.map(t => t.id));
  return (
    <Page pageId="presensi" title="Presensi Siswa" path="Akademik / Presensi Siswa">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'input' && bolehTab('input') && <IsiPresensi />}
          {tab === 'rekap' && bolehTab('rekap') && <RekapKehadiran />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data presensi"
              subtitle="Semua baris presensi mentah. Koreksi satu per satu di sini; untuk satu kelas sekaligus pakai tab Isi Presensi."
              headers={PRESENSI_HEADERS}
              fields={EDIT_FIELDS}
              fetchFn={fetchPresensiFromSheet}
              updateFn={updatePresensiInSheet}
              deleteFn={deletePresensiFromSheet}
              moduleLabel="Presensi Siswa"
              labelKey="Nama Siswa"
              target="akademik"
              columnRenderers={{ Status: r => <span className={`badge ${badgeStatusPresensi(r.Status)}`}>{r.Status}</span> }}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r.NISN} ${r.Tanggal} ${r.Rombel}`.toLowerCase().includes(t)}
              onChanged={refreshPresensi}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
