import { useCallback, useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import usePerpus from '../../hooks/usePerpus';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { DENDA_HEADERS, JENIS_DENDA, STATUS_DENDA, PERPUS_DEFAULT, LABEL_PERPUS, selisihHari } from '../../db/perpusFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { fetchDendaPerpusFromSheet, addDendaPerpusToSheet, updateDendaPerpusInSheet, deleteDendaPerpusFromSheet, upsertPengaturanPerpusToSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const TABS = [
  { id: 'daftar', label: 'DAFTAR DENDA' },
  { id: 'tambah', label: 'CATAT DENDA LAIN' },
  { id: 'aturan', label: 'ATURAN PINJAM & DENDA' },
];
const EDIT_FIELDS = [
  { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_DENDA, required: true },
  { key: 'Tanggal Bayar', label: 'Tanggal Bayar', type: 'date' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];
const cekLunas = (r) => ({ ...r, Nominal: Number(r.Nominal) || 0, 'Tanggal Bayar': r.Status === 'Lunas' ? (String(r['Tanggal Bayar'] || '').slice(0, 10) || sekarangWIB().tanggal) : '' });

function Aturan() {
  const { refreshPengaturanPerpus, toast } = useAppData();
  const { currentUser } = useAuth();
  const { aturan } = usePerpus();
  const [form, setForm] = useState(aturan);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => setForm(aturan), [aturan]);
  async function simpan() {
    if (Object.keys(PERPUS_DEFAULT).some(k => !(Number(form[k]) >= 0))) { toast('Semua isian harus angka 0 atau lebih.', 'error'); return; }
    if (!(Number(form.maxHariPinjam) >= 1) || !(Number(form.maxBukuPerAnggota) >= 1)) { toast('Lama pinjam dan batas buku minimal 1.', 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      await upsertPengaturanPerpusToSheet(Object.keys(PERPUS_DEFAULT).map(k => ({ Kunci: k, Nilai: String(form[k]) })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Aturan', modul: 'Perpustakaan', detail: Object.keys(PERPUS_DEFAULT).map(k => `${k}=${form[k]}`).join(', ') });
      await refreshPengaturanPerpus();
      toast('Aturan perpustakaan tersimpan.');
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }
  return (
    <div className="card">
      <div className="card-head"><div><h3>Aturan pinjam &amp; denda</h3><p>Berlaku untuk peminjaman berikutnya; pinjaman yang sudah berjalan tetap memakai jatuh temponya.</p></div></div>
      <div className="card-body">
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {Object.keys(PERPUS_DEFAULT).map(k => <div key={k} className="field"><label>{LABEL_PERPUS[k]}</label><input type="number" min="0" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>)}
        </div>
        <div className="save-bar"><span /><button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan aturan'}</button></div>
      </div>
    </div>
  );
}

export default function DendaPerpus() {
  const { buku, sirkulasi, dendaPerpus, refreshDendaPerpus, toast } = useAppData();
  const { anggota, aturan } = usePerpus();
  const { tab, setTab, bolehTab } = useTabAccess('denda-perpus', TABS.map(t => t.id));
  const [sinyal, setSinyal] = useState(0);
  const hariIni = sekarangWIB().tanggal;

  const stat = useMemo(() => {
    const tarif = Number(aturan.tarifDendaPerHari) || 0;
    const berjalan = sirkulasi.filter(x => x.status === 'Dipinjam' && x.jatuhTempo < hariIni);
    return {
      belum: dendaPerpus.filter(d => d.status !== 'Lunas').reduce((a, d) => a + d.nominal, 0),
      lunasBulanIni: dendaPerpus.filter(d => d.status === 'Lunas' && d.tanggalBayar.slice(0, 7) === hariIni.slice(0, 7)).reduce((a, d) => a + d.nominal, 0),
      estimasi: berjalan.reduce((a, x) => a + selisihHari(x.jatuhTempo, hariIni) * tarif, 0), jmlBerjalan: berjalan.length,
    };
  }, [dendaPerpus, sirkulasi, aturan, hariIni]);

  const agtLabel = (a) => `${a.nama} — ${a.info} (${a.kode})`;
  const bukuLabel = (b) => `${b.judul} (${b.kode})`;
  const fields = useMemo(() => [
    { key: 'Anggota', label: 'Anggota', type: 'select', options: anggota.map(agtLabel), required: true },
    { key: 'Buku', label: 'Buku', type: 'select', options: buku.map(bukuLabel), required: true },
    { key: 'Jenis Denda', label: 'Jenis Denda', type: 'select', options: JENIS_DENDA.filter(j => j !== 'Keterlambatan'), required: true },
    { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
    { key: 'Tanggal Denda', label: 'Tanggal', type: 'date', required: true },
    { key: 'Keterangan', label: 'Keterangan', type: 'text', required: true, placeholder: 'mis. sampul sobek, buku hilang' },
  ], [anggota, buku]);
  const emptyRow = useCallback(() => ({ Anggota: '', Buku: '', 'Jenis Denda': 'Kerusakan atau Kehilangan', Nominal: '', 'Tanggal Denda': hariIni, Keterangan: '' }), [hariIni]);
  const addFn = useCallback(async (f) => {
    const a = anggota.find(x => agtLabel(x) === f.Anggota); const b = buku.find(x => bukuLabel(x) === f.Buku);
    if (!a || !b) throw new Error('Pilih anggota dan buku dari daftar.');
    if (!(Number(f.Nominal) > 0)) throw new Error('Nominal harus lebih dari 0.');
    await addDendaPerpusToSheet({ 'No Sirkulasi': '', 'Kode Buku': b.kode, 'Judul Buku': b.judul, 'Kode Anggota': a.kode, 'Nama Peminjam': a.nama, 'Jenis Denda': f['Jenis Denda'], 'Hari Terlambat': 0, Nominal: Number(f.Nominal), Status: 'Belum Dibayar', 'Tanggal Denda': f['Tanggal Denda'], 'Tanggal Bayar': '', Keterangan: f.Keterangan });
    await refreshDendaPerpus();
  }, [anggota, buku, refreshDendaPerpus]);

  async function lunasi(r) {
    try { await updateDendaPerpusInSheet({ ...r, Status: 'Lunas', 'Tanggal Bayar': hariIni }); toast(`Denda ${r['Nama Peminjam']} ditandai lunas.`); setSinyal(x => x + 1); refreshDendaPerpus(); }
    catch (e) { toast(e.message, 'error'); }
  }

  return (
    <Page pageId="denda-perpus" title="Denda & Keterlambatan" path="Perpustakaan / Denda & Keterlambatan">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={formatRupiah(stat.belum)} label="Denda belum dibayar" color="c-red" valueFontSize={20} />
        <InfoCard value={formatRupiah(stat.lunasBulanIni)} label="Dibayar bulan ini" color="c-green" valueFontSize={20} />
        <InfoCard value={formatRupiah(stat.estimasi)} label={`Estimasi denda berjalan (${stat.jmlBerjalan} buku terlambat)`} color="c-gold" valueFontSize={20} />
        <InfoCard value={formatRupiah(Number(aturan.tarifDendaPerHari) || 0)} label="Tarif per hari" color="c-blue" valueFontSize={20} />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'daftar' && bolehTab('daftar') && (
            <GenericStoredTable title="Daftar denda" subtitle="Denda keterlambatan tercatat otomatis saat pengembalian. Estimasi berjalan belum masuk sini sampai bukunya dikembalikan."
              headers={DENDA_HEADERS} fields={EDIT_FIELDS} refreshSignal={sinyal}
              fetchFn={fetchDendaPerpusFromSheet} updateFn={r => updateDendaPerpusInSheet(cekLunas(r))} deleteFn={deleteDendaPerpusFromSheet}
              moduleLabel="Denda Perpustakaan" labelKey="Nama Peminjam" target="akademik"
              columnRenderers={{ Status: r => <span className={`badge ${r.Status === 'Lunas' ? 'badge-green' : 'badge-red'}`}>{r.Status}</span>, Nominal: r => formatRupiah(Number(r.Nominal) || 0) }}
              extraActions={r => r.Status !== 'Lunas' && <button className="btn btn-sm" onClick={() => lunasi(r)}>Tandai lunas</button>}
              searchFn={(r, t) => `${r['Nama Peminjam']} ${r['Judul Buku']} ${r.Status} ${r['Jenis Denda']}`.toLowerCase().includes(t)} onChanged={refreshDendaPerpus} />
          )}
          {tab === 'tambah' && bolehTab('tambah') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik" title="Catat denda kerusakan / kehilangan" subtitle="Denda keterlambatan tidak perlu dicatat di sini — otomatis saat pengembalian." />
          )}
          {tab === 'aturan' && bolehTab('aturan') && <Aturan />}
        </div>
      </div>
    </Page>
  );
}
