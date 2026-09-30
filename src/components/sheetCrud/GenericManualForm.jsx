import { useState } from 'react';
import { isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import ListField from '../common/ListField';
import ImageField from '../common/ImageField';
import SaveProgressModal from '../common/SaveProgressModal';

export default function GenericManualForm({ fields, emptyRow, addFn, onSaved, title, subtitle, target = 'master', bare = false }) {
  const { toast } = useAppData();
  const [form, setForm] = useState(emptyRow());
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null); // null | 'saving' | 'done'

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function submit(e) {
    e.preventDefault();
    if (!isConfigured(target)) { toast('Atur koneksi Google Sheets dulu (menu Pengaturan Koneksi).', 'error'); return; }
    const wajib = fields.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await addFn(form);
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100)); // biarkan pesan sukses terlihat sebentar
      setForm(emptyRow());
      onSaved && onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  const isiForm = (
    <form onSubmit={submit}>
      <div className={bare ? '' : 'card-body'}>
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
                <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder || ''} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={bare ? '' : 'card-body'} style={{ borderTop: bare ? 'none' : '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: bare ? 16 : 0 }}>
        <button type="button" className="btn" onClick={() => setForm(emptyRow())}>Bersihkan</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  );

  if (bare) {
    return (
      <>
        {isiForm}
        {phase && <SaveProgressModal phase={phase} />}
      </>
    );
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
      {isiForm}
      {phase && <SaveProgressModal phase={phase} />}
    </div>
  );
}
