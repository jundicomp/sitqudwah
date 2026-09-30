import { useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import { TabBar, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAllFromSheet, replaceAllInSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import pkg from '../../../package.json';

const TABS = [
  { id: 'backup', label: 'BACKUP' },
  { id: 'restore', label: 'RESTORE' },
];
const TARGET = [
  { id: 'master', label: 'Data Induk' },
  { id: 'keuangan', label: 'Keuangan' },
  { id: 'akademik', label: 'Akademik' },
];
const KATA_KONFIRMASI = 'PULIHKAN';

async function ambilSemua() {
  const data = {};
  for (const t of TARGET) {
    if (!isConfigured(t.id)) continue;
    data[t.id] = await fetchAllFromSheet(t.id);
  }
  return data;
}
function unduhJson(obj, nama) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = nama; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const namaFile = (akhiran) => { const { tanggal, jam } = sekarangWIB(); return `backup-sekolah_${tanggal}_${jam.replace(':', '')}${akhiran}`; };
const hitung = (data) => Object.fromEntries(Object.entries(data || {}).map(([t, sheets]) => [t, Object.fromEntries(Object.entries(sheets || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))]));

async function unduhExcel(data, nama) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  Object.entries(data).forEach(([t, sheets]) => Object.entries(sheets).forEach(([k, rows]) => {
    const ws = wb.addWorksheet(`${t.slice(0, 3)}-${k}`.slice(0, 31));
    const kolom = [...new Set(rows.flatMap(r => Object.keys(r)))];
    ws.addRow(kolom).font = { bold: true };
    rows.forEach(r => ws.addRow(kolom.map(c => r[c] ?? '')));
  }));
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = nama; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Backup() {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [proses, setProses] = useState('');
  const [ringkas, setRingkas] = useState(null);

  async function jalankan(format) {
    setProses(format);
    try {
      const data = await ambilSemua();
      const paket = { aplikasi: 'sistem-sekolah', versi: pkg.version, dibuat: new Date().toISOString(), oleh: currentUser.nama, data };
      if (format === 'json') unduhJson(paket, namaFile('.json')); else await unduhExcel(data, namaFile('.xlsx'));
      setRingkas(hitung(data));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Backup Data', modul: 'Backup & Restore', detail: `Format ${format.toUpperCase()}, ${Object.keys(data).join(', ')}` });
      toast('Backup selesai diunduh.');
    } catch (e) { toast(e.message, 'error'); } finally { setProses(''); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Backup seluruh data</h3><p>Mengambil semua tab dari ketiga file Google Sheets (Data Induk, Keuangan, Akademik) ke satu file di komputer Anda.</p></div></div>
      <div className="card-body">
        <div className="ringkas-bar" style={{ marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={() => jalankan('json')} disabled={!!proses}>{proses === 'json' ? 'Mengambil data…' : '⬇️ Unduh backup (.json) — untuk restore'}</button>
          <button className="btn" onClick={() => jalankan('xlsx')} disabled={!!proses}>{proses === 'xlsx' ? 'Mengambil data…' : '📊 Unduh salinan Excel — untuk dibaca'}</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          Lakukan minimal sekali seminggu dan sebelum perubahan besar (kenaikan kelas, penerbitan tagihan massal).
          File berisi <b>seluruh data termasuk akun dan kata sandi pengguna</b> — simpan di tempat aman, jangan dibagikan.
          Hanya file .json yang bisa dipakai untuk restore.
        </p>
        {ringkas && (
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table><thead><tr><th>File</th><th>Tab</th><th>Jumlah baris</th></tr></thead>
              <tbody>{Object.entries(ringkas).flatMap(([t, s]) => Object.entries(s).map(([k, n]) => <tr key={t + k}><td>{TARGET.find(x => x.id === t)?.label}</td><td>{k}</td><td>{n}</td></tr>))}</tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}

function Restore() {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [paket, setPaket] = useState(null);
  const [sekarang, setSekarang] = useState(null);
  const [pilih, setPilih] = useState({});
  const [konfirmasi, setKonfirmasi] = useState('');
  const [proses, setProses] = useState('');
  const isAdmin = /admin/i.test(String(currentUser?.role || ''));

  async function bacaFile(file) {
    setPaket(null); setPilih({}); setKonfirmasi('');
    try {
      const obj = JSON.parse(await file.text());
      if (obj?.aplikasi !== 'sistem-sekolah' || typeof obj.data !== 'object') throw new Error('Ini bukan file backup aplikasi ini.');
      setPaket({ ...obj, namaFile: file.name });
      setProses('baca');
      setSekarang(hitung(await ambilSemua()));
    } catch (e) { toast(e.message, 'error'); } finally { setProses(''); }
  }

  const daftar = paket ? Object.entries(paket.data).flatMap(([t, s]) => Object.entries(s || {}).map(([k, rows]) => ({ key: `${t}|${k}`, t, k, rows }))) : [];
  const dipilih = daftar.filter(x => pilih[x.key]);

  async function pulihkan() {
    if (konfirmasi !== KATA_KONFIRMASI) return;
    setProses('restore');
    try {
      // Pengaman: simpan kondisi SAAT INI dulu sebelum ditimpa.
      const cadangan = await ambilSemua();
      unduhJson({ aplikasi: 'sistem-sekolah', versi: pkg.version, dibuat: new Date().toISOString(), oleh: currentUser.nama, catatan: 'Otomatis sebelum restore', data: cadangan }, namaFile('_sebelum-restore.json'));
      const hasil = [];
      for (const x of dipilih) {
        if (!isConfigured(x.t)) { hasil.push(`${x.k}: dilewati (file ${x.t} belum tersambung)`); continue; }
        const n = await replaceAllInSheet(x.k, x.rows, x.t);
        hasil.push(`${x.k}: ${n ?? x.rows.length} baris`);
      }
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Restore Data', modul: 'Backup & Restore', detail: `Dari ${paket.namaFile} (${paket.dibuat}): ${hasil.join('; ')}` });
      toast(`Restore selesai: ${hasil.join(', ')}. Halaman dimuat ulang…`);
      setTimeout(() => window.location.reload(), 2500);
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script belum versi 1.38.0 (aksi replaceAll belum ada). Deploy ulang ketiga script dulu.' : e.message, 'error');
    } finally { setProses(''); }
  }

  if (!isAdmin) return <Kosong>Restore hanya bisa dilakukan oleh pengguna dengan role Admin.</Kosong>;
  return (
    <div className="card">
      <div className="card-head"><div><h3>Pulihkan dari backup</h3><p>Isi tab yang dipilih akan <b>DIGANTI SELURUHNYA</b> dengan isi backup. Tab yang tidak dicentang tidak disentuh. Salinan kondisi saat ini otomatis diunduh sebelum proses dimulai.</p></div></div>
      <div className="card-body">
        <input type="file" accept="application/json,.json" onChange={e => e.target.files[0] && bacaFile(e.target.files[0])} />
        {proses === 'baca' && <p style={{ fontSize: 13 }}>Membaca kondisi data saat ini…</p>}
        {paket && (
          <>
            <p style={{ fontSize: 13.5, margin: '12px 0' }}>Backup <b>{paket.namaFile}</b> · dibuat {new Date(paket.dibuat).toLocaleString('id-ID')} oleh {paket.oleh || '-'} · aplikasi v{paket.versi}</p>
            <div className="ringkas-bar" style={{ marginBottom: 8 }}>
              <button className="btn btn-sm" onClick={() => setPilih(Object.fromEntries(daftar.map(x => [x.key, true])))}>Pilih semua</button>
              <button className="btn btn-sm" onClick={() => setPilih({})}>Kosongkan pilihan</button>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th></th><th>File</th><th>Tab</th><th>Baris di backup</th><th>Baris sekarang</th></tr></thead>
                <tbody>{daftar.map(x => {
                  const kini = sekarang?.[x.t]?.[x.k];
                  return (
                    <tr key={x.key}>
                      <td><input type="checkbox" checked={!!pilih[x.key]} onChange={e => setPilih(p => ({ ...p, [x.key]: e.target.checked }))} aria-label={`Pulihkan ${x.k}`} /></td>
                      <td>{TARGET.find(t => t.id === x.t)?.label || x.t}</td><td><b>{x.k}</b></td><td>{x.rows.length}</td>
                      <td>{kini ?? '—'}{kini !== undefined && kini > x.rows.length && <span className="badge badge-red" style={{ marginLeft: 6 }}>{kini - x.rows.length} baris akan hilang</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div className="save-bar">
              <div className="field" style={{ minWidth: 260 }}>
                <label>Ketik <b>{KATA_KONFIRMASI}</b> untuk melanjutkan ({dipilih.length} tab dipilih)</label>
                <input value={konfirmasi} onChange={e => setKonfirmasi(e.target.value.toUpperCase())} />
              </div>
              <button className="btn btn-danger" style={{ background: 'var(--red)', color: '#fff' }} onClick={pulihkan} disabled={!dipilih.length || konfirmasi !== KATA_KONFIRMASI || !!proses}>
                {proses === 'restore' ? 'Memulihkan…' : `Pulihkan ${dipilih.length} tab`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BackupRestore() {
  const { tab, setTab, bolehTab } = useTabAccess('backup', TABS.map(t => t.id));
  return (
    <Page pageId="backup" title="Backup & Restore" path="Pengaturan / Backup & Restore">
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'backup' && bolehTab('backup') && <Backup />}
          {tab === 'restore' && bolehTab('restore') && <Restore />}
        </div>
      </div>
    </Page>
  );
}
