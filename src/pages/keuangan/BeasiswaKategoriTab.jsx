import { useState } from 'react';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import { BEASISWA_KATEGORI_FIELDS, BEASISWA_KATEGORI_HEADERS, emptyBeasiswaKategoriRow } from '../../db/beasiswaFields';
import { fetchBeasiswaKategoriFromSheet, addBeasiswaKategoriToSheet, updateBeasiswaKategoriInSheet, deleteBeasiswaKategoriFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

export default function BeasiswaKategoriTab() {
  const { refreshBeasiswaKategori } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <>
      <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          Kategori beasiswa (mis. Anak Yatim, Dhuafa, Anak Guru, Kebutuhan Khusus) menentukan berapa persen potongan
          otomatis diberikan saat SPP/Biaya Lain diterbitkan untuk siswa yang tercatat menerima kategori itu (lihat tab
          "Siswa Penerima"). Isi 100% pada Potongan SPP untuk kategori "gratis SPP penuh".
        </div>
      </div>
      <GenericStoredTable
        title="Kategori Beasiswa"
        subtitle="Daftar jenis beasiswa yang tersedia beserta besaran potongannya."
        headers={BEASISWA_KATEGORI_HEADERS}
        fields={BEASISWA_KATEGORI_FIELDS}
        fetchFn={fetchBeasiswaKategoriFromSheet}
        updateFn={updateBeasiswaKategoriInSheet}
        deleteFn={deleteBeasiswaKategoriFromSheet}
        moduleLabel="Kategori Beasiswa"
        labelKey="Nama Kategori"
        searchFn={(r, t) => String(r['Nama Kategori'] ?? '').toLowerCase().includes(t) || String(r['Keterangan'] ?? '').toLowerCase().includes(t)}
        onChanged={refreshBeasiswaKategori}
        refreshSignal={refreshSignal}
        target="keuangan"
        headExtra={<button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Baru</button>}
      />
      {modalOpen && (
        <Modal title="Tambah Kategori Beasiswa Baru" onClose={() => setModalOpen(false)}>
          <GenericManualForm
            fields={BEASISWA_KATEGORI_FIELDS}
            emptyRow={emptyBeasiswaKategoriRow}
            addFn={addBeasiswaKategoriToSheet}
            onSaved={() => { refreshBeasiswaKategori(); setRefreshSignal(s => s + 1); setModalOpen(false); }}
            title="Tambah Kategori Beasiswa Baru"
            subtitle="Data langsung tersimpan ke Google Sheets Keuangan."
            target="keuangan"
            bare
          />
        </Modal>
      )}
    </>
  );
}
