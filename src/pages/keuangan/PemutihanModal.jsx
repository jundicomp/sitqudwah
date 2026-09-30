import { useState } from 'react';
import Modal from '../../components/common/Modal';
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal';
import { addPembayaranToSheet, addLogEntry } from '../../services/googleSheets';
import { METODE_PEMUTIHAN } from '../../db/pembayaranFields';
import { formatRupiah, todayWIB } from '../../db/helpers';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function PemutihanModal({ tagihan, onClose, onDone }) {
  const { toast, refreshPembayaran } = useAppData();
  const { currentUser } = useAuth();
  const [alasan, setAlasan] = useState('');
  const [step, setStep] = useState('alasan'); // 'alasan' | 'confirm'
  const [saving, setSaving] = useState(false);

  function lanjut(e) {
    e.preventDefault();
    if (!alasan.trim()) { toast('Alasan pemutihan wajib diisi.', 'error'); return; }
    setStep('confirm');
  }

  async function doPutihkan() {
    setSaving(true);
    try {
      await addPembayaranToSheet({
        RefType: tagihan.refType,
        RefNo: tagihan.no,
        NISN: tagihan.nisn,
        'Nama Siswa': tagihan.namaSiswa,
        Jenis: tagihan.label,
        Nominal: tagihan.sisa,
        'Tanggal Bayar': todayWIB(),
        Metode: METODE_PEMUTIHAN,
        Keterangan: alasan.trim(),
      });
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Pemutihan Piutang',
        modul: 'Rekap Tunggakan',
        detail: `Memutihkan tagihan "${tagihan.label}" milik ${tagihan.namaSiswa} sebesar ${formatRupiah(tagihan.sisa)} — Alasan: ${alasan.trim()}`,
      });
      toast('Piutang berhasil diputihkan dan tercatat di Log Histori.');
      refreshPembayaran();
      onDone && onDone();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  if (step === 'confirm') {
    return (
      <PasswordConfirmModal
        title="Konfirmasi Pemutihan Piutang"
        message={`Anda akan memutihkan tagihan "${tagihan.label}" milik ${tagihan.namaSiswa} sebesar ${formatRupiah(tagihan.sisa)}. Tindakan ini tercatat permanen di Log Histori.`}
        danger
        onConfirm={doPutihkan}
        onClose={() => setStep('alasan')}
      />
    );
  }

  return (
    <Modal
      title="Pemutihan Piutang"
      subtitle={`${tagihan.namaSiswa} — ${tagihan.label} — Sisa ${formatRupiah(tagihan.sisa)}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={lanjut} disabled={saving}>Lanjut ke Konfirmasi</button>
        </>
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
        Pemutihan menghapuskan piutang ini secara resmi (mis. siswa pindah tanpa bisa dihubungi, force majeure, dll).
        Tindakan ini <strong>tidak menghapus data</strong> — tercatat sebagai transaksi khusus dan masuk Log Histori,
        supaya tetap bisa diaudit di kemudian hari.
      </p>
      <div className="field">
        <label>Alasan Pemutihan <span style={{ color: 'var(--red)' }}>*</span></label>
        <textarea rows={3} value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="mis. Siswa pindah ke luar kota, tidak bisa dihubungi sejak Maret 2027" />
      </div>
    </Modal>
  );
}
