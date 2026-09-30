import { useId, useRef } from 'react';
import Modal from '../../components/common/Modal';
import { useAppData } from '../../context/AppContext';
import { printElementById } from '../../utils/exportTable';
import { shareCardAsImage } from '../../utils/shareCardImage';

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

export default function KwitansiModal({ pembayaran, onClose }) {
  const { profilSekolah } = useAppData();
  const printId = 'print-kwitansi-' + useId().replace(/:/g, '');
  const cardRef = useRef(null);

  return (
    <Modal title="Kwitansi Pembayaran" subtitle={`No. ${pembayaran.no}`} onClose={onClose} actions={
      <>
        <button className="btn no-print" onClick={onClose}>Tutup</button>
        <button className="btn no-print" onClick={() => shareCardAsImage(cardRef, `Kwitansi - ${pembayaran.namaSiswa} - ${pembayaran.no}`)}>📤 Share</button>
        <button className="btn btn-primary no-print" onClick={() => printElementById(printId)}>🖨️ Cetak</button>
      </>
    }>
      <div id={printId} ref={cardRef} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 24, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, borderBottom: '2px solid var(--green-dark)', paddingBottom: 14 }}>
          {profilSekolah?.logo ? (
            <img src={profilSekolah.logo} alt="Logo Sekolah" style={{ width: 46, height: 46, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <svg width="46" height="46" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <circle cx="24" cy="24" r="21" fill="#1C7A3C" />
              <text x="24" y="25" textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="#F0B429">MI</text>
            </svg>
          )}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--green-dark)' }}>{profilSekolah?.nama || 'Nama Sekolah'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{profilSekolah?.alamat || '-'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 18 }}>KWITANSI PEMBAYARAN</div>
        <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>No. Kwitansi</td><td>: {pembayaran.no}</td></tr>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)' }}>Nama Siswa</td><td>: {pembayaran.namaSiswa}</td></tr>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)' }}>NISN</td><td>: {pembayaran.nisn || '-'}</td></tr>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)' }}>Jenis Pembayaran</td><td>: {pembayaran.jenis}</td></tr>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)' }}>Tanggal Bayar</td><td>: {pembayaran.tanggalBayar}</td></tr>
            <tr><td style={{ padding: '5px 0', color: 'var(--muted)' }}>Metode</td><td>: {pembayaran.metode}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--green-soft)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Jumlah Dibayar</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-dark)' }}>{formatRupiah(pembayaran.nominal)}</div>
        </div>
        <div style={{ marginTop: 24, textAlign: 'right', fontSize: 13 }}>
          <div style={{ marginBottom: 4 }}>Diterima oleh,</div>
          <div style={{ height: 46 }} />
          <div style={{ fontWeight: 700, textDecoration: 'underline' }}>PETUGAS SPP</div>
        </div>
      </div>
    </Modal>
  );
}
