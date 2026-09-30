import { useMemo } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { buildKelasFields, KELAS_HEADERS, emptyKelasRow } from '../../db/kelasFields';
import { fetchKelasFromSheet, addKelasToSheet, updateKelasInSheet, deleteKelasFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

export default function DataKelas() {
  const { kelas, guru, siswa, refreshKelas } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('kelas', ['tabel', 'manual']);

  const waliKelasOptions = useMemo(
    () => guru.filter(g => g.status === 'Aktif' && (g.kategori === 'Guru' || g.kategori === 'Guru & Staff')).map(g => g.nama).sort(),
    [guru]
  );
  const fields = useMemo(() => buildKelasFields(waliKelasOptions), [waliKelasOptions]);

  const jumlahSiswaPerTingkat = useMemo(() => {
    const map = {};
    siswa.forEach(s => { map[s.kelasTingkat] = (map[s.kelasTingkat] || 0) + 1; });
    return map;
  }, [siswa]);

  return (
    <Page pageId="kelas" title="Data Kelas & Rombel" path="Pengaturan / Modul / Data Kelas & Rombel">
      {kelas.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--muted)' }}>{kelas.length} KELAS TERDAFTAR</div>
          </div>
        </div>
      )}

      {guru.length === 0 && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Pilihan Wali Kelas akan muncul di sini begitu ada data di <strong>Data Guru &amp; Staff</strong> dengan status Aktif.
        </div></div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('tabel') && <button className={`seg-tab ${tab === 'tabel' ? 'active' : ''}`} onClick={() => setTab('tabel')}>📋 DATA KELAS (TABEL)</button>}
          {bolehTab('manual') && <button className={`seg-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>📝 TAMBAH MANUAL</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data Kelas & Rombel (Tabel)"
              subtitle="Diambil langsung dari Google Sheets — bisa diubah atau dihapus dari sini."
              headers={KELAS_HEADERS}
              fields={fields}
              fetchFn={fetchKelasFromSheet}
              updateFn={updateKelasInSheet}
              deleteFn={deleteKelasFromSheet}
              moduleLabel="Data Kelas & Rombel"
              labelKey="Nama Kelas"
              searchFn={(r, t) => String(r['Nama Kelas'] ?? '').toLowerCase().includes(t) || String(r['Wali Kelas'] ?? '').toLowerCase().includes(t)}
              onChanged={refreshKelas}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={fields}
              emptyRow={emptyKelasRow}
              addFn={addKelasToSheet}
              onSaved={refreshKelas}
              title="Tambah Kelas"
              subtitle="Data langsung tersimpan ke baris baru di Google Sheets."
            />
          )}
        </div>
      </div>

      {Object.keys(jumlahSiswaPerTingkat).length > 0 && (
        <div className="card">
          <div className="card-head"><div><h3>Jumlah Siswa per Tingkat</h3><p>Dihitung langsung dari data Siswa asli — bukan input manual.</p></div></div>
          <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.keys(jumlahSiswaPerTingkat).sort().map(t => (
              <div key={t} style={{ padding: '8px 16px', background: '#F6F8F5', border: '1px solid var(--border)', borderRadius: 8 }}>
                Tingkat {t}: <strong>{jumlahSiswaPerTingkat[t]}</strong> siswa
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
