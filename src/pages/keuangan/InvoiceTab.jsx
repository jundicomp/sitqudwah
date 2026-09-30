import { useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import { statusTagihan } from '../../db/tagihanHelpers';
import { formatTanggalTampil } from '../../db/helpers';
import { exportToExcel } from '../../utils/exportTable';
import { useAppData } from '../../context/AppContext';

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

const STATUS_BADGE = { 'Belum Lunas': 'badge-red', 'Sebagian': 'badge-gold' };
const STATUS_FILTER_OPTIONS = ['Semua Status', 'Belum Lunas', 'Sebagian'];

export default function InvoiceTab() {
  const { allTagihan, tagihanTerbayar, tagihanSppLoaded, tagihanLainLoaded } = useAppData();
  const [filterStatus, setFilterStatus] = useState('Semua Status');

  const belumLunasSemua = useMemo(() => {
    return allTagihan
      .map(t => {
        const terbayar = tagihanTerbayar(t.refType, t.no, t.nisn);
        const sisa = t.nominal - terbayar;
        return { ...t, terbayar, sisa, status: statusTagihan(t.nominal, terbayar) };
      })
      .filter(t => t.sisa > 0)
      .sort((a, b) => new Date(a.jatuhTempo) - new Date(b.jatuhTempo));
  }, [allTagihan, tagihanTerbayar]);

  const belumLunas = useMemo(
    () => filterStatus === 'Semua Status' ? belumLunasSemua : belumLunasSemua.filter(t => t.status === filterStatus),
    [belumLunasSemua, filterStatus]
  );

  const columns = [
    { key: 'namaSiswa', label: 'Nama Siswa', accessor: r => r.namaSiswa, sortable: true },
    { key: 'nisn', label: 'NISN', accessor: r => r.nisn },
    { key: 'label', label: 'Jenis', accessor: r => r.label },
    { key: 'nominal', label: 'Nominal', accessor: r => formatRupiah(r.nominal) },
    { key: 'sisa', label: 'Sisa', render: r => <strong>{formatRupiah(r.sisa)}</strong>, sortable: true },
    { key: 'jatuhTempo', label: 'Jatuh Tempo', render: r => formatTanggalTampil(r.jatuhTempo), sortable: true },
    { key: 'status', label: 'Status', render: r => <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span> },
  ];

  function exportExcelInvoice() {
    const headers = ['Nama Siswa', 'NISN', 'Jenis', 'Nominal', 'Sisa', 'Jatuh Tempo', 'Status'];
    const rows = belumLunas.map(t => ({
      'Nama Siswa': t.namaSiswa, 'NISN': t.nisn, 'Jenis': t.label,
      'Nominal': t.nominal, 'Sisa': t.sisa, 'Jatuh Tempo': formatTanggalTampil(t.jatuhTempo), 'Status': t.status,
    }));
    exportToExcel(headers, rows, 'Invoice Tagihan Belum Lunas', 'Invoice — Tagihan Belum Lunas');
  }

  const dataSiap = tagihanSppLoaded || tagihanLainLoaded;

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>📄 Invoice — Tagihan Belum Lunas</h3><p>Semua tagihan (SPP + biaya lain) yang masih ada sisa, diurutkan dari jatuh tempo terdekat.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-sm" onClick={exportExcelInvoice} disabled={belumLunas.length === 0}>📊 Excel</button>
        </div>
      </div>
      <div className="card-body">
        {!dataSiap && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>}
        {dataSiap && belumLunasSemua.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Tidak ada tagihan yang belum lunas. 🎉</p>
        )}
        {dataSiap && belumLunasSemua.length > 0 && (
          <DataTable
            columns={columns}
            data={belumLunas}
            searchFn={(r, t) => (r.namaSiswa || '').toLowerCase().includes(t) || (r.nisn || '').includes(t) || (r.label || '').toLowerCase().includes(t)}
            emptyMessage="Tidak ada tagihan yang cocok dengan filter/pencarian ini."
            rowKey={r => r.id}
            defaultSortKey="jatuhTempo"
          />
        )}
      </div>
    </div>
  );
}
