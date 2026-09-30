import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import DataTable from '../../components/common/DataTable';
import { useAppData } from '../../context/AppContext';
import { statusTagihan } from '../../db/tagihanHelpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { formatRupiah, parseTanggalFleksibel, formatTanggalTampil } from '../../db/helpers';
import { isConfigured } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';
import PemutihanModal from './PemutihanModal';
import InfoCard from '../../components/common/InfoCard';
import { IconUsers, IconFileText, IconAlertCircle } from '../../components/common/icons';

function hariTerlambat(jatuhTempo) {
  const d = parseTanggalFleksibel(jatuhTempo);
  if (!d) return 0;
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

const STATUS_FILTER_OPTIONS = ['Semua Siswa', 'Aktif', 'Lulus', 'Pindah', 'Berhenti'];

export default function RekapTunggakan() {
  const { allTagihan, tagihanTerbayar, siswa, tagihanSppLoaded, tagihanLainLoaded, beasiswaSiswa, beasiswaKategori } = useAppData();
  const [putihkanTarget, setPutihkanTarget] = useState(null);
  const [filterStatusSiswa, setFilterStatusSiswa] = useState('Semua Siswa');

  const siswaStatusByNisn = useMemo(() => {
    const map = {};
    siswa.forEach(s => { map[s.nisn] = s.status || 'Aktif'; });
    return map;
  }, [siswa]);

  const tunggakanSemua = useMemo(() => {
    const cutoffMs = Date.now();
    return allTagihan
      .map(t => {
        const terbayar = tagihanTerbayar(t.refType, t.no, t.nisn);
        const { nominalEfektif, potongan } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar);
        const sisa = nominalEfektif - terbayar;
        const terlambat = hariTerlambat(t.jatuhTempo);
        const statusSiswa = siswaStatusByNisn[t.nisn] || 'Aktif';
        return { ...t, nominalAsli: t.nominal, nominal: nominalEfektif, potonganBeasiswa: potongan, terbayar, sisa, terlambat, statusSiswa, status: statusTagihan(nominalEfektif, terbayar) };
      })
      .filter(t => t.sisa > 0 && t.terlambat > 0); // genuinely menunggak: sisa ada DAN sudah lewat jatuh tempo
  }, [allTagihan, tagihanTerbayar, siswaStatusByNisn, beasiswaSiswa, beasiswaKategori]);

  const tunggakan = useMemo(
    () => filterStatusSiswa === 'Semua Siswa' ? tunggakanSemua : tunggakanSemua.filter(t => t.statusSiswa === filterStatusSiswa),
    [tunggakanSemua, filterStatusSiswa]
  );

  const ringkasan = useMemo(() => {
    const siswaSet = new Set(tunggakan.map(t => t.nisn));
    const totalNominal = tunggakan.reduce((s, t) => s + t.sisa, 0);
    return { jumlahSiswa: siswaSet.size, jumlahTagihan: tunggakan.length, totalNominal };
  }, [tunggakan]);

  const dataSiap = tagihanSppLoaded || tagihanLainLoaded;

  const columns = [
    { key: 'namaSiswa', label: 'Nama Siswa', accessor: r => r.namaSiswa, sortable: true },
    { key: 'nisn', label: 'NISN', accessor: r => r.nisn },
    { key: 'statusSiswa', label: 'Status Siswa', render: r => r.statusSiswa !== 'Aktif' ? <span className="badge badge-muted">{r.statusSiswa}</span> : <span className="badge badge-green">Aktif</span> },
    { key: 'label', label: 'Jenis', accessor: r => r.label },
    { key: 'sisa', label: 'Sisa', render: r => <strong style={{ color: 'var(--red)' }}>{formatRupiah(r.sisa)}</strong>, sortable: true },
    { key: 'jatuhTempo', label: 'Jatuh Tempo', render: r => formatTanggalTampil(r.jatuhTempo), sortable: true },
    { key: 'terlambat', label: 'Terlambat', accessor: r => `${r.terlambat} hari`, sortable: true },
    {
      key: 'aksi', label: 'Aksi', headerClassName: 'no-print',
      render: r => (
        <div className="no-print">
          <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => setPutihkanTarget(r)}>Putihkan</button>
        </div>
      ),
    },
  ];

  function exportExcelTunggakan() {
    const headers = ['Nama Siswa', 'NISN', 'Status Siswa', 'Jenis', 'Sisa', 'Jatuh Tempo', 'Terlambat (hari)'];
    const rows = tunggakan.map(t => ({
      'Nama Siswa': t.namaSiswa, 'NISN': t.nisn, 'Status Siswa': t.statusSiswa, 'Jenis': t.label,
      'Sisa': t.sisa, 'Jatuh Tempo': formatTanggalTampil(t.jatuhTempo), 'Terlambat (hari)': t.terlambat,
    }));
    exportToExcel(headers, rows, 'Rekap Tunggakan', 'Rekap Tunggakan');
  }

  return (
    <Page pageId="tunggakan" title="Rekap Tunggakan" path="Keuangan / Rekap Tunggakan">
      {!isConfigured('keuangan') && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets Keuangan.
        </div></div>
      )}

      {dataSiap && (
        <div className="info-grid" style={{ marginBottom: 20 }}>
          <InfoCard icon={IconUsers} color="c-red" value={ringkasan.jumlahSiswa} label="Siswa Menunggak" />
          <InfoCard icon={IconFileText} color="c-gold" value={ringkasan.jumlahTagihan} label="Tagihan Menunggak" />
          <InfoCard icon={IconAlertCircle} color="c-red" value={formatRupiah(ringkasan.totalNominal)} label="Total Nominal Tunggakan" valueFontSize={19} />
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div><h3>📋 Daftar Tunggakan</h3><p>Tagihan yang sudah lewat jatuh tempo dan belum lunas.</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filterStatusSiswa} onChange={e => setFilterStatusSiswa(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
              {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-sm" onClick={exportExcelTunggakan} disabled={tunggakan.length === 0}>📊 Excel</button>
          </div>
        </div>
        <div className="card-body">
          {!dataSiap && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>}
          {dataSiap && tunggakanSemua.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Tidak ada tunggakan saat ini. 🎉</p>
          )}
          {dataSiap && tunggakanSemua.length > 0 && (
            <DataTable
              columns={columns}
              data={tunggakan}
              searchFn={(r, t) => (r.namaSiswa || '').toLowerCase().includes(t) || (r.nisn || '').includes(t) || (r.label || '').toLowerCase().includes(t)}
              emptyMessage="Tidak ada tunggakan yang cocok dengan filter/pencarian ini."
              rowKey={r => r.id}
              defaultSortKey="terlambat"
              defaultSortDir="desc"
            />
          )}
        </div>
      </div>

      {putihkanTarget && (
        <PemutihanModal tagihan={putihkanTarget} onClose={() => setPutihkanTarget(null)} />
      )}
    </Page>
  );
}
