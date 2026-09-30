import { useState } from 'react';
import Modal from '../../components/common/Modal';
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal';
import { SISWA_FIELDS } from '../../db/siswaFields';
import { updateSiswaInSheet, addLogEntry } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { normalisasiTanggalUntukInput } from '../../db/helpers';

export default function EditSiswaModal({ row, onClose, onSaved }) {
  const { toast, refreshSiswa } = useAppData();
  const { currentUser } = useAuth();
  const [form, setForm] = useState(() => {
    const initial = {};
    SISWA_FIELDS.forEach(f => {
      let val = row[f.key] ?? '';
      if (f.type === 'date') val = normalisasiTanggalUntukInput(val);
      // Data siswa lama (dibuat sebelum field Status/Jenis Pendaftaran ada) sel-nya kosong --
      // form Edit ikut menganggapnya default, konsisten dgn logika di seluruh app (normalizeSheetSiswa),
      // supaya tidak memaksa user pilih manual padahal cuma mau edit field lain.
      if (!val) {
        if (f.key === 'Status') val = 'Aktif';
        if (f.key === 'Jenis Pendaftaran') val = 'Siswa Baru';
      }
      initial[f.key] = val;
    });
    return initial;
  });
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [saving, setSaving] = useState(false);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  function trySubmit(e) {
    e.preventDefault();
    const wajib = SISWA_FIELDS.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setStep('confirm');
  }

  async function doUpdate() {
    setSaving(true);
    try {
      // PENTING: sebar `row` (data mentah ASLI dari Sheet) DULU, baru `form` (field yg
      // memang ada di form Edit) di atasnya -- BUKAN kirim `form` saja. Server (updateRow_
      // di Code.gs) MENIMPA SELURUH baris pakai persis apa yg dikirim; kolom yg TIDAK ada
      // di SISWA_FIELDS (mis. "Rombel", yg diisi lewat menu terpisah Data Kelas & Rombel)
      // otomatis jadi KOSONG kalau tidak ikut disertakan -- artinya SETIAP kali Edit lewat
      // modal ini disimpan, Rombel siswa itu diam-diam ke-reset/hilang. Sama seperti
      // perbaikan pola "spread row dulu" yg sudah dipakai di PindahRombelMassal (RombelTab.jsx).
      await updateSiswaInSheet({ ...row, ...form, No: row['No'] });
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Edit Data',
        modul: 'Data Siswa',
        detail: `Mengubah data siswa "${form['Nama Lengkap']}" (No. ${row['No']})`,
      });
      toast('Data siswa berhasil diperbarui.');
      refreshSiswa();
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
        message={`Anda akan mengubah data siswa "${form['Nama Lengkap']}".`}
        onConfirm={doUpdate}
        onClose={() => setStep('form')}
      />
    );
  }

  return (
    <Modal title="Edit Data Siswa" subtitle={`No. ${row['No']}`} onClose={onClose} actions={
      <>
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={trySubmit} disabled={saving}>Lanjut ke Konfirmasi</button>
      </>
    }>
      <form onSubmit={trySubmit}>
        <div className="form-grid">
          {SISWA_FIELDS.map(f => (
            <div key={f.key} className={`field ${f.type === 'textarea' ? 'span2' : ''}`}>
              <label>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
              {f.type === 'select' ? (
                <select value={form[f.key]} onChange={e => setField(f.key, e.target.value)}>
                  <option value="">— pilih —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={2} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} />
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
