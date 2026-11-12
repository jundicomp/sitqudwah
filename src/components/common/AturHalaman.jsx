import { KERTAS, SATUAN, SISI, gantiSatuan, ukuranHalaman } from '../../db/halamanFields';

// Form ukuran kertas + margin (atas/bawah/kiri/kanan) dgn satuan cm / inch.
export default function AturHalaman({ value, onChange, judul = 'Kertas & margin' }) {
  const h = value;
  const set = (k, v) => onChange({ ...h, [k]: v });
  const u = ukuranHalaman(h);
  const langkah = h.satuan === 'in' ? 0.05 : 0.1;
  return (
    <div className="atur-hal">
      <div className="atur-hal-head">
        <b>{judul}</b>
        <div className="seg-mini" role="group" aria-label="Satuan">
          {SATUAN.map(s => (
            <button key={s.value} type="button" className={h.satuan === s.value ? 'on' : ''} onClick={() => onChange(gantiSatuan(h, s.value))}>{s.label}</button>
          ))}
        </div>
      </div>
      <div className="atur-hal-isi">
        <div className="field">
          <label>Ukuran kertas</label>
          <select value={h.kertas} onChange={e => set('kertas', e.target.value)}>
            {KERTAS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        {SISI.map(([k, label]) => (
          <div key={k} className="field">
            <label>{label} ({h.satuan === 'in' ? 'inch' : 'cm'})</label>
            <input type="number" min="0" step={langkah} value={h[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="atur-hal-mini" title="Gambaran letak margin">
          <div className="kertas" style={{ aspectRatio: `${u.w} / ${u.h}` }}>
            <div className="isi" style={{ top: `${(u.atas / u.h) * 100}%`, bottom: `${(u.bawah / u.h) * 100}%`, left: `${(u.kiri / u.w) * 100}%`, right: `${(u.kanan / u.w) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
