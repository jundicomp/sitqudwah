import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { GURU_HEADERS, GURU_FIELDS, emptyGuruRow } from '../../db/guruFields';
import { fetchGuruFromSheet, addGuruToSheet, updateGuruInSheet, deleteGuruFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import InfoCard from '../../components/common/InfoCard';
import { IconGraduationCap, IconUsers } from '../../components/common/icons';
import PortofolioGuruTab from './PortofolioGuruTab';
import useTabAccess from '../../hooks/useTabAccess';

const FILTER_OPTIONS = ['Guru', 'Staff']; // opsi filter cuma 2 -- "Guru & Staff" otomatis muncul di keduanya

function cocokFilterKategori(kategoriBaris, filter) {
  if (filter === 'Semua') return true;
  const k = kategoriBaris || 'Guru';
  if (k === 'Guru & Staff') return true; // orang ini genuinely masuk kedua kategori, selalu muncul
  return k === filter;
}

export default function DataGuru() {
  const { guru, refreshGuru } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('guru', ['tabel', 'manual', 'portofolio']);
  const [filterKategori, setFilterKategori] = useState('Semua');

  // "Guru & Staff" dihitung di KEDUA statistik -- orang itu genuinely berperan ganda.
  const jumlahGuru = useMemo(() => guru.filter(g => g.kategori === 'Guru' || g.kategori === 'Guru & Staff').length, [guru]);
  const jumlahStaff = useMemo(() => guru.filter(g => g.kategori === 'Staff' || g.kategori === 'Guru & Staff').length, [guru]);

  // Filter dilakukan di sisi tampilan (bukan di fetch) -- 1 sheet yg sama, cukup
  // disaring lewat kolom Kategori. PENTING: dibungkus useCallback dgn dependency
  // [filterKategori] -- kalau tidak, GenericStoredTable (yg "load"-nya bergantung
  // pada reference fetchFn) akan memuat ulang TANPA HENTI krn fetchFn dianggap
  // "berubah" di setiap render.
  const fetchFnTersaring = useCallback(async () => {
    const rows = await fetchGuruFromSheet();
    return rows.filter(r => cocokFilterKategori(r['Kategori'], filterKategori));
  }, [filterKategori]);

  return (
    <Page pageId="guru" title="Data Guru & Staff" path="Pengaturan / Modul / Data Guru & Staff">
      {guru.length > 0 && (
        <div className="info-grid" style={{ marginBottom: 20 }}>
          <InfoCard icon={IconGraduationCap} color="c-blue" value={jumlahGuru} label="Guru" />
          <InfoCard icon={IconUsers} color="c-purple" value={jumlahStaff} label="Staff" />
        </div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('tabel') && <button className={`seg-tab ${tab === 'tabel' ? 'active' : ''}`} onClick={() => setTab('tabel')}>📋 DATA GURU & STAFF (TABEL)</button>}
          {bolehTab('manual') && <button className={`seg-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>📝 TAMBAH</button>}
          {bolehTab('portofolio') && <button className={`seg-tab ${tab === 'portofolio' ? 'active' : ''}`} onClick={() => setTab('portofolio')}>🪪 PORTOFOLIO</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data Guru & Staff (Tabel)"
              subtitle="Diambil langsung dari Google Sheets — bisa diubah atau dihapus dari sini."
              headers={GURU_HEADERS}
              fields={GURU_FIELDS}
              fetchFn={fetchFnTersaring}
              updateFn={updateGuruInSheet}
              deleteFn={deleteGuruFromSheet}
              moduleLabel="Data Guru & Staff"
              labelKey="Nama Lengkap"
              searchFn={(r, t) => String(r['Nama Lengkap'] ?? '').toLowerCase().includes(t) || String(r['Tugas Tambahan'] ?? '').toLowerCase().includes(t)}
              onChanged={refreshGuru}
              refreshSignal={filterKategori}
              headExtra={
                <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
                  <option value="Semua">Semua (Guru & Staff)</option>
                  {FILTER_OPTIONS.map(k => <option key={k} value={k}>{k} saja</option>)}
                </select>
              }
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={GURU_FIELDS}
              emptyRow={emptyGuruRow}
              addFn={addGuruToSheet}
              onSaved={refreshGuru}
              title="Tambah Guru / Staff"
              subtitle="Pilih Kategori di awal form -- data langsung tersimpan ke baris baru di Google Sheets."
            />
          )}
          {tab === 'portofolio' && bolehTab('portofolio') && <PortofolioGuruTab />}
        </div>
      </div>
    </Page>
  );
}
