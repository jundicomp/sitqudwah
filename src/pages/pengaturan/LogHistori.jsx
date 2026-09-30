import { useEffect, useState, useCallback } from 'react';
import Page from '../../components/layout/Page';
import DataTable from '../../components/common/DataTable';
import { fetchLogFromSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

export default function LogHistori() {
  const { toast } = useAppData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured()) return;
    setLoading(true);
    try {
      const data = await fetchLogFromSheet();
      setRows(data.slice().reverse()); // terbaru dulu
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'Waktu', label: 'Waktu', accessor: r => r['Waktu'] },
    { key: 'Nama User', label: 'Dilakukan Oleh', accessor: r => `${r['Nama User']} (${r['Username']})` },
    { key: 'Aksi', label: 'Aksi', accessor: r => r['Aksi'] },
    { key: 'Modul', label: 'Modul', accessor: r => r['Modul'] },
    { key: 'Detail', label: 'Detail', accessor: r => r['Detail'] },
  ];

  return (
    <Page pageId="log-histori" title="Log Histori" path="Pengaturan / System / Log Histori">
      <div className="card">
        <div className="card-head">
          <div><h3>📜 Log Histori Aktivitas</h3><p>Semua tindakan edit/hapus data dari seluruh user tercatat di sini.</p></div>
          <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat...' : '↻ Muat Ulang'}</button>
        </div>
        <div className="card-body">
          {!isConfigured() && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Belum tersambung ke Google Sheets.</p>}
          {isConfigured() && loaded && (
            <DataTable
              columns={columns}
              data={rows}
              searchFn={(r, t) => String(r['Nama User'] ?? '').toLowerCase().includes(t) || String(r['Modul'] ?? '').toLowerCase().includes(t) || String(r['Aksi'] ?? '').toLowerCase().includes(t)}
              emptyMessage="Belum ada aktivitas tercatat."
              rowKey={(r, i) => r['No'] ?? i}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
