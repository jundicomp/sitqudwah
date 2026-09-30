import { useCallback, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal';
import EditSiswaModal from '../pengaturan/EditSiswaModal';
import { SISWA_FIELDS } from '../../db/siswaFields';
import { fetchSiswaFromSheet, deleteSiswaFromSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatTanggalAngka } from '../../db/helpers';

const ICON_VIEW = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
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

// Modal "Lihat" -- read-only, cuma menampilkan apa adanya (tanpa bisa diubah), supaya
// admin bisa bandingkan detail lengkap antar baris yg NISN-nya kembar SEBELUM memutuskan
// mau Edit yang mana atau Hapus yang mana. Ikut sertakan "Rombel" walau bukan bagian
// SISWA_FIELDS (field itu diisi lewat menu terpisah Data Kelas & Rombel).
function LihatSiswaModal({ row, onClose }) {
  const semuaField = [
    { label: 'No', value: row['No'] },
    ...SISWA_FIELDS.map(f => ({ label: f.label, value: f.key === 'Tanggal Lahir' ? formatTanggalAngka(row[f.key]) : row[f.key] })),
    { label: 'Rombel', value: row['Rombel'] },
  ];
  return (
    <Modal title="Lihat Detail Siswa" subtitle={`No. ${row['No']}`} onClose={onClose} actions={<button className="btn" onClick={onClose}>Tutup</button>}>
      <div className="form-grid">
        {semuaField.map(f => (
          <div key={f.label} className="field">
            <label>{f.label}</label>
            <div style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13.5, background: '#F6F8F5', minHeight: 20 }}>
              {f.value || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>-</span>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// Isi tab "Cek NISN Kembar" di dalam halaman "Cek Data dan Sistem" -- beda dari tab
// "Cek Data NISN" (yg cuma cek NISN KOSONG), tab ini cek arah SEBALIKNYA: NISN yang
// justru TERISI tapi kepakai di LEBIH DARI 1 siswa sekaligus. Kasus nyata yg memicu
// fitur ini: 3 baris "siswa" beda (No berbeda) tapi NISN & Nama-nya identik persis
// (mis. akibat baris rusak/kegeser kolom saat import Excel, atau kode NISN sementara
// dari "Isi NISN Massal" yg kebetulan/keliru terpakai ulang) -- kalau dibiarkan,
// tagihan/pembayaran (yg dicocokkan HANYA lewat NISN) bisa salah nyantol ke siswa yg
// salah, atau tidak bisa dipastikan itu punya siswa yang mana.
export default function CekDataNisnKembarTab() {
  const { toast, refreshSiswa, allTagihan, pembayaran } = useAppData();
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sudahDicek, setSudahDicek] = useState(false);
  const [lihatRow, setLihatRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const load = useCallback(async () => {
    if (!isConfigured()) return;
    setLoading(true);
    try {
      const data = await fetchSiswaFromSheet();
      setRows(data);
      setSudahDicek(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Kelompokkan baris Data Siswa berdasar NISN (yg TERISI saja -- NISN kosong itu
  // urusan tab "Cek Data NISN", bukan di sini), lalu ambil kelompok yg anggotanya
  // LEBIH DARI 1 baris. Sekalian hitung berapa tagihan/pembayaran yg tercatat di NISN
  // itu -- HANYA sbg peringatan (agregat per-NISN), bukan per-baris, karena selama
  // NISN-nya masih kembar, sistem sendiri tidak bisa memastikan tagihan itu benar2
  // milik baris yang mana.
  const kelompokKembar = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const nisn = String(r['NISN'] ?? '').trim();
      if (!nisn) return;
      if (!map.has(nisn)) map.set(nisn, []);
      map.get(nisn).push(r);
    });
    return Array.from(map.entries())
      .filter(([, list]) => list.length > 1)
      .map(([nisn, list]) => ({
        nisn,
        list: list.slice().sort((a, b) => Number(a['No']) - Number(b['No'])),
        jumlahTagihan: allTagihan.filter(t => t.nisn === nisn).length,
        jumlahPembayaran: pembayaran.filter(p => p.nisn === nisn).length,
      }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [rows, allTagihan, pembayaran]);

  const totalSiswaTerdampak = kelompokKembar.reduce((s, g) => s + g.list.length, 0);

  async function doDelete() {
    try {
      await deleteSiswaFromSheet(deleteRow['No']);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Hapus Data',
        modul: 'Cek Data dan Sistem',
        detail: `Menghapus data siswa duplikat (NISN kembar "${deleteRow['NISN']}") -- "${deleteRow['Nama Lengkap']}" (No. ${deleteRow['No']})`,
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

  return (
    <div>
      <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          ⚠️ Alat ini memindai <strong>Data Siswa</strong> untuk mencari NISN yang justru <strong>terpakai di lebih
          dari 1 siswa sekaligus</strong> (idealnya 1 NISN cuma milik 1 siswa). NISN kembar berisiko bikin
          tagihan/pembayaran salah nyantol, karena sistem mencocokkan data lewat NISN. Cek satu per satu, lalu
          pilih tindakan yang sesuai kondisi aslinya: 👁️ <strong>Lihat</strong> detail lengkap utk bandingkan,
          ✏️ <strong>Edit</strong> kalau ada yang cuma salah ketik/perlu dibetulkan, atau 🗑️ <strong>Hapus</strong>{' '}
          kalau memang baris duplikat/salah input.
        </div>
      </div>

      {!sudahDicek && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 28 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Klik tombol di bawah untuk memindai seluruh Data Siswa dan mencari NISN yang kembar.
            </p>
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Memindai...' : '🔍 Cek NISN Kembar Sekarang'}
            </button>
          </div>
        </div>
      )}

      {sudahDicek && (
        <>
          <div className="card-head" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3>{kelompokKembar.length} NISN Kembar Ditemukan</h3>
              <p>{totalSiswaTerdampak} baris data siswa terdampak, dari {rows.length} baris Data Siswa diperiksa.</p>
            </div>
            <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat...' : '↻ Muat Ulang'}</button>
          </div>

          {kelompokKembar.length === 0 && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
              ✅ Tidak ada NISN yang kembar/dobel. Semua NISN yang terisi sudah unik per siswa.
            </div></div>
          )}

          {kelompokKembar.map(g => (
            <div className="card" key={g.nisn} style={{ marginBottom: 16, borderColor: 'var(--red)' }}>
              <div className="card-head">
                <div>
                  <h3>NISN {g.nisn} — dipakai {g.list.length} siswa</h3>
                  <p>
                    {(g.jumlahTagihan > 0 || g.jumlahPembayaran > 0)
                      ? `⚠️ Ada ${g.jumlahTagihan} tagihan & ${g.jumlahPembayaran} pembayaran tercatat di NISN ini -- TIDAK bisa dipastikan milik baris yang mana selama NISN-nya masih kembar. Cek manual dulu (mis. lewat Nama/Kelas/Rombel) sebelum menghapus baris manapun.`
                      : 'Belum ada tagihan/pembayaran tercatat di NISN ini -- relatif lebih aman untuk langsung dibetulkan/dihapus.'}
                  </p>
                </div>
              </div>
              <div className="card-body table-scroll">
                <table>
                  <thead><tr><th>No</th><th>Nama Lengkap</th><th>Kelas/Tingkat</th><th>Rombel</th><th>Jenis Kelamin</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {g.list.map(r => (
                      <tr key={r['No']}>
                        <td>{r['No']}</td>
                        <td>{r['Nama Lengkap'] || '-'}</td>
                        <td>{r['Kelas/Tingkat'] || '-'}</td>
                        <td>{r['Rombel'] ? r['Rombel'] : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>belum ada</span>}</td>
                        <td>{r['Jenis Kelamin'] || '-'}</td>
                        <td>{r['Status'] || 'Aktif'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" title="Lihat Detail" onClick={() => setLihatRow(r)}>{ICON_VIEW}</button>
                            <button className="btn-icon" title="Edit" onClick={() => setEditRow(r)}>{ICON_EDIT}</button>
                            <button className="btn-icon danger" title="Hapus" onClick={() => setDeleteRow(r)}>{ICON_DELETE}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {lihatRow && <LihatSiswaModal row={lihatRow} onClose={() => setLihatRow(null)} />}
      {editRow && <EditSiswaModal row={editRow} onClose={() => setEditRow(null)} onSaved={load} />}

      {deleteRow && (
        <PasswordConfirmModal
          title="Konfirmasi Hapus Data"
          message={`Anda akan menghapus data siswa "${deleteRow['Nama Lengkap']}" (No. ${deleteRow['No']}, NISN ${deleteRow['NISN']}). Tindakan ini tidak bisa dibatalkan.`}
          danger
          onConfirm={doDelete}
          onClose={() => setDeleteRow(null)}
        />
      )}
    </div>
  );
}
