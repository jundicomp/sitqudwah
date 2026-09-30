export default function Modal({ title, subtitle, onClose, children, actions, wide }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-card${wide ? ' modal-card--wide' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h3>{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose} title="Tutup" style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>✕</button>
        </div>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        <div>{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
