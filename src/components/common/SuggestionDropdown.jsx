import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

// Dropdown saran pencarian yg di-render lewat React Portal langsung ke <body> --
// BUKAN sbg child dari kartu tempat input berada. Ini PENTING karena kelas ".card"
// di seluruh app punya "overflow:hidden" (supaya sudut membulat rapi) -- kalau
// dropdown ini dirender sbg child biasa, begitu daftar sarannya lebih tinggi drpd
// sisa ruang kartu, dia akan TERPOTONG kelihatannya (persis bug yg pernah terjadi).
// Portal membuatnya render independen, posisinya dihitung manual dari lokasi input.
export default function SuggestionDropdown({ anchorRef, visible, children }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!visible || !anchorRef.current) { setRect(null); return undefined; }
    const update = () => {
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [visible, anchorRef]);

  if (!visible || !rect) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
      background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
      zIndex: 999, boxShadow: '0 8px 20px rgba(0,0,0,.15)', maxHeight: 320, overflowY: 'auto',
    }}>
      {children}
    </div>,
    document.body
  );
}
