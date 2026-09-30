import { useState } from 'react';
import CatatPembayaranModal from '../spp/CatatPembayaranModal';

// Sejak v1.31.16: form "Catat Pembayaran" yang dulu SELALU tampil penuh di
// atas halaman (cari siswa, filter kelas/rombel, daftar tagihan, dst) sekarang
// jadi 1 tombol yang membuka modal lebar 2 kolom (lihat CatatPembayaranModal.jsx)
// -- kolom kiri form catat pembayaran (logikanya sama persis, cuma dipindah),
// kolom kanan riwayat pembayaran siswa yang sedang dipilih. Tabel "Riwayat
// Pembayaran" yang dulu ada di bawah form ini (terikat ke siswa yg dicari)
// sekarang jadi komponen sendiri (RiwayatPembayaranCard.jsx) yang SELALU
// menampilkan SEMUA transaksi -- lihat src/pages/spp/Pembayaran.jsx.
export default function PembayaranTab() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Catat Pembayaran</h3><p>Cari siswa, pilih tagihan yang mau dibayar, lalu simpan.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Catat Pembayaran</button>
      </div>
      {showModal && <CatatPembayaranModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
