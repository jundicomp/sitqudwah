import { useState } from 'react';
import Modal from '../common/Modal';
import PasswordConfirmModal from '../common/PasswordConfirmModal';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { addLogEntry } from '../../services/googleSheets';
import { normalisasiTanggalUntukInput } from '../../db/helpers';
import ListField from '../common/ListField';
import ImageField from '../common/ImageField';

export default function GenericEditModal({ row, fields, updateFn, moduleLabel, labelKey, onClose, onSaved }) {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [form, setForm] = useState(() => {
    // Baseline: SEMUA kolom asli `row`, termasuk yg TIDAK ikut di `fields` (sengaja
    // tidak bisa diedit, mis. NISN/Nama Siswa di Tagihan Lain & Pembayaran) -- supaya
    // `labelKey` tetap bisa dipakai utk pesan konfirmasi/log walau field itu sendiri
    // bukan salah satu yg bisa diedit. Field yg genuinely ada di `fields` lalu
    // menimpanya di bawah (dgn normalisasi tanggal kalau perlu) spt sebelumnya.
    const initial = { ...row };
    fields.forEach(f => {
      const raw = row[f.key] ?? '';
      initial[f.key] = f.type === 'date' ? normalisasiTanggalUntukInput(raw) : raw;
    });
    return initial;
  });
  const [step, setStep] = useState('form');
  const [saving, setSaving] = useState(false);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  function trySubmit(e) {
    e.preventDefault();
    const wajib = fields.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setStep('confirm');
  }

  async function doUpdate() {
    setSaving(true);
    try {
      // PENTING: gabungkan dgn `row` ASLI dulu (semua kolom mentah dari Sheet), baru
      // ditimpa `form` (field yg genuinely diedit). Kalau cuma kirim `form` saja,
      // kolom yg TIDAK ditampilkan di form ini (mis. "Kategori" pada Data Guru/Staff)
      // akan ikut tertimpa KOSONG karena tidak pernah ada di state form sama sekali.
      await updateFn({ ...row, ...form, No: row['No'] });
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Edit Data',
        modul: moduleLabel,
        detail: `Mengubah data "${form[labelKey]}" (No. ${row['No']})`,
      });
      toast('Data berhasil diperbarui.');
      onSaved && onSaved();
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
        title="Konfirmasi Perubahan Data"
        message={`Anda akan mengubah data "${form[labelKey]}".`}
        onConfirm={doUpdate}
        onClose={() => setStep('form')}
      />
    );
  }

  return (
    <Modal title={`Edit ${moduleLabel}`} subtitle={`No. ${row['No']}`} onClose={onClose} actions={
      <>
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={trySubmit} disabled={saving}>Lanjut ke Konfirmasi</button>
      </>
    }>
      <form onSubmit={trySubmit}>
        <div className="form-grid">
          {fields.map(f => (
            <div key={f.key} className={`field${f.type === 'textarea' ? ' span2' : ''}`}>
              <label>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
              {f.type === 'select' ? (
                <select value={form[f.key]} onChange={e => setField(f.key, e.target.value)}>
                  <option value="">— pilih —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'list' ? (
                <ListField value={form[f.key]} onChange={v => setField(f.key, v)} placeholder={f.placeholder} />
              ) : f.type === 'textarea' ? (
                <textarea rows={5} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder || ''} />
              ) : f.type === 'image' ? (
                <ImageField value={form[f.key]} onChange={v => setField(f.key, v)} label={f.label} />
              ) : (
                <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
