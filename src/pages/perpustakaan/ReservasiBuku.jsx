import { useCallback, useMemo } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import usePerpus from '../../hooks/usePerpus';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { RESERVASI_HEADERS, STATUS_RESERVASI, stokBuku, tambahHari } from '../../db/perpusFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { fetchReservasiFromSheet, addReservasiToSheet, updateReservasiInSheet, deleteReservasiFromSheet } from '../../services/googleSheets';

const TABS = [
  { id: 'daftar', label: 'DAFTAR RESERVASI' },
  { id: 'tambah', label: 'BUAT RESERVASI' },
];
const BADGE = { Menunggu: 'badge-gold', 'Siap Diambil': 'badge-blue', Selesai: 'badge-green', Dibatalkan: 'badge-muted' };
const EDIT_FIELDS = [
  { key: 'Status', label: 'Status', type: 'select', options: STATUS_RESERVASI, required: true },
  { key: 'Catatan', label: 'Catatan', type: 'text' },
];
const labelAgt = (a) => `${a.nama} — ${a.info} (${a.kode})`;
const labelBuku = (b) => `${b.judul} (${b.kode})`;

export default function ReservasiBuku() {
  const { buku, sirkulasi, reservasi, refreshReservasi } = useAppData();
  const { anggota, aturan } = usePerpus();
  const { tab, setTab, bolehTab } = useTabAccess('reservasi-buku', TABS.map(t => t.id));
  const hariIni = sekarangWIB().tanggal;
  const bukuFisik = useMemo(() => buku.filter(b => b.jenis !== 'Digital' && b.kode), [buku]);
  const fields = useMemo(() => [
    { key: 'Anggota', label: 'Anggota', type: 'select', options: anggota.map(labelAgt), required: true },
    { key: 'Buku', label: 'Buku', type: 'select', options: bukuFisik.map(labelBuku), required: true },
    { key: 'Tanggal Reservasi', label: 'Tanggal Reservasi', type: 'date', required: true },
    { key: 'Catatan', label: 'Catatan', type: 'text' },
  ], [anggota, bukuFisik]);
  const emptyRow = useCallback(() => ({ Anggota: '', Buku: '', 'Tanggal Reservasi': hariIni, Catatan: '' }), [hariIni]);

  const addFn = useCallback(async (f) => {
    const a = anggota.find(x => labelAgt(x) === f.Anggota);
    const b = bukuFisik.find(x => labelBuku(x) === f.Buku);
    if (!a || !b) throw new Error('Pilih anggota dan buku dari daftar.');
    if (reservasi.some(r => r.kodeBuku === b.kode && r.kodeAnggota === a.kode && (r.status === 'Menunggu' || r.status === 'Siap Diambil'))) throw new Error(`${a.nama} sudah punya reservasi aktif untuk buku ini.`);
    if (sirkulasi.some(x => x.kodeBuku === b.kode && x.kodeAnggota === a.kode && x.status === 'Dipinjam')) throw new Error(`${a.nama} sedang meminjam buku ini.`);
    const { tersedia } = stokBuku(b, sirkulasi);
    const antre = reservasi.filter(r => r.kodeBuku === b.kode && (r.status === 'Menunggu' || r.status === 'Siap Diambil')).length;
    const status = tersedia > antre ? 'Siap Diambil' : 'Menunggu';
    await addReservasiToSheet({ 'Kode Buku': b.kode, 'Judul Buku': b.judul, 'Kode Anggota': a.kode, 'Nama Peminjam': a.nama, 'Tanggal Reservasi': f['Tanggal Reservasi'], Status: status,
      Catatan: [f.Catatan, status === 'Siap Diambil' ? `Stok tersedia, ambil sebelum ${tambahHari(f['Tanggal Reservasi'], Number(aturan.hariSiapDiambil) || 3)}` : `Antrean ke-${antre + 1}`].filter(Boolean).join('; ') });
    await refreshReservasi();
  }, [anggota, bukuFisik, reservasi, sirkulasi, aturan, refreshReservasi]);

  const ringkas = { menunggu: reservasi.filter(r => r.status === 'Menunggu').length, siap: reservasi.filter(r => r.status === 'Siap Diambil').length };
  return (
    <Page pageId="reservasi-buku" title="Reservasi Buku" path="Perpustakaan / Reservasi Buku">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'daftar' && bolehTab('daftar') && (
            <GenericStoredTable title={`Reservasi — ${ringkas.menunggu} menunggu, ${ringkas.siap} siap diambil`}
              subtitle="Saat buku dikembalikan, reservasi tertua otomatis jadi Siap Diambil; saat dipinjam oleh pemesan, otomatis Selesai."
              headers={RESERVASI_HEADERS} fields={EDIT_FIELDS}
              fetchFn={fetchReservasiFromSheet} updateFn={updateReservasiInSheet} deleteFn={deleteReservasiFromSheet}
              moduleLabel="Reservasi Buku" labelKey="Judul Buku" target="akademik"
              columnRenderers={{ Status: r => <span className={`badge ${BADGE[r.Status] || 'badge-muted'}`}>{r.Status}</span> }}
              searchFn={(r, t) => `${r['Nama Peminjam']} ${r['Judul Buku']} ${r.Status}`.toLowerCase().includes(t)} onChanged={refreshReservasi} />
          )}
          {tab === 'tambah' && bolehTab('tambah') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik"
              title="Buat reservasi" subtitle="Status otomatis: Siap Diambil kalau stok tersedia, atau Menunggu (masuk antrean) kalau semua eksemplar sedang dipinjam." />
          )}
        </div>
      </div>
    </Page>
  );
}
