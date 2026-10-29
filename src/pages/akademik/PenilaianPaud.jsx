import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TombolUnggahFoto } from '../../components/common/FotoDrive';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { CapaianPills, BannerIdSiswa, GaleriFoto, rombelPaud } from '../../components/paud/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { siswaDiRombel, semesterDariTanggal, SEMESTER_OPTIONS } from '../../db/akademikFields';
import { TEKNIK_PAUD, daftarBidangPaud, ASESMEN_PAUD_HEADERS } from '../../db/raporPaudFields';
import { todayWIB } from '../../db/helpers';
import {
  bulkAddAsesmenPaudToSheet, addAsesmenPaudToSheet, fetchAsesmenPaudFromSheet, updateAsesmenPaudInSheet,
  deleteAsesmenPaudFromSheet, addLogEntry, isConfigured,
} from '../../services/googleSheets';

const TABS = [
  { id: 'kegiatan', label: 'CEKLIS PER KEGIATAN' },
  { id: 'anak', label: 'CATATAN PER ANAK' },
  { id: 'data', label: 'DATA PENILAIAN' },
];

function pesanGagal(e) {
  return /tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "asesmenPaud" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message;
}

function PilihBidang({ value, onChange, bidang }) {
  const grup = ['Elemen', 'Muatan lokal', 'Karakter'];
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— pilih —</option>
      {grup.map(g => (
        <optgroup key={g} label={g}>
          {bidang.filter(b => b.grup === g).map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

const barisAsesmen = ({ tanggal, sw, rombel, ta, bidang, kegiatan, teknik, capaian, catatan, foto, oleh }) => ({
  Tanggal: tanggal, 'ID Siswa': sw.idSiswa, NISN: sw.nisn, 'Nama Siswa': sw.nama, Tingkat: rombel?.tingkat || sw.kelasTingkat, Rombel: rombel?.rombel || sw.rombel,
  'Tahun Ajaran': ta, Semester: semesterDariTanggal(tanggal), Bidang: bidang, Kegiatan: kegiatan, Teknik: teknik,
  Capaian: capaian || '', Catatan: catatan || '', Foto: (foto || []).join('\n'), 'Dicatat Oleh': oleh,
});

// ---- Tab 1: satu kegiatan, satu kelas sekaligus ----
function CeklisKegiatan() {
  const { siswa, pengaturanPaud: p, refreshAsesmenPaud, toast } = useAppData();
  const { currentUser } = useAuth();
  const { taAktif, rombelList } = useAkademikOptions();
  const daftarRombel = useMemo(() => rombelPaud(rombelList), [rombelList]);
  const bidang = useMemo(() => daftarBidangPaud(p), [p]);
  const [tanggal, setTanggal] = useState(todayWIB());
  const [rombelKey, setRombelKey] = useState('');
  const [bid, setBid] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [teknik, setTeknik] = useState('Ceklis');
  const [nilai, setNilai] = useState({});   // { idSiswa: { capaian, catatan } }
  const [foto, setFoto] = useState([]);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { if (!rombelKey && daftarRombel.length) setRombelKey(daftarRombel[0].key); }, [daftarRombel, rombelKey]);
  const rombel = daftarRombel.find(r => r.key === rombelKey);
  const anak = useMemo(() => (rombel ? siswaDiRombel(siswa, rombel.tingkat, rombel.rombel) : []), [siswa, rombel]);
  const set = (id, patch) => setNilai(n => ({ ...n, [id]: { ...(n[id] || {}), ...patch } }));
  const terisi = anak.filter(a => a.idSiswa && (nilai[a.idSiswa]?.capaian || nilai[a.idSiswa]?.catatan?.trim()));

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!bid) { toast('Pilih bidang penilaiannya dulu.', 'error'); return; }
    if (!terisi.length) { toast('Belum ada anak yang diberi capaian atau catatan.', 'error'); return; }
    setMenyimpan(true);
    try {
      await bulkAddAsesmenPaudToSheet(terisi.map(sw => barisAsesmen({
        tanggal, sw, rombel, ta: taAktif, bidang: bid, kegiatan: kegiatan.trim(), teknik,
        capaian: nilai[sw.idSiswa]?.capaian, catatan: nilai[sw.idSiswa]?.catatan?.trim(), foto, oleh: currentUser.nama,
      })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Input Penilaian PAUD', modul: 'Penilaian PAUD', detail: `${rombel.label}, ${bid}${kegiatan ? ' — ' + kegiatan : ''}: ${terisi.length} anak` });
      await refreshAsesmenPaud();
      toast(`${terisi.length} penilaian tersimpan.`);
      setNilai({}); setFoto([]); setKegiatan('');
    } catch (e) { toast(pesanGagal(e), 'error'); } finally { setMenyimpan(false); }
  }

  if (!daftarRombel.length) return <Kosong>Belum ada kelas berformat PAUD. Atur di Pengaturan › Data Kelas &amp; Rombel › Jenjang &amp; Tingkat (kolom Format rapor = PAUD).</Kosong>;
  return (
    <div className="card">
      <div className="card-head"><div><h3>Ceklis satu kegiatan untuk satu kelas</h3><p>Mis. "Sholat dhuha" atau "Kunjungan masjid": pilih bidangnya, lalu klik capaian tiap anak. Foto kegiatan bersama ikut menempel ke semua anak yang dinilai.</p></div></div>
      <div className="card-body">
        <BannerIdSiswa daftar={anak} />
        <div className="filter-bar">
          <Field label="Tanggal"><input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} /></Field>
          <Field label="Kelas"><Select value={rombelKey} onChange={k => { setRombelKey(k); setNilai({}); }} options={daftarRombel.map(r => ({ value: r.key, label: r.label }))} /></Field>
          <Field label="Bidang"><PilihBidang value={bid} onChange={setBid} bidang={bidang} /></Field>
          <Field label="Kegiatan" grow><input value={kegiatan} placeholder="mis. Sholat dhuha berjamaah" onChange={e => setKegiatan(e.target.value)} /></Field>
          <Field label="Teknik"><Select value={teknik} onChange={setTeknik} options={TEKNIK_PAUD} /></Field>
        </div>
        <div className="ringkas-bar" style={{ margin: '4px 0 10px', justifyContent: 'space-between' }}>
          <span className="badge badge-muted">{terisi.length} dari {anak.length} anak terisi · {taAktif} · Semester {semesterDariTanggal(tanggal)}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => setNilai(Object.fromEntries(anak.filter(a => a.idSiswa).map(a => [a.idSiswa, { ...(nilai[a.idSiswa] || {}), capaian: 'BSH' }])))}>Semua BSH</button>
            <button className="btn btn-sm" onClick={() => setNilai({})}>Kosongkan</button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="paud-tabel">
            <thead><tr><th>Nama anak</th><th style={{ width: 230 }}>Capaian</th><th>Catatan singkat (opsional)</th></tr></thead>
            <tbody>
              {anak.map(a => (
                <tr key={a.id}>
                  <td><b>{a.nama}</b>{!a.idSiswa && <div style={{ fontSize: 11.5, color: 'var(--red)' }}>belum ada ID Siswa</div>}</td>
                  <td><CapaianPills size="sm" skala={p.skala} value={nilai[a.idSiswa]?.capaian || ''} disabled={!a.idSiswa} onChange={v => set(a.idSiswa, { capaian: v })} /></td>
                  <td><input className="input-cell" disabled={!a.idSiswa} value={nilai[a.idSiswa]?.catatan || ''} placeholder="mis. sudah hafal bacaan iftitah" onChange={e => set(a.idSiswa, { catatan: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Foto kegiatan (opsional)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <GaleriFoto foto={foto} onHapus={u => setFoto(f => f.filter(x => x !== u))} />
            <TombolUnggahFoto multiple subfolder={`Penilaian PAUD ${taAktif.replace('/', '-')}`} nama={`${rombel?.label || 'kelas'}-${kegiatan || bid}`} onUploaded={u => setFoto(f => [...f, u])} onError={m => toast(m, 'error')} />
          </div>
        </div>
        <div className="save-bar">
          <span />
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !terisi.length}>{menyimpan ? 'Menyimpan…' : `Simpan ${terisi.length} penilaian`}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Tab 2: catatan anekdot / hasil karya utk satu anak + riwayatnya ----
function CatatanPerAnak() {
  const { siswa, asesmenPaud, pengaturanPaud: p, refreshAsesmenPaud, toast } = useAppData();
  const { currentUser } = useAuth();
  const { taAktif, rombelList } = useAkademikOptions();
  const daftarRombel = useMemo(() => rombelPaud(rombelList), [rombelList]);
  const bidang = useMemo(() => daftarBidangPaud(p), [p]);
  const anakPaud = useMemo(() => siswa.filter(s => s.status === 'Aktif' && daftarRombel.some(r => r.tingkat === s.kelasTingkat && r.rombel === s.rombel)).sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [siswa, daftarRombel]);
  const [idAnak, setIdAnak] = useState('');
  const kosong = { tanggal: todayWIB(), bidang: '', kegiatan: '', teknik: 'Catatan Anekdot', capaian: '', catatan: '', foto: [] };
  const [f, setF] = useState(kosong);
  const [menyimpan, setMenyimpan] = useState(false);
  const [semester, setSemester] = useState(semesterDariTanggal());
  const sw = anakPaud.find(a => a.idSiswa === idAnak || a.id === idAnak);
  const riwayat = useMemo(() => (sw ? asesmenPaud.filter(x => x.idSiswa === sw.idSiswa && x.tahunAjaran === taAktif && x.semester === semester).sort((a, b) => b.tanggal.localeCompare(a.tanggal)) : []), [asesmenPaud, sw, taAktif, semester]);

  async function simpan() {
    if (!sw) { toast('Pilih anaknya dulu.', 'error'); return; }
    if (!sw.idSiswa) { toast('Anak ini belum punya ID Siswa.', 'error'); return; }
    if (!f.bidang) { toast('Pilih bidang.', 'error'); return; }
    if (!f.catatan.trim() && !f.capaian && !f.foto.length) { toast('Isi catatan, capaian, atau foto.', 'error'); return; }
    setMenyimpan(true);
    try {
      const rombel = daftarRombel.find(r => r.tingkat === sw.kelasTingkat && r.rombel === sw.rombel);
      await addAsesmenPaudToSheet(barisAsesmen({ ...f, catatan: f.catatan.trim(), kegiatan: f.kegiatan.trim(), sw, rombel, ta: taAktif, bidang: f.bidang, oleh: currentUser.nama }));
      await refreshAsesmenPaud();
      toast('Catatan tersimpan.');
      setF({ ...kosong, bidang: f.bidang, teknik: f.teknik });
    } catch (e) { toast(pesanGagal(e), 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: '2 1 460px', minWidth: 0 }}>
        <div className="card-head"><div><h3>Catatan per anak</h3><p>Untuk catatan anekdot, hasil karya, atau foto berseri satu anak.</p></div></div>
        <div className="card-body">
          <BannerIdSiswa daftar={anakPaud} />
          <div className="form-grid">
            <div className="field span2"><label>Anak</label>
              <select value={idAnak} onChange={e => setIdAnak(e.target.value)}>
                <option value="">— pilih anak —</option>
                {daftarRombel.map(r => (
                  <optgroup key={r.key} label={r.label}>
                    {anakPaud.filter(a => a.kelasTingkat === r.tingkat && a.rombel === r.rombel).map(a => <option key={a.id} value={a.idSiswa || a.id}>{a.nama}</option>)}
                  </optgroup>
                ))}
              </select></div>
            <div className="field"><label>Tanggal</label><input type="date" value={f.tanggal} onChange={e => setF({ ...f, tanggal: e.target.value })} /></div>
            <div className="field"><label>Teknik</label><select value={f.teknik} onChange={e => setF({ ...f, teknik: e.target.value })}>{TEKNIK_PAUD.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Bidang</label><PilihBidang value={f.bidang} onChange={v => setF({ ...f, bidang: v })} bidang={bidang} /></div>
            <div className="field"><label>Kegiatan</label><input value={f.kegiatan} placeholder="mis. Menanam tanaman obat" onChange={e => setF({ ...f, kegiatan: e.target.value })} /></div>
            <div className="field span2"><label>Capaian (opsional)</label><CapaianPills skala={p.skala} value={f.capaian} onChange={v => setF({ ...f, capaian: v })} /></div>
            <div className="field span2"><label>Catatan</label><textarea rows={4} value={f.catatan} placeholder="Apa yang dilihat guru hari ini? mis. Rayyan mau maju sendiri memimpin doa sebelum makan." onChange={e => setF({ ...f, catatan: e.target.value })} /></div>
            <div className="field span2"><label>Foto</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <GaleriFoto foto={f.foto} onHapus={u => setF(x => ({ ...x, foto: x.foto.filter(y => y !== u) }))} />
                <TombolUnggahFoto multiple subfolder={`Penilaian PAUD ${taAktif.replace('/', '-')}`} nama={sw?.nama || 'anak'} onUploaded={u => setF(x => ({ ...x, foto: [...x.foto, u] }))} onError={m => toast(m, 'error')} />
              </div></div>
          </div>
          <div className="save-bar"><span /><button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan catatan'}</button></div>
        </div>
      </div>
      <div className="card" style={{ flex: '1 1 300px', minWidth: 0 }}>
        <div className="card-head"><div><h3>Riwayat {sw ? sw.panggilan || sw.nama.split(' ')[0] : 'anak'}</h3><p>{taAktif}</p></div>
          <Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></div>
        <div className="card-body">
          {!sw ? <Kosong>Pilih anak untuk melihat riwayat penilaiannya.</Kosong> : !riwayat.length ? <Kosong>Belum ada catatan di semester ini.</Kosong> : (
            <div className="paud-riwayat" style={{ maxHeight: 560 }}>
              {riwayat.map(r => (
                <div key={r.id}>
                  <b>{r.tanggal}</b> · {r.bidang}{r.capaian ? <> · <span className="badge badge-green">{r.capaian}</span></> : null}
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.teknik}{r.kegiatan ? ` · ${r.kegiatan}` : ''} · {r.oleh}</div>
                  {r.catatan && <div style={{ marginTop: 3 }}>{r.catatan}</div>}
                  {r.foto.length > 0 && <div style={{ marginTop: 6 }}><GaleriFoto foto={r.foto} /></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EDIT_FIELDS = [
  { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
  { key: 'Bidang', label: 'Bidang', type: 'text', required: true },
  { key: 'Kegiatan', label: 'Kegiatan', type: 'text' },
  { key: 'Teknik', label: 'Teknik', type: 'select', options: TEKNIK_PAUD },
  { key: 'Capaian', label: 'Capaian', type: 'select', options: ['BB', 'MB', 'BSH', 'BSB'] },
  { key: 'Catatan', label: 'Catatan', type: 'textarea' },
];

export default function PenilaianPaud() {
  const { refreshAsesmenPaud } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('penilaian-paud', TABS.map(t => t.id));
  return (
    <Page pageId="penilaian-paud" title="Penilaian PAUD" path="Akademik / Penilaian PAUD">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kegiatan' && bolehTab('kegiatan') && <CeklisKegiatan />}
          {tab === 'anak' && bolehTab('anak') && <CatatanPerAnak />}
          {tab === 'data' && bolehTab('data') && (
            <GenericStoredTable
              title="Data penilaian PAUD" subtitle="Semua catatan penilaian harian. Koreksi atau hapus satu per satu di sini."
              headers={ASESMEN_PAUD_HEADERS} fields={EDIT_FIELDS}
              fetchFn={fetchAsesmenPaudFromSheet} updateFn={updateAsesmenPaudInSheet} deleteFn={deleteAsesmenPaudFromSheet}
              moduleLabel="Penilaian PAUD" labelKey="Nama Siswa" target="akademik"
              searchFn={(r, t) => `${r['Nama Siswa']} ${r.Bidang} ${r.Kegiatan} ${r.Tanggal}`.toLowerCase().includes(t)}
              onChanged={refreshAsesmenPaud}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
