import { useMemo, useState } from 'react';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import { PEMASUKAN_LAIN_FIELDS, PEMASUKAN_LAIN_HEADERS, emptyPemasukanLainRow } from '../../db/pemasukanLainFields';
import { akunAktivaOptions } from '../../db/akunBukuBesarFields';
import { fetchPemasukanLainFromSheet, addPemasukanLainToSheet, updatePemasukanLainInSheet, deletePemasukanLainFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

export default function PemasukanLainTab() {
  const { refreshPemasukanLain, akun } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const fieldsDenganAkun = useMemo(() => [
    ...PEMASUKAN_LAIN_FIELDS,
    { key: 'Akun', label: 'Akun Kas/Bank Penerima', type: 'select', options: akunAktivaOptions(akun), required: true },
  ], [akun]);

  return (
    <>
      <GenericStoredTable
        title="Pemasukan Lain"
        subtitle="Sumber pemasukan sekolah di luar SPP dan biaya siswa -- donasi, bantuan pemerintah, sewa aset, dst."
        headers={PEMASUKAN_LAIN_HEADERS}
        fields={fieldsDenganAkun}
        fetchFn={fetchPemasukanLainFromSheet}
        updateFn={updatePemasukanLainInSheet}
        deleteFn={deletePemasukanLainFromSheet}
        moduleLabel="Pemasukan Lain"
        labelKey="Keterangan"
        searchFn={(r, t) => String(r['Keterangan'] ?? '').toLowerCase().includes(t) || String(r['Kategori'] ?? '').toLowerCase().includes(t)}
        onChanged={refreshPemasukanLain}
        refreshSignal={refreshSignal}
        target="keuangan"
        headExtra={<button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Baru</button>}
      />
      {modalOpen && (
        <Modal title="Catat Pemasukan Lain Baru" onClose={() => setModalOpen(false)}>
          <GenericManualForm
            fields={fieldsDenganAkun}
            emptyRow={emptyPemasukanLainRow}
            addFn={addPemasukanLainToSheet}
            onSaved={() => { refreshPemasukanLain(); setRefreshSignal(s => s + 1); setModalOpen(false); }}
            title="Catat Pemasukan Lain Baru"
            subtitle="Data langsung tersimpan ke Google Sheets Keuangan."
            target="keuangan"
            bare
          />
        </Modal>
      )}
    </>
  );
}
