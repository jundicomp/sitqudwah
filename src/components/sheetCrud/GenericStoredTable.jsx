import { useEffect, useState, useCallback, useId } from 'react';
import DataTable from '../common/DataTable';
import PasswordConfirmModal from '../common/PasswordConfirmModal';
import GenericEditModal from './GenericEditModal';
import { addLogEntry, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel, printElementById } from '../../utils/exportTable';

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

export default function GenericStoredTable({
  title, subtitle, headers, fields, fetchFn, updateFn, deleteFn,
  moduleLabel, labelKey, searchFn, onChanged, extraActions, refreshSignal, target = 'master',
  columnRenderers, headExtra,
}) {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [printingAll, setPrintingAll] = useState(false);
  const printId = 'print-' + useId().replace(/:/g, '');

  function handlePrint() {
    // Nyalakan forceShowAll dulu (lewati paginasi), TUNGGU React selesai render ulang
    // dgn semua baris, baru panggil print -- kalau langsung print, yg tercetak cuma
    // halaman yg sedang tampil di layar.
    setPrintingAll(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printElementById(printId);
        setPrintingAll(false);
      });
    });
  }

  const load = useCallback(async () => {
    if (!isConfigured(target)) return;
    setLoading(true);
    try {
      const data = await fetchFn();
      setRows(data);
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, fetchFn]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  async function doDelete() {
    try {
      await deleteFn(deleteRow['No']);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Hapus Data',
        modul: moduleLabel,
        detail: `Menghapus data "${deleteRow[labelKey]}" (No. ${deleteRow['No']})`,
      });
      toast('Data berhasil dihapus.');
      setDeleteRow(null);
      load();
      onChanged && onChanged();
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }

  const columns = [
    ...headers.filter(h => h !== 'No').map(h => (
      columnRenderers && columnRenderers[h]
        ? { key: h, label: h, render: columnRenderers[h] }
        : { key: h, label: h, accessor: (r) => r[h] }
    )),
    {
      key: 'aksi',
      label: 'Aksi',
      headerClassName: 'no-print',
      render: (r) => (
        <div className="no-print" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {extraActions && extraActions(r)}
          <button className="btn-icon" title="Edit" onClick={() => setEditRow(r)}>{ICON_EDIT}</button>
          <button className="btn-icon danger" title="Hapus" onClick={() => setDeleteRow(r)}>{ICON_DELETE}</button>
        </div>
      ),
    },
  ];

  const exportHeaders = headers.filter(h => h !== 'No');

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>{title}</h3><p>{subtitle}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {headExtra}
          <button className="btn btn-sm" onClick={() => exportToExcel(exportHeaders, rows, moduleLabel, moduleLabel)} disabled={rows.length === 0}>📊 Excel</button>
          <button className="btn btn-sm" onClick={handlePrint} disabled={rows.length === 0}>🖨️ PDF</button>
          <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat...' : '↻ Muat Ulang'}</button>
        </div>
      </div>
      <div className="card-body" id={printId}>
        {!isConfigured(target) && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Atur koneksi Google Sheets dulu untuk melihat data.</p>}
        {isConfigured(target) && loaded && (
          <DataTable
            columns={columns}
            data={rows}
            searchFn={searchFn}
            emptyMessage="Belum ada data tersimpan."
            rowKey={(r, i) => r['No'] ?? i}
            forceShowAll={printingAll}
          />
        )}
      </div>

      {editRow && (
        <GenericEditModal
          row={editRow}
          fields={fields}
          updateFn={updateFn}
          moduleLabel={moduleLabel}
          labelKey={labelKey}
          onClose={() => setEditRow(null)}
          onSaved={() => { load(); onChanged && onChanged(); }}
        />
      )}

      {deleteRow && (
        <PasswordConfirmModal
          title="Konfirmasi Hapus Data"
          message={`Anda akan menghapus data "${deleteRow[labelKey]}". Tindakan ini tidak bisa dibatalkan.`}
          danger
          onConfirm={doDelete}
          onClose={() => setDeleteRow(null)}
        />
      )}
    </div>
  );
}
