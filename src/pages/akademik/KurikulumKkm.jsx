import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { MAPEL_OPTIONS } from '../../db/akademikFields';
import { KKM_HEADERS, TINGKAT_LIST, kkmStandar } from '../../db/akademikLanjutanFields';
import { JENJANG, namaTingkat } from '../../config/jenjang';
import { fetchKkmFromSheet, updateKkmInSheet, deleteKkmFromSheet, upsertKkmToSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'matriks', label: 'ATUR KKM' },
  { id: 'tabel', label: 'DATA KKM' },
];
const EDIT_FIELDS = [
  { key: 'KKM', label: 'KKM / KKTP', type: 'number', required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];
const valid = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
const k = (t, m) => `${t}|${m}`;

function MatriksKkm() {
  const { kkm, refreshKkm, toast } = useAppData();
  const { currentUser } = useAuth();
  const { tahunAjaranOptions, taAktif } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [salinDari, setSalinDari] = useState('');
  const [jenjang, setJenjang] = useState(JENJANG[0]?.kode || '');
  // Tabel cuma menampilkan 1 jenjang (biar tidak 14 kolom); isian & simpan tetap mencakup semua.
  const tingkatTampil = JENJANG.find(j => j.kode === jenjang)?.tingkat || TINGKAT_LIST;
  const [isian, setIsian] = useState({});
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);

  const tersimpanTa = (label) => {
    const map = {};
    kkm.filter(x => x.tahunAjaran === label && x.kkm !== null).forEach(x => { map[k(x.tingkat, x.mapel)] = x.kkm; });
    return map;
  };
  const tersimpan = useMemo(() => tersimpanTa(ta), [kkm, ta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setIsian(tersimpan); setBerubah(false); }, [tersimpan]);

  const mapelTampil = useMemo(() => [...MAPEL_OPTIONS, ...new Set(kkm.filter(x => x.tahunAjaran === ta && !MAPEL_OPTIONS.includes(x.mapel)).map(x => x.mapel))], [kkm, ta]);
  const set = (t, m, v) => { setIsian(s => ({ ...s, [k(t, m)]: v })); setBerubah(true); };
  const adaInvalid = Object.values(isian).some(v => !valid(v));
  const terisi = Object.values(isian).filter(v => v !== '' && v !== undefined).length;

  function isiStandar() {
    const baru = { ...isian };
    TINGKAT_LIST.forEach(t => mapelTampil.forEach(m => { if (baru[k(t, m)] === undefined || baru[k(t, m)] === '') baru[k(t, m)] = kkmStandar(m, t); }));
    setIsian(baru); setBerubah(true);
  }
  function salin() {
    if (!salinDari) return;
    setIsian({ ...isian, ...tersimpanTa(salinDari) }); setBerubah(true);
    toast(`KKM dari ${salinDari} disalin. Klik Simpan untuk menyimpannya ke ${ta}.`);
  }

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (adaInvalid) { toast('Ada KKM di luar 0–100.', 'error'); return; }
    const rows = [];
    TINGKAT_LIST.forEach(t => mapelTampil.forEach(m => {
      const v = isian[k(t, m)];
      if (v === undefined || v === '') return;
      if (tersimpan[k(t, m)] !== undefined && Number(tersimpan[k(t, m)]) === Number(v)) return; // tidak berubah
      rows.push({ 'Tahun Ajaran': ta, Tingkat: t, 'Mata Pelajaran': m, KKM: Number(v), Keterangan: '' });
    }));
    if (!rows.length) { toast('Tidak ada perubahan untuk disimpan.'); setBerubah(false); return; }
    setMenyimpan(true);
    try {
      const { ditambah, diupdate } = await upsertKkmToSheet(rows);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Atur KKM', modul: 'Kurikulum & KKM', detail: `${ta}: ${ditambah} baru, ${diupdate} diperbarui` });
      await refreshKkm();
      toast(`KKM tersimpan: ${ditambah} baru, ${diupdate} diperbarui.`);
    } catch (err) { toast(err.message, 'error'); } finally { setMenyimpan(false); }
  }

  function exportMatriks() {
    const headers = ['Mata Pelajaran', ...TINGKAT_LIST.map(namaTingkat)];
    exportToExcel(headers, mapelTampil.map(m => ({ 'Mata Pelajaran': m, ...Object.fromEntries(TINGKAT_LIST.map(t => [namaTingkat(t), isian[k(t, m)] ?? ''])) })),
      `KKM_${ta}`.replace(/[^\w-]+/g, '_'), `KKM/KKTP per Mata Pelajaran — ${ta}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>KKM / KKTP per mata pelajaran</h3><p>Batas ketuntasan per mapel dan tingkat. Dipakai Rapor Digital untuk menentukan tuntas atau belum.</p></div>
        <button className="btn btn-sm" onClick={exportMatriks}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          {JENJANG.length > 1 && <Field label="Jenjang"><Select value={jenjang} onChange={setJenjang} options={JENJANG.map(j => ({ value: j.kode, label: j.nama }))} /></Field>}
          <Field label="Salin dari tahun ajaran">
            <Select value={salinDari} onChange={setSalinDari} placeholder="— pilih —" options={tahunAjaranOptions.filter(x => x !== ta)} />
          </Field>
          <button className="btn" onClick={salin} disabled={!salinDari}>Salin</button>
          <button className="btn" onClick={isiStandar} title="Mengisi sel yang masih kosong saja">Isi sel kosong dengan nilai standar</button>
        </div>
        <div className="table-scroll">
          <table className="kkm-grid">
            <thead><tr><th>Mata Pelajaran</th>{tingkatTampil.map(t => <th key={t}>{namaTingkat(t)}</th>)}</tr></thead>
            <tbody>
              {mapelTampil.map(m => (
                <tr key={m}>
                  <td><b>{m}</b></td>
                  {tingkatTampil.map(t => {
                    const v = isian[k(t, m)] ?? '';
                    return (
                      <td key={t}>
                        <input className={`input-cell${valid(v) ? '' : ' invalid'}`} type="number" min="0" max="100" value={v}
                          aria-label={`KKM ${m} ${namaTingkat(t)}`} onChange={e => set(t, m, e.target.value)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="save-bar">
          <span className="badge badge-muted">{terisi} dari {mapelTampil.length * TINGKAT_LIST.length} sel terisi</span>
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah || adaInvalid}>{menyimpan ? 'Menyimpan…' : 'Simpan KKM'}</button>
        </div>
      </div>
    </div>
  );
}

export default function KurikulumKkm() {
  const { refreshKkm } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('kkm', TABS.map(t => t.id));
  return (
    <Page pageId="kkm" title="Kurikulum & KKM/KKTP" path="Akademik / Kurikulum & KKM">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'matriks' && bolehTab('matriks') && <MatriksKkm />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data KKM" subtitle="Baris KKM mentah semua tahun ajaran."
              headers={KKM_HEADERS} fields={EDIT_FIELDS}
              fetchFn={fetchKkmFromSheet} updateFn={updateKkmInSheet} deleteFn={deleteKkmFromSheet}
              moduleLabel="Kurikulum & KKM" labelKey="Mata Pelajaran" target="akademik"
              searchFn={(r, t) => `${r['Mata Pelajaran']} ${r['Tahun Ajaran']} ${r.Tingkat}`.toLowerCase().includes(t)}
              onChanged={refreshKkm}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
