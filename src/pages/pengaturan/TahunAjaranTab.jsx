import { useState } from 'react';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TAHUN_AJARAN_FIELDS, TAHUN_AJARAN_HEADERS, emptyTahunAjaranRow } from '../../db/tahunAjaranFields';
import { fetchTahunAjaranFromSheet, addTahunAjaranToSheet, updateTahunAjaranInSheet, deleteTahunAjaranFromSheet, setActiveTahunAjaranOnSheet, addLogEntry } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import useTabAccess from '../../hooks/useTabAccess';

const ICON_STAR = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export default function TahunAjaranTab() {
  const { refreshTahunAjaran, toast } = useAppData();
  const { currentUser } = useAuth();
  // itemId "tahun.tabel" / "tahun.manual" -- sub-tab bersarang di DALAM tab "Tahun
  // Ajaran" milik halaman "profil" -- key gabungannya jadi "profil.tahun.tabel" dst.
  const { tab, setTab, bolehTab } = useTabAccess('profil', ['tahun.tabel', 'tahun.manual']);
  const [refreshSignal, setRefreshSignal] = useState(0);

  async function jadikanAktif(row) {
    try {
      await setActiveTahunAjaranOnSheet(row['No']);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Ubah Tahun Aktif',
        modul: 'Tahun Ajaran',
        detail: `Menjadikan "${row['Label']}" sebagai tahun ajaran aktif`,
      });
      toast(`Tahun Ajaran ${row['Label']} sekarang aktif.`);
      setRefreshSignal(s => s + 1);
      refreshTahunAjaran();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="card">
      <div className="seg-tabs">
        {bolehTab('tahun.tabel') && <button className={`seg-tab ${tab === 'tahun.tabel' ? 'active' : ''}`} onClick={() => setTab('tahun.tabel')}>📋 DAFTAR TAHUN AJARAN</button>}
        {bolehTab('tahun.manual') && <button className={`seg-tab ${tab === 'tahun.manual' ? 'active' : ''}`} onClick={() => setTab('tahun.manual')}>📝 TAMBAH TAHUN AJARAN</button>}
      </div>
      <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
        {tab === 'tahun.tabel' && bolehTab('tahun.tabel') && (
          <GenericStoredTable
            title="Daftar Tahun Ajaran"
            subtitle="Klik ★ untuk menjadikan tahun ajaran itu aktif. Hanya satu yang bisa aktif sekaligus."
            headers={TAHUN_AJARAN_HEADERS}
            fields={TAHUN_AJARAN_FIELDS}
            fetchFn={fetchTahunAjaranFromSheet}
            updateFn={updateTahunAjaranInSheet}
            deleteFn={deleteTahunAjaranFromSheet}
            moduleLabel="Tahun Ajaran"
            labelKey="Label"
            searchFn={(r, t) => String(r['Label'] ?? '').toLowerCase().includes(t)}
            onChanged={refreshTahunAjaran}
            refreshSignal={refreshSignal}
            extraActions={(r) => {
              const aktif = String(r['Aktif']).toUpperCase() === 'TRUE';
              return (
                <button
                  className="btn-icon"
                  title={aktif ? 'Tahun ajaran aktif saat ini' : 'Jadikan Aktif'}
                  onClick={() => !aktif && jadikanAktif(r)}
                  style={{ color: aktif ? 'var(--gold)' : 'var(--muted)', cursor: aktif ? 'default' : 'pointer' }}
                >
                  {ICON_STAR}
                </button>
              );
            }}
          />
        )}
        {tab === 'tahun.manual' && bolehTab('tahun.manual') && (
          <GenericManualForm
            fields={TAHUN_AJARAN_FIELDS}
            emptyRow={emptyTahunAjaranRow}
            addFn={(row) => addTahunAjaranToSheet({ ...row, Aktif: 'FALSE' })}
            onSaved={() => { refreshTahunAjaran(); setRefreshSignal(s => s + 1); }}
            title="Tambah Tahun Ajaran"
            subtitle="Tahun ajaran baru dimulai sebagai TIDAK aktif — jadikan aktif manual lewat tabel setelah siap."
          />
        )}
      </div>
    </div>
  );
}
