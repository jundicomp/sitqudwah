import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { KATEGORI_PENGUMUMAN, DITUJUKAN_OPTIONS, pengumumanAktif } from '../../db/komunikasiFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatTanggalAngka } from '../../db/helpers';
import { pengumumanApi } from '../../services/googleSheets';
import { APP_NAME } from '../../config/appInfo';

const TABS = [
  { id: 'papan', label: 'PAPAN PENGUMUMAN' },
  { id: 'tabel', label: 'KELOLA' },
  { id: 'tulis', label: 'TULIS PENGUMUMAN' },
];
const FIELDS = [
  { key: 'Judul', label: 'Judul', type: 'text', required: true },
  { key: 'Isi', label: 'Isi pengumuman', type: 'textarea', required: true },
  { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_PENGUMUMAN, required: true },
  { key: 'Ditujukan', label: 'Ditujukan kepada', type: 'select', options: DITUJUKAN_OPTIONS, required: true },
  { key: 'Tanggal Terbit', label: 'Tanggal Terbit', type: 'date', required: true },
  { key: 'Berlaku Sampai', label: 'Berlaku Sampai', type: 'date', placeholder: 'kosong = tidak kedaluwarsa' },
  { key: 'Penting', label: 'Tandai penting (disematkan di atas)', type: 'select', options: ['Ya', 'Tidak'] },
];
const cekTanggal = (r) => {
  if (r['Berlaku Sampai'] && String(r['Berlaku Sampai']).slice(0, 10) < String(r['Tanggal Terbit']).slice(0, 10)) throw new Error('Berlaku sampai tidak boleh sebelum tanggal terbit.');
  return r;
};

// Teks siap kirim untuk WhatsApp (bold pakai *...* sesuai format WA).
function teksWa(p, sekolah) {
  return `*${sekolah}*\n📢 *${p.judul}*\n\n${p.isi}\n\n_Ditujukan: ${p.ditujukan} · ${formatTanggalAngka(p.terbit)}_`;
}

function Papan() {
  const { pengumuman, profilSekolah, toast } = useAppData();
  const hariIni = sekarangWIB().tanggal;
  const [filter, setFilter] = useState('Aktif');
  const [kategori, setKategori] = useState('');
  const daftar = useMemo(() => pengumuman
    .filter(p => (filter === 'Aktif' ? pengumumanAktif(p, hariIni) : filter === 'Terjadwal' ? p.terbit > hariIni : p.sampai && p.sampai < hariIni))
    .filter(p => !kategori || p.kategori === kategori)
    .sort((a, b) => (b.penting - a.penting) || b.terbit.localeCompare(a.terbit)), [pengumuman, filter, kategori, hariIni]);
  const sekolah = profilSekolah?.nama || APP_NAME;

  async function salin(p) {
    try { await navigator.clipboard.writeText(teksWa(p, sekolah)); toast('Teks pengumuman disalin.'); }
    catch { toast('Browser menolak akses clipboard.', 'error'); }
  }

  return (
    <>
      <div className="filter-bar">
        <Field label="Tampilkan"><Select value={filter} onChange={setFilter} options={['Aktif', 'Terjadwal', 'Kedaluwarsa']} /></Field>
        <Field label="Kategori"><Select value={kategori} onChange={setKategori} placeholder="Semua" options={KATEGORI_PENGUMUMAN} /></Field>
      </div>
      {!daftar.length ? <Kosong>Tidak ada pengumuman {filter.toLowerCase()}.</Kosong> : daftar.map(p => (
        <div key={p.id} className="card" style={{ borderLeft: `5px solid ${p.penting ? 'var(--red)' : 'var(--green)'}` }}>
          <div className="card-head">
            <div><h3>{p.penting && '📌 '}{p.judul}</h3><p>{p.kategori} · untuk {p.ditujukan} · terbit {formatTanggalAngka(p.terbit)}{p.sampai ? ` · sampai ${formatTanggalAngka(p.sampai)}` : ''}{p.oleh ? ` · oleh ${p.oleh}` : ''}</p></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <a className="btn btn-sm" href={`https://wa.me/?text=${encodeURIComponent(teksWa(p, sekolah))}`} target="_blank" rel="noopener noreferrer">Kirim via WA</a>
              <button className="btn btn-sm" onClick={() => salin(p)}>Salin teks</button>
            </div>
          </div>
          <div className="card-body" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{p.isi}</div>
        </div>
      ))}
    </>
  );
}

export default function Pengumuman() {
  const { refreshPengumuman } = useAppData();
  const { currentUser } = useAuth();
  const { tab, setTab, bolehTab } = useTabAccess('pengumuman', TABS.map(t => t.id));
  const emptyRow = useCallback(() => ({ Judul: '', Isi: '', Kategori: 'Umum', Ditujukan: 'Semua', 'Tanggal Terbit': sekarangWIB().tanggal, 'Berlaku Sampai': '', Penting: 'Tidak' }), []);
  const addFn = useCallback(async (f) => { await pengumumanApi.add({ ...cekTanggal(f), 'Dibuat Oleh': currentUser.nama }); await refreshPengumuman(); }, [currentUser, refreshPengumuman]);
  return (
    <Page pageId="pengumuman" title="Pengumuman" path="Komunikasi / Pengumuman">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'papan' && bolehTab('papan') && <Papan />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable title="Kelola pengumuman" subtitle="Semua pengumuman termasuk yang terjadwal dan kedaluwarsa."
              headers={['No', 'Tanggal Terbit', 'Judul', 'Kategori', 'Ditujukan', 'Berlaku Sampai', 'Penting', 'Dibuat Oleh']} fields={FIELDS}
              fetchFn={pengumumanApi.fetch} updateFn={r => pengumumanApi.update(cekTanggal(r))} deleteFn={pengumumanApi.remove}
              moduleLabel="Pengumuman" labelKey="Judul" target="akademik" onChanged={refreshPengumuman}
              searchFn={(r, t) => `${r.Judul} ${r.Isi} ${r.Kategori}`.toLowerCase().includes(t)} />
          )}
          {tab === 'tulis' && bolehTab('tulis') && (
            <GenericManualForm fields={FIELDS} emptyRow={emptyRow} addFn={addFn} target="akademik" title="Tulis pengumuman"
              subtitle="Pengumuman aktif tampil di Dashboard. Dari Papan Pengumuman bisa langsung dikirim ke grup WhatsApp wali murid/guru." />
          )}
        </div>
      </div>
    </Page>
  );
}
