import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { ASET_FIELDS, ASET_HEADERS, emptyAsetRow, hitungBreakdownAset } from '../../db/asetFields';
import { fetchAsetFromSheet, addAsetToSheet, updateAsetInSheet, deleteAsetFromSheet } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import AsetViewModal from './AsetViewModal';
import InfoCard from '../../components/common/InfoCard';
import { IconLayers, IconBox, IconCheckCircle, IconAlertTriangle, IconXCircle, IconMoney } from '../../components/common/icons';
import { formatRupiah } from '../../db/helpers';

// Header tabel + export -- "Total" disisipkan sesudah Rusak Berat, TAPI itu bukan
// kolom asli di Sheets (tidak ada di Code.gs) -- nilainya dihitung otomatis lewat
// fetchFnDenganTotal di bawah, supaya tetap konsisten baik di tabel maupun Excel.
const HEADERS_TAMPIL = [...ASET_HEADERS.slice(0, 8), 'Total', ...ASET_HEADERS.slice(8)];

export default function DataAset() {
  const { aset, refreshAset } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('aset', ['tabel', 'manual']);
  const [lihatAset, setLihatAset] = useState(null);

  const ringkasan = useMemo(() => {
    const totalUnit = aset.reduce((s, a) => s + a.total, 0);
    const totalBaik = aset.reduce((s, a) => s + a.baik, 0);
    const totalRR = aset.reduce((s, a) => s + a.rusakRingan, 0);
    const totalRB = aset.reduce((s, a) => s + a.rusakBerat, 0);
    const totalNilai = aset.reduce((s, a) => s + a.nilaiTotal, 0);
    return { totalJenis: aset.length, totalUnit, totalBaik, totalRR, totalRB, totalNilai };
  }, [aset]);

  // Sisipkan Baik/RR/RB/Total yg SUDAH benar (termasuk pemetaan data lama Kondisi+
  // Jumlah) ke tiap baris SEBELUM masuk ke tabel/export -- pakai fungsi yg SAMA
  // dgn yg dipakai kartu ringkasan (hitungBreakdownAset), supaya keduanya selalu
  // konsisten. Kalau baris lama nanti diedit, nilai yg sudah terpetakan ini otomatis
  // "bermigrasi" ke kolom baru begitu disimpan ulang.
  const fetchFnDenganTotal = useCallback(async () => {
    const rows = await fetchAsetFromSheet();
    return rows.map(r => {
      const { baik, rusakRingan, rusakBerat, total } = hitungBreakdownAset(r);
      return { ...r, Baik: baik, 'Rusak Ringan': rusakRingan, 'Rusak Berat': rusakBerat, Total: total };
    });
  }, []);

  return (
    <Page pageId="aset" title="Data Aset & Inventaris" path="Sarpras / Data Aset & Inventaris">
      {aset.length > 0 && (
        <div className="info-grid" style={{ marginBottom: 20 }}>
          <InfoCard icon={IconLayers} color="c-purple" value={ringkasan.totalJenis} label="Jenis Aset Terdaftar" />
          <InfoCard icon={IconBox} color="c-blue" value={ringkasan.totalUnit} label="Total Unit" />
          <InfoCard icon={IconCheckCircle} color="c-green" value={ringkasan.totalBaik} label="Unit Baik" />
          <InfoCard icon={IconAlertTriangle} color="c-gold" value={ringkasan.totalRR} label="Unit Rusak Ringan" />
          <InfoCard icon={IconXCircle} color="c-red" value={ringkasan.totalRB} label="Unit Rusak Berat" />
          <InfoCard icon={IconMoney} color="c-purple" value={formatRupiah(ringkasan.totalNilai)} label="Total Nilai Estimasi Sarpras" valueFontSize={17} />
        </div>
      )}

      <div className="card">
        <div className="seg-tabs">
          {bolehTab('tabel') && <button className={`seg-tab ${tab === 'tabel' ? 'active' : ''}`} onClick={() => setTab('tabel')}>📋 DATA ASET (TABEL)</button>}
          {bolehTab('manual') && <button className={`seg-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>📝 TAMBAH MANUAL</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data Aset & Inventaris (Tabel)"
              subtitle="Diambil langsung dari Google Sheets — bisa diubah atau dihapus dari sini."
              headers={HEADERS_TAMPIL}
              fields={ASET_FIELDS}
              fetchFn={fetchFnDenganTotal}
              updateFn={updateAsetInSheet}
              deleteFn={deleteAsetFromSheet}
              moduleLabel="Data Aset & Inventaris"
              labelKey="Nama Aset"
              searchFn={(r, t) => String(r['Nama Aset'] ?? '').toLowerCase().includes(t) || String(r['Lokasi'] ?? '').toLowerCase().includes(t) || String(r['Kategori'] ?? '').toLowerCase().includes(t) || String(r['Kode'] ?? '').toLowerCase().includes(t)}
              onChanged={refreshAset}
              extraActions={(r) => (
                <button className="btn-icon" title="Lihat" onClick={() => setLihatAset(r)}>👁</button>
              )}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={ASET_FIELDS}
              emptyRow={emptyAsetRow}
              addFn={addAsetToSheet}
              onSaved={refreshAset}
              title="Tambah Aset"
              subtitle="Data langsung tersimpan ke baris baru di Google Sheets."
            />
          )}
        </div>
      </div>

      {lihatAset && <AsetViewModal row={lihatAset} onClose={() => setLihatAset(null)} />}
    </Page>
  );
}
