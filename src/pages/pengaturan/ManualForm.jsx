import { useState } from 'react';
import Modal from '../../components/common/Modal';
import { SISWA_FIELDS, emptySiswaRow } from '../../db/siswaFields';
import { addSiswaToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import SaveProgressModal from '../../components/common/SaveProgressModal';

// Sejak v1.31.29+perbaikan: dulu tab tersendiri di menu Data Siswa, sekarang jadi
// MODAL yang dibuka lewat tombol "+ Tambah Siswa" di tab Data Siswa (Tabel) --
// supaya semua aksi terkait tabel siswa (tambah/edit/hapus/upload) terkumpul di 1
// tempat, bukan tersebar sbg tab terpisah-pisah.
export default function ManualForm({ onClose, onSaved }) {
  const { toast } = useAppData();
  const [form, setForm] = useState(emptySiswaRow());
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null); // null | 'saving' | 'done'

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu di atas.', 'error'); return; }
    const wajib = SISWA_FIELDS.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await addSiswaToSheet(form);
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  return (
    <>
      <Modal
        title="Tambah Data Siswa"
        subtitle="Data langsung tersimpan ke baris baru di Google Sheets."
        onClose={onClose}
        wide
        actions={
          <>
            <button type="button" className="btn" onClick={() => setForm(emptySiswaRow())}>Bersihkan Form</button>
            <button type="button" className="btn" onClick={onClose}>Batal</button>
            <button type="submit" form="form-tambah-siswa-manual" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </>
        }
      >
        <form id="form-tambah-siswa-manual" onSubmit={submit}>
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
      {phase && <SaveProgressModal phase={phase} />}
    </>
  );
}
