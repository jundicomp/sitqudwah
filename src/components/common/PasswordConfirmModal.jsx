import { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';

/**
 * Modal verifikasi password sebelum aksi sensitif (edit/hapus data).
 * onConfirm dipanggil HANYA kalau password yang diketik cocok dgn password user yang login.
 */
export default function PasswordConfirmModal({ title, message, danger, onConfirm, onClose }) {
  const { verifyPassword, currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!verifyPassword(password)) {
      setError('Password salah. Coba lagi.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={message}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button
            className="btn btn-primary"
            style={danger ? { background: 'var(--red)', borderColor: 'var(--red)' } : undefined}
            onClick={handleConfirm}
            disabled={busy || !password}
          >
            {busy ? 'Memproses...' : 'Konfirmasi'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Masukkan password Anda ({currentUser?.username}) untuk melanjutkan</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          autoFocus
          placeholder="••••••••"
        />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>{error}</p>}
    </Modal>
  );
}
