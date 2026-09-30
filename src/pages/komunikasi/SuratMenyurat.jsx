import { useCallback, useMemo } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SIFAT_SURAT, STATUS_SURAT_MASUK, STATUS_SURAT_KELUAR, KLASIFIKASI_SURAT, nomorSuratBerikutnya, kodeInstansiDari, normalizeSheetSurat } from '../../db/komunikasiFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { suratApi } from '../../services/googleSheets';

const TABS = [
  { id: 'masuk', label: 'SURAT MASUK' },
  { id: 'keluar', label: 'SURAT KELUAR' },
  { id: 'catat-masuk', label: 'CATAT SURAT MASUK' },
  { id: 'buat-keluar', label: 'BUAT SURAT KELUAR' },
];
const BADGE_SIFAT = { Biasa: 'badge-muted', Penting: 'badge-gold', Segera: 'badge-red', Rahasia: 'badge-purple' };
const fieldsMasuk = [
  { key: 'Nomor Surat', label: 'Nomor Surat', type: 'text', required: true },
  { key: 'Tanggal Surat', label: 'Tanggal Surat', type: 'date', required: true },
  { key: 'Tanggal Diterima / Dikirim', label: 'Tanggal Diterima', type: 'date', required: true },
  { key: 'Pengirim / Tujuan', label: 'Pengirim', type: 'text', required: true },
  { key: 'Perihal', label: 'Perihal', type: 'text', required: true },
  { key: 'Kode Klasifikasi', label: 'Klasifikasi', type: 'select', options: KLASIFIKASI_SURAT },
  { key: 'Sifat', label: 'Sifat', type: 'select', options: SIFAT_SURAT, required: true },
  { key: 'Disposisi', label: 'Disposisi kepada / instruksi', type: 'text' },
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_SURAT_MASUK, required: true },
  { key: 'Tautan Berkas', label: 'Tautan berkas (Google Drive, dll)', type: 'text' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];
const fieldsKeluar = [
  { key: 'Nomor Surat', label: 'Nomor Surat', type: 'text', placeholder: 'kosongkan = dibuat otomatis' },
  { key: 'Tanggal Surat', label: 'Tanggal Surat', type: 'date', required: true },
  { key: 'Tanggal Diterima / Dikirim', label: 'Tanggal Dikirim', type: 'date' },
  { key: 'Pengirim / Tujuan', label: 'Tujuan', type: 'text', required: true },
  { key: 'Perihal', label: 'Perihal', type: 'text', required: true },
  { key: 'Kode Klasifikasi', label: 'Klasifikasi', type: 'select', options: KLASIFIKASI_SURAT, required: true },
  { key: 'Sifat', label: 'Sifat', type: 'select', options: SIFAT_SURAT, required: true },
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_SURAT_KELUAR, required: true },
  { key: 'Tautan Berkas', label: 'Tautan berkas', type: 'text' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];
const HEADERS = (jenis) => ['No', 'Nomor Surat', 'Tanggal Surat', 'Tanggal Diterima / Dikirim', 'Pengirim / Tujuan', 'Perihal', 'Sifat', 'Status', ...(jenis === 'Masuk' ? ['Disposisi'] : [])];

export default function SuratMenyurat() {
  const { surat, refreshSurat, profilSekolah } = useAppData();
  const { currentUser } = useAuth();
  const { tab, setTab, bolehTab } = useTabAccess('surat', TABS.map(t => t.id));
  const hariIni = sekarangWIB().tanggal;
  const kodeInstansi = kodeInstansiDari(profilSekolah?.nama);

  const fetchJenis = useCallback((jenis) => async () => (await suratApi.fetch()).filter(r => String(r.Jenis).trim() === jenis), []);
  const fetchMasuk = useMemo(() => fetchJenis('Masuk'), [fetchJenis]);
  const fetchKeluar = useMemo(() => fetchJenis('Keluar'), [fetchJenis]);

  const emptyMasuk = useCallback(() => ({ 'Nomor Surat': '', 'Tanggal Surat': hariIni, 'Tanggal Diterima / Dikirim': hariIni, 'Pengirim / Tujuan': '', Perihal: '', 'Kode Klasifikasi': '', Sifat: 'Biasa', Disposisi: '', Status: 'Diterima', 'Tautan Berkas': '', Keterangan: '' }), [hariIni]);
  const emptyKeluar = useCallback(() => ({ 'Nomor Surat': '', 'Tanggal Surat': hariIni, 'Tanggal Diterima / Dikirim': '', 'Pengirim / Tujuan': '', Perihal: '', 'Kode Klasifikasi': '', Sifat: 'Biasa', Status: 'Draft', 'Tautan Berkas': '', Keterangan: '' }), [hariIni]);

  const addMasuk = useCallback(async (f) => { await suratApi.add({ ...f, Jenis: 'Masuk', 'Dicatat Oleh': currentUser.nama }); await refreshSurat(); }, [currentUser, refreshSurat]);
  const addKeluar = useCallback(async (f) => {
    // Nomor dihitung dari data TERBARU di Sheets supaya tidak kembar walau dua petugas input bersamaan.
    const terbaru = (await suratApi.fetch()).map(normalizeSheetSurat);
    const nomor = String(f['Nomor Surat'] || '').trim() || nomorSuratBerikutnya(terbaru, String(f['Tanggal Surat']).slice(0, 10), f['Kode Klasifikasi'], kodeInstansi);
    if (terbaru.some(x => x.jenis === 'Keluar' && x.nomor === nomor)) throw new Error(`Nomor ${nomor} sudah dipakai.`);
    await suratApi.add({ ...f, 'Nomor Surat': nomor, Jenis: 'Keluar', 'Dicatat Oleh': currentUser.nama });
    await refreshSurat();
  }, [currentUser, refreshSurat, kodeInstansi]);

  const stat = useMemo(() => ({
    masukBulan: surat.filter(s => s.jenis === 'Masuk' && (s.tanggalProses || s.tanggal).slice(0, 7) === hariIni.slice(0, 7)).length,
    keluarBulan: surat.filter(s => s.jenis === 'Keluar' && s.tanggal.slice(0, 7) === hariIni.slice(0, 7)).length,
    belumTindak: surat.filter(s => s.jenis === 'Masuk' && (s.status === 'Diterima' || s.status === 'Didisposisi')).length,
    draft: surat.filter(s => s.jenis === 'Keluar' && s.status === 'Draft').length,
  }), [surat, hariIni]);
  const contohNomor = nomorSuratBerikutnya(surat, hariIni, 'TU', kodeInstansi);
  const renderers = { Sifat: r => <span className={`badge ${BADGE_SIFAT[r.Sifat] || 'badge-muted'}`}>{r.Sifat}</span>, 'Nomor Surat': r => (r['Tautan Berkas'] ? <a href={r['Tautan Berkas']} target="_blank" rel="noopener noreferrer">{r['Nomor Surat']}</a> : r['Nomor Surat']) };
  const cari = (r, t) => `${r['Nomor Surat']} ${r.Perihal} ${r['Pengirim / Tujuan']} ${r.Status}`.toLowerCase().includes(t);

  return (
    <Page pageId="surat" title="Surat Menyurat" path="Komunikasi / Surat Menyurat">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.masukBulan} label="Surat masuk bulan ini" color="c-blue" />
        <InfoCard value={stat.belumTindak} label="Surat masuk belum ditindaklanjuti" color="c-red" />
        <InfoCard value={stat.keluarBulan} label="Surat keluar bulan ini" color="c-green" />
        <InfoCard value={stat.draft} label="Surat keluar masih draft" color="c-gold" />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'masuk' && bolehTab('masuk') && (
            <GenericStoredTable title="Agenda surat masuk" subtitle="Nomor surat bisa diklik kalau berkasnya ditautkan." headers={HEADERS('Masuk')} fields={fieldsMasuk}
              fetchFn={fetchMasuk} updateFn={suratApi.update} deleteFn={suratApi.remove} moduleLabel="Surat Masuk" labelKey="Perihal" target="akademik"
              columnRenderers={renderers} searchFn={cari} onChanged={refreshSurat} />
          )}
          {tab === 'keluar' && bolehTab('keluar') && (
            <GenericStoredTable title="Agenda surat keluar" subtitle="Nomor urut dimulai lagi dari 001 setiap tahun." headers={HEADERS('Keluar')} fields={fieldsKeluar}
              fetchFn={fetchKeluar} updateFn={suratApi.update} deleteFn={suratApi.remove} moduleLabel="Surat Keluar" labelKey="Perihal" target="akademik"
              columnRenderers={renderers} searchFn={cari} onChanged={refreshSurat} />
          )}
          {tab === 'catat-masuk' && bolehTab('catat-masuk') && (
            <GenericManualForm fields={fieldsMasuk} emptyRow={emptyMasuk} addFn={addMasuk} target="akademik" title="Catat surat masuk" subtitle="Unggah pindaian surat ke Google Drive lalu tempel tautannya supaya arsip bisa dibuka dari sini." />
          )}
          {tab === 'buat-keluar' && bolehTab('buat-keluar') && (
            <GenericManualForm fields={fieldsKeluar} emptyRow={emptyKeluar} addFn={addKeluar} target="akademik" title="Buat surat keluar"
              subtitle={`Nomor otomatis berformat urut/klasifikasi/instansi/bulan romawi/tahun, mis. ${contohNomor}. Isi manual kalau mau format lain.`} />
          )}
        </div>
      </div>
    </Page>
  );
}
