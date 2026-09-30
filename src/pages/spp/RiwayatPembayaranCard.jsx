import { useId, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import KwitansiModal from '../keuangan/KwitansiModal';
import GenericEditModal from '../../components/sheetCrud/GenericEditModal';
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { buildPembayaranEditFields } from '../../db/pembayaranFields';
import { akunAktivaOptions } from '../../db/akunBukuBesarFields';
import { updatePembayaranInSheet, deletePembayaranFromSheet, addLogEntry } from '../../services/googleSheets';
import { formatRupiah, formatTanggalTampil, normalisasiTanggalUntukInput, todayWIB } from '../../db/helpers';
import { exportToExcel, printElementById } from '../../utils/exportTable';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 'Semua'];

// Label "Tanggal: ..." dipakai baik di judul cetak PDF maupun subjudul Excel --
// 1 fungsi supaya keduanya SELALU konsisten kalau logikanya berubah nanti.
function labelRentangTanggal(dari, sampai) {
  if (!dari && !sampai) return 'Semua Tanggal';
  if (dari && sampai && dari === sampai) return formatTanggalTampil(dari);
  if (dari && !sampai) return `Sejak ${formatTanggalTampil(dari)}`;
  if (!dari && sampai) return `Sampai ${formatTanggalTampil(sampai)}`;
  return `${formatTanggalTampil(dari)} s/d ${formatTanggalTampil(sampai)}`;
}

// Sejak v1.31.16: dulu bagian bawah PembayaranTab.jsx, terikat pada siswa yg
// SEDANG dicari di form Catat Pembayaran (yg sekarang jadi modal terpisah --
// lihat CatatPembayaranModal.jsx). Dipisah jadi komponennya sendiri & TIDAK
// lagi terikat 1 siswa -- selalu tampilkan SEMUA transaksi (bisa difilter
// tanggal), supaya juga sekaligus menggantikan tabel "Kemarin" yang dulu ada
// di widget Pembayaran Hari Ini (isinya hampir sama, tidak perlu 2 tabel).
// Diedit/dihapus HANYA lewat objek "raw row" bergaya kolom Sheet asli (No, Nominal,
// 'Tanggal Bayar', dst) -- `pembayaran` di context sudah dinormalisasi camelCase
// (lihat normalizeSheetPembayaran), jadi harus dibentuk ulang dulu supaya cocok dgn
// GenericEditModal (yg genuinely bekerja di atas format Sheet mentah).
function keRawRow(p) {
  return {
    No: p.no, RefType: p.refType, RefNo: p.refNo, NISN: p.nisn, 'Nama Siswa': p.namaSiswa,
    Jenis: p.jenis, Nominal: p.nominal, 'Tanggal Bayar': p.tanggalBayar, Metode: p.metode,
    Keterangan: p.keterangan, Akun: p.akun,
  };
}

export default function RiwayatPembayaranCard() {
  const { pembayaran, pembayaranLoading, pembayaranLoaded, refreshPembayaran, profilSekolah, akun, toast } = useAppData();
  const { currentUser } = useAuth();
  // MASTER_ADMIN ikut ke-cover krn role-nya juga literal 'Admin' (lihat masterAdmin.js).
  const isAdmin = currentUser?.role === 'Admin';
  const [lihatKwitansi, setLihatKwitansi] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [dariTanggal, setDariTanggal] = useState('');
  const [sampaiTanggal, setSampaiTanggal] = useState('');
  const [printingAll, setPrintingAll] = useState(false);
  const printId = 'print-' + useId().replace(/:/g, '');
  const namaSekolah = profilSekolah?.nama || 'MI Ikhlasiyah';
  const akunOptions = useMemo(() => akunAktivaOptions(akun), [akun]);
  const pembayaranEditFields = useMemo(() => buildPembayaranEditFields(akunOptions), [akunOptions]);

  async function doDeletePembayaran() {
    try {
      await deletePembayaranFromSheet(deleteRow.no);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Hapus Data',
        modul: 'Pembayaran & Invoice',
        detail: `Menghapus pembayaran "${deleteRow.jenis}" - ${deleteRow.nisn} ${deleteRow.namaSiswa} - ${formatRupiah(deleteRow.nominal)}`,
      });
      toast('Data pembayaran berhasil dihapus.');
      setDeleteRow(null);
      refreshPembayaran();
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }

  const semuaRiwayat = useMemo(() => pembayaran.slice().reverse(), [pembayaran]);

  // Filter tanggal (Dari/Sampai) -- dibandingkan dlm bentuk "yyyy-MM-dd" yg dinormalisasi
  // (bukan string mentah apa adanya), supaya baris data lama yg formatnya "kotor"
  // (ISO+jam, atau dd/mm/yyyy) tetap ke-filter dgn benar, bukan cuma dibandingkan
  // sbg teks apa adanya.
  const riwayatTerfilter = useMemo(() => {
    if (!dariTanggal && !sampaiTanggal) return semuaRiwayat;
    return semuaRiwayat.filter(p => {
      const t = normalisasiTanggalUntukInput(p.tanggalBayar);
      if (!t) return false;
      if (dariTanggal && t < dariTanggal) return false;
      if (sampaiTanggal && t > sampaiTanggal) return false;
      return true;
    });
  }, [semuaRiwayat, dariTanggal, sampaiTanggal]);

  const totalNominalTerfilter = useMemo(() => riwayatTerfilter.reduce((s, p) => s + p.nominal, 0), [riwayatTerfilter]);

  function resetFilterTanggal() {
    setDariTanggal('');
    setSampaiTanggal('');
  }
  function filterHariIni() {
    const t = todayWIB();
    setDariTanggal(t);
    setSampaiTanggal(t);
  }
  function filterKemarin() {
    const [y, m, d] = todayWIB().split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1));
    const kemarin = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    setDariTanggal(kemarin);
    setSampaiTanggal(kemarin);
  }

  function handlePrint() {
    setPrintingAll(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printElementById(printId);
        setPrintingAll(false);
      });
    });
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Riwayat Pembayaran</h3><p>{pembayaranLoading ? 'Memuat...' : `${riwayatTerfilter.length} transaksi`}</p></div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => exportToExcel(
            ['Tanggal', 'Nama Siswa', 'Jenis', 'Nominal', 'Metode'],
            riwayatTerfilter.map(p => ({ 'Tanggal': formatTanggalTampil(p.tanggalBayar), 'Nama Siswa': p.namaSiswa, 'Jenis': p.jenis, 'Nominal': p.nominal, 'Metode': p.metode })),
            'Riwayat Pembayaran',
            [namaSekolah, 'Laporan Pembayaran', `Tanggal: ${labelRentangTanggal(dariTanggal, sampaiTanggal)}`],
            { Nominal: totalNominalTerfilter }
          )} disabled={riwayatTerfilter.length === 0}>📊 Excel</button>
          <button className="btn btn-sm" onClick={handlePrint} disabled={riwayatTerfilter.length === 0}>🖨️ PDF</button>
          <button className="btn btn-sm" onClick={refreshPembayaran} disabled={pembayaranLoading}>↻ Muat Ulang</button>
        </div>
      </div>
      <div className="card-body">
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 16, padding: '12px 14px', background: '#F6F8F5', borderRadius: 8 }}>
          <div className="field">
            <label>Dari Tanggal</label>
            <input type="date" value={dariTanggal} onChange={e => setDariTanggal(e.target.value)} />
          </div>
          <div className="field">
            <label>Sampai Tanggal</label>
            <input type="date" value={sampaiTanggal} onChange={e => setSampaiTanggal(e.target.value)} />
          </div>
          <button type="button" className="btn btn-sm" onClick={filterHariIni}>Hari Ini</button>
          <button type="button" className="btn btn-sm" onClick={filterKemarin}>Kemarin</button>
          {(dariTanggal || sampaiTanggal) && <button type="button" className="btn btn-sm" onClick={resetFilterTanggal}>✕ Reset Tanggal</button>}
        </div>

        {pembayaranLoaded && riwayatTerfilter.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{semuaRiwayat.length === 0 ? 'Belum ada pembayaran tercatat.' : 'Tidak ada transaksi pada rentang tanggal ini.'}</p>}
        {riwayatTerfilter.length > 0 && (
          <div id={printId}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>{namaSekolah}</h2>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Laporan Pembayaran</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Tanggal: {labelRentangTanggal(dariTanggal, sampaiTanggal)}</div>
            </div>
            <DataTable
              columns={[
                { key: 'tanggalBayar', label: 'Tanggal', render: r => formatTanggalTampil(r.tanggalBayar), sortable: true },
                { key: 'namaSiswa', label: 'Nama Siswa', accessor: r => r.namaSiswa, sortable: true },
                { key: 'jenis', label: 'Jenis', accessor: r => r.jenis },
                { key: 'nominal', label: 'Nominal', accessor: r => r.nominal, render: r => formatRupiah(r.nominal), sortable: true },
                { key: 'metode', label: 'Metode', accessor: r => r.metode },
                {
                  key: 'aksi', label: 'Aksi', headerClassName: 'no-print', render: r => (
                    <div className="no-print" style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => setLihatKwitansi(r)}>🧾 Kwitansi</button>
                      {isAdmin && <button className="btn-icon" title="Edit Pembayaran" onClick={() => setEditRow(r)}>✏️</button>}
                      {isAdmin && <button className="btn-icon danger" title="Hapus Pembayaran" onClick={() => setDeleteRow(r)}>🗑️</button>}
                    </div>
                  ),
                },
              ]}
              data={riwayatTerfilter}
              searchFn={(r, t) => (r.namaSiswa || '').toLowerCase().includes(t) || (r.jenis || '').toLowerCase().includes(t) || (r.metode || '').toLowerCase().includes(t)}
              emptyMessage="Tidak ada transaksi yang cocok dengan pencarian ini."
              rowKey={r => r.id}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              forceShowAll={printingAll}
              footer={(rows) => (
                <tr style={{ fontWeight: 700, background: '#F6F8F5' }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>Total ({rows.length} transaksi)</td>
                  <td>{formatRupiah(rows.reduce((s, r) => s + r.nominal, 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            />
          </div>
        )}
      </div>

      {lihatKwitansi && <KwitansiModal pembayaran={lihatKwitansi} onClose={() => setLihatKwitansi(null)} />}

      {editRow && (
        <GenericEditModal
          row={keRawRow(editRow)}
          fields={pembayaranEditFields}
          updateFn={updatePembayaranInSheet}
          moduleLabel="Pembayaran & Invoice"
          labelKey="Jenis"
          onClose={() => setEditRow(null)}
          onSaved={refreshPembayaran}
        />
      )}

      {deleteRow && (
        <PasswordConfirmModal
          title="Konfirmasi Hapus Pembayaran"
          message={`Anda akan menghapus catatan pembayaran "${deleteRow.jenis}" (${formatRupiah(deleteRow.nominal)}) milik ${deleteRow.namaSiswa}. Tindakan ini tidak bisa dibatalkan -- sisa tagihan siswa ini akan otomatis kembali bertambah.`}
          danger
          onConfirm={doDeletePembayaran}
          onClose={() => setDeleteRow(null)}
        />
      )}
    </div>
  );
}
