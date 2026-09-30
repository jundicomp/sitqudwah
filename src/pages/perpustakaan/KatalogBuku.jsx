import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import InfoCard from '../../components/common/InfoCard';
import Barcode from '../../components/common/Barcode';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { BUKU_HEADERS, KATEGORI_BUKU, buildBukuFields, kodeBukuBerikutnya, stokBuku, normalizeSheetBuku } from '../../db/perpusFields';
import { fetchBukuFromSheet, addBukuToSheet, updateBukuInSheet, deleteBukuFromSheet } from '../../services/googleSheets';
import { printElementById } from '../../utils/exportTable';

const TABS = [
  { id: 'katalog', label: 'KATALOG' },
  { id: 'tambah', label: 'TAMBAH BUKU' },
  { id: 'label', label: 'CETAK LABEL BARCODE' },
];

function CetakLabel() {
  const { buku, profilSekolah } = useAppData();
  const [kategori, setKategori] = useState('');
  const [cari, setCari] = useState('');
  const [perEksemplar, setPerEksemplar] = useState(true);
  const daftar = useMemo(() => {
    const t = cari.trim().toLowerCase();
    return buku.filter(b => b.jenis !== 'Digital' && b.kode && (!kategori || b.kategori === kategori) && (!t || `${b.judul} ${b.kode}`.toLowerCase().includes(t)));
  }, [buku, kategori, cari]);
  const label = daftar.flatMap(b => Array.from({ length: perEksemplar ? Math.max(1, b.eksemplar) : 1 }, (_, i) => ({ b, i })));
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Label barcode buku</h3><p>Tempel di punggung/sampul buku. Semua eksemplar judul yang sama memakai kode yang sama.</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => printElementById('label-buku-cetak')} disabled={!label.length}>🖨️ Cetak {label.length} label</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Kategori"><Select value={kategori} onChange={setKategori} placeholder="Semua" options={KATEGORI_BUKU} /></Field>
          <Field label="Cari" grow><input value={cari} onChange={e => setCari(e.target.value)} placeholder="judul atau kode" /></Field>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={perEksemplar} onChange={e => setPerEksemplar(e.target.checked)} />Satu label per eksemplar</label>
        </div>
        {!label.length ? <Kosong>Tidak ada buku fisik untuk dicetak labelnya.</Kosong> : (
          <div id="label-buku-cetak" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {label.map(({ b, i }) => (
              <div key={b.kode + i} style={{ width: 230, border: '1px dashed #999', borderRadius: 6, padding: '6px 8px', background: '#fff', breakInside: 'avoid', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#123D22' }}>{profilSekolah?.nama || 'Perpustakaan'}{b.rak ? ` · Rak ${b.rak}` : ''}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 3px' }}>{b.judul}</div>
                <Barcode value={b.kode} height={34} width={212} fontSize={10} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KatalogBuku() {
  const { buku, sirkulasi, refreshBuku } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('katalog-buku', TABS.map(t => t.id));
  const fields = useMemo(() => buildBukuFields(), []);
  const emptyRow = useCallback(() => ({ 'Kode Buku': '', Judul: '', Penulis: '', Penerbit: '', 'Tahun Terbit': '', ISBN: '', Kategori: '', 'Jenis Koleksi': 'Fisik', 'Format Digital': '', 'Tautan Digital': '', 'Lokasi Rak': '', 'Jumlah Eksemplar': 1, Keterangan: '' }), []);

  const siapkan = (row, daftar, noSendiri) => {
    const kode = String(row['Kode Buku'] || '').trim().toUpperCase() || kodeBukuBerikutnya(daftar);
    if (daftar.some(b => b.kode.toUpperCase() === kode && String(b.no) !== String(noSendiri ?? ''))) throw new Error(`Kode buku ${kode} sudah dipakai buku lain.`);
    const eks = Number(row['Jumlah Eksemplar']);
    if (row['Jenis Koleksi'] !== 'Digital' && !(eks >= 1)) throw new Error('Jumlah eksemplar minimal 1 untuk koleksi fisik.');
    if (row['Jenis Koleksi'] !== 'Fisik' && !String(row['Tautan Digital'] || '').trim()) throw new Error('Koleksi digital wajib punya tautan.');
    return { ...row, 'Kode Buku': kode, 'Jumlah Eksemplar': Number.isFinite(eks) ? eks : 0 };
  };
  const addFn = useCallback(async (f) => { await addBukuToSheet(siapkan(f, buku)); await refreshBuku(); }, [buku, refreshBuku]); // eslint-disable-line react-hooks/exhaustive-deps
  const updateFn = useCallback(async (r) => {
    const semua = (await fetchBukuFromSheet()).map(normalizeSheetBuku);
    const { Tersedia: _t, ...bersih } = r; // eslint-disable-line no-unused-vars
    const siap = siapkan(bersih, semua, r.No);
    const dipinjam = sirkulasi.filter(x => x.kodeBuku === siap['Kode Buku'] && x.status === 'Dipinjam').length;
    if (siap['Jumlah Eksemplar'] < dipinjam) throw new Error(`Masih ada ${dipinjam} eksemplar dipinjam; jumlah eksemplar tidak boleh kurang dari itu.`);
    return updateBukuInSheet(siap);
  }, [sirkulasi]); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchFn = useCallback(async () => (await fetchBukuFromSheet()).map(r => ({ ...r, Tersedia: stokBuku(normalizeSheetBuku(r), sirkulasi).tersedia })), [sirkulasi]);

  const stat = useMemo(() => {
    const fisik = buku.filter(b => b.jenis !== 'Digital');
    const eks = fisik.reduce((a, b) => a + b.eksemplar, 0);
    const dipinjam = sirkulasi.filter(x => x.status === 'Dipinjam').length;
    return { judul: buku.length, eks, dipinjam, digital: buku.filter(b => b.jenis !== 'Fisik').length };
  }, [buku, sirkulasi]);

  return (
    <Page pageId="katalog-buku" title="Katalog Buku" path="Perpustakaan / Katalog Buku">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.judul} label="Judul buku" color="c-green" />
        <InfoCard value={stat.eks} label="Eksemplar fisik" color="c-blue" />
        <InfoCard value={stat.dipinjam} label="Sedang dipinjam" color="c-gold" />
        <InfoCard value={stat.digital} label="Koleksi digital" color="c-purple" />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'katalog' && bolehTab('katalog') && (
            <GenericStoredTable title="Katalog buku" subtitle="Kolom Tersedia = eksemplar dikurangi yang sedang dipinjam."
              headers={[...BUKU_HEADERS, 'Tersedia']} fields={fields}
              fetchFn={fetchFn} updateFn={updateFn} deleteFn={deleteBukuFromSheet}
              moduleLabel="Katalog Buku" labelKey="Judul" target="akademik"
              columnRenderers={{
                Tersedia: r => r['Jenis Koleksi'] === 'Digital' ? <span className="badge badge-purple">Digital</span> : <span className={`badge ${r.Tersedia > 0 ? 'badge-green' : 'badge-red'}`}>{r.Tersedia}</span>,
                Judul: r => r['Tautan Digital'] ? <a href={r['Tautan Digital']} target="_blank" rel="noopener noreferrer">{r.Judul}</a> : r.Judul,
              }}
              searchFn={(r, t) => `${r.Judul} ${r.Penulis} ${r['Kode Buku']} ${r.Kategori} ${r.ISBN}`.toLowerCase().includes(t)} onChanged={refreshBuku} />
          )}
          {tab === 'tambah' && bolehTab('tambah') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik"
              title="Tambah buku" subtitle={`Kode buku otomatis ${kodeBukuBerikutnya(buku)} kalau dikosongkan. Untuk koleksi digital, isi tautannya.`} />
          )}
          {tab === 'label' && bolehTab('label') && <CetakLabel />}
        </div>
      </div>
    </Page>
  );
}
