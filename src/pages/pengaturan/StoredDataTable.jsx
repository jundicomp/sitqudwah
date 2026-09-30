import { useEffect, useState, useCallback, useId } from 'react';
import DataTable from '../../components/common/DataTable';
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal';
import { SISWA_HEADERS } from '../../db/siswaFields';
import { fetchSiswaFromSheet, deleteSiswaFromSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel, printElementById } from '../../utils/exportTable';
import { formatTanggalAngka } from '../../db/helpers';
import EditSiswaModal from './EditSiswaModal';
import ManualForm from './ManualForm';
import ExcelUpload from './ExcelUpload';

const ICON_EDIT = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const ICON_DELETE = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" />
  </svg>
);

export default function StoredDataTable({ refreshKey }) {
  const { toast, refreshSiswa } = useAppData();
  const { currentUser, canAccess } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [printingAll, setPrintingAll] = useState(false);
  // Sejak v1.31.30: form "Tambah Siswa" dan "Upload Excel" pindah ke sini sbg
  // modal (tombol di card-head) -- dulu tab terpisah di menu Data Siswa. Izin
  // Hak Akses lama ('siswa.manual' / 'siswa.excel') tetap dipakai utk sembunyikan
  // tombolnya, supaya granularitas hak akses yg sudah diatur Admin tidak hilang.
  const [showTambah, setShowTambah] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const printId = 'print-' + useId().replace(/:/g, '');

  const load = useCallback(async () => {
    if (!isConfigured()) return;
    setLoading(true);
    try {
      const data = await fetchSiswaFromSheet();
      setRows(data);
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load, refreshKey]);

  function handlePrint() {
    setPrintingAll(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printElementById(printId);
        setPrintingAll(false);
      });
    });
  }

  async function doDelete() {
    try {
      await deleteSiswaFromSheet(deleteRow['No']);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Hapus Data',
        modul: 'Data Siswa',
        detail: `Menghapus data siswa "${deleteRow['Nama Lengkap']}" (No. ${deleteRow['No']})`,
      });
      toast('Data siswa berhasil dihapus.');
      setDeleteRow(null);
      load();
      refreshSiswa();
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }

  const columns = [
    ...SISWA_HEADERS.filter(h => h !== 'No').map(h => ({
      key: h, label: h,
      accessor: (r) => h === 'Tanggal Lahir' ? formatTanggalAngka(r[h]) : r[h],
    })),
    {
      key: 'aksi',
      label: 'Aksi',
      headerClassName: 'no-print',
      render: (r) => (
        <div className="no-print" style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" title="Edit" onClick={() => setEditRow(r)}>{ICON_EDIT}</button>
          <button className="btn-icon danger" title="Hapus" onClick={() => setDeleteRow(r)}>{ICON_DELETE}</button>
        </div>
      ),
    },
  ];

  const exportHeaders = SISWA_HEADERS.filter(h => h !== 'No');

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Data Siswa (Tabel)</h3><p>Diambil langsung dari Google Sheets — bisa diubah atau dihapus dari sini.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canAccess('siswa', 'manual') && <button className="btn btn-sm btn-primary" onClick={() => setShowTambah(true)}>+ Tambah Siswa</button>}
          {canAccess('siswa', 'excel') && <button className="btn btn-sm" onClick={() => setShowUpload(true)}>📊 Upload Excel</button>}
          <button className="btn btn-sm" onClick={() => exportToExcel(exportHeaders, rows, 'Data Siswa', 'Data Siswa - MI Ikhlasiyah')} disabled={rows.length === 0}>📊 Excel</button>
          <button className="btn btn-sm" onClick={handlePrint} disabled={rows.length === 0}>🖨️ PDF</button>
          <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat...' : '↻ Muat Ulang'}</button>
        </div>
      </div>
      <div className="card-body" id={printId}>
        {!isConfigured() && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Atur koneksi Google Sheets dulu untuk melihat data.</p>}
        {isConfigured() && loaded && (
          <DataTable
            columns={columns}
            data={rows}
            searchFn={(r, t) => String(r['Nama Lengkap'] ?? '').toLowerCase().includes(t) || String(r['NISN'] ?? '').includes(t)}
            emptyMessage="Belum ada data siswa di Sheet."
            rowKey={(r, i) => r['No'] ?? i}
            forceShowAll={printingAll}
          />
        )}
      </div>

      {editRow && (
        <EditSiswaModal row={editRow} onClose={() => setEditRow(null)} onSaved={load} />
      )}

      {deleteRow && (
        <PasswordConfirmModal
          title="Konfirmasi Hapus Data"
          message={`Anda akan menghapus data siswa "${deleteRow['Nama Lengkap']}". Tindakan ini tidak bisa dibatalkan.`}
          danger
          onConfirm={doDelete}
          onClose={() => setDeleteRow(null)}
        />
      )}

      {showTambah && (
        <ManualForm onClose={() => setShowTambah(false)} onSaved={() => { load(); refreshSiswa(); }} />
      )}

      {showUpload && (
        <ExcelUpload onClose={() => setShowUpload(false)} onSaved={() => { load(); refreshSiswa(); }} />
      )}
    </div>
  );
}
