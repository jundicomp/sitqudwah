import { useMemo, useState } from 'react';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import { buildTarifFields, TARIF_HEADERS, emptyTarifRow } from '../../db/tarifFields';
import { fetchTarifFromSheet, addTarifToSheet, updateTarifInSheet, deleteTarifFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

// Sejak v1.31.18: form "Tambah Tarif" yang dulu SELALU tampil penuh di bawah
// tabel sekarang jadi modal yang dibuka lewat tombol "+ Tambah Tarif" --
// pola yang sama persis dipakai di BeasiswaKategoriTab/BukuBesarTab/dst.
export default function TarifTab() {
  const { tahunAjaran, refreshTarif } = useAppData();
  const tahunAjaranOptions = useMemo(() => tahunAjaran.map(t => t.label), [tahunAjaran]);
  const fields = useMemo(() => buildTarifFields(tahunAjaranOptions), [tahunAjaranOptions]);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <>
      {tahunAjaranOptions.length === 0 && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum ada Tahun Ajaran. Tambahkan dulu lewat menu <strong>Profil Sekolah &amp; Tahun Ajaran</strong>.
        </div></div>
      )}
      <GenericStoredTable
        title="Daftar Tarif"
        subtitle="SPP bulanan & biaya lain per tahun ajaran."
        headers={TARIF_HEADERS}
        fields={fields}
        fetchFn={fetchTarifFromSheet}
        updateFn={updateTarifInSheet}
        deleteFn={deleteTarifFromSheet}
        moduleLabel="Tarif SPP & Biaya"
        labelKey="Jenis"
        searchFn={(r, t) => String(r['Jenis'] ?? '').toLowerCase().includes(t) || String(r['Tahun Ajaran'] ?? '').toLowerCase().includes(t)}
        onChanged={refreshTarif}
        refreshSignal={refreshSignal}
        target="keuangan"
        headExtra={<button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Tambah Tarif</button>}
      />
      {modalOpen && (
        <Modal title="Tambah Tarif" subtitle="Data langsung tersimpan ke Google Sheets Keuangan." onClose={() => setModalOpen(false)}>
          <GenericManualForm
            fields={fields}
            emptyRow={emptyTarifRow}
            addFn={addTarifToSheet}
            onSaved={() => { refreshTarif(); setRefreshSignal(s => s + 1); setModalOpen(false); }}
            target="keuangan"
            bare
          />
        </Modal>
      )}
    </>
  );
}
