import { isConfigured } from '../../services/googleSheets';

// Bar tab halaman -- pola sama dgn halaman lain (seg-tabs + izin per tab).
export function TabBar({ tabs, tab, setTab, bolehTab }) {
  return (
    <div className="seg-tabs">
      {tabs.filter(t => bolehTab(t.id)).map(t => (
        <button key={t.id} className={`seg-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

// Tampil kalau URL Apps Script Akademik belum diisi di sheetsDefaults.js.
export function AkademikBelumTersambung() {
  if (isConfigured('akademik')) return null;
  return (
    <div className="card">
      <div className="card-body" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
        <b>File Sheets Akademik belum tersambung.</b> Modul ini menyimpan data di spreadsheet ketiga
        (terpisah dari Data Induk &amp; Keuangan). Pasang <code>google-apps-script/Code-Akademik.gs</code> di
        Google Sheets baru, deploy sebagai Web App, lalu isi URL &amp; sandinya di
        <code> src/config/sheetsDefaults.js</code> bagian <code>akademik</code> dan build ulang.
      </div>
    </div>
  );
}

export function Field({ label, children, grow }) {
  return (
    <div className={`field${grow ? ' grow' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Kosong({ children }) {
  return <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '8px 0' }}>{children}</p>;
}
