// Tawaran memulihkan isian yg belum tersimpan (lihat hooks/useDrafLokal).
export default function DrafBanner({ draf, onPulihkan, onBuang }) {
  if (!draf) return null;
  const w = new Date(draf.waktu);
  const hariIni = new Date().toDateString() === w.toDateString();
  const jam = `${String(w.getHours()).padStart(2, '0')}.${String(w.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="draf-banner" role="alert">
      <span>💾 Ada isian yang <b>belum tersimpan</b> dari {hariIni ? `hari ini pukul ${jam}` : `${w.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} pukul ${jam}`} (mungkin halaman sempat ter-refresh). Pulihkan?</span>
      <span style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={onPulihkan}>Pulihkan isian</button>
        <button type="button" className="btn btn-sm" onClick={onBuang}>Buang</button>
      </span>
    </div>
  );
}
