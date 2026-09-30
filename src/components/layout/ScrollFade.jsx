import { useCallback, useEffect, useRef, useState } from 'react';

// Bungkus konten yang bisa di-scroll (flyout tablet, overlay tablet, bottom
// sheet mobile) TANPA scrollbar bawaan browser yang terlihat kasar -- diganti
// tanda panah atas/bawah yang muncul/hilang otomatis sesuai posisi scroll
// (permintaan user: "jika ada scroll bar dihilangkan saja... kasih tanda
// anak panah atas atau bawah").
export default function ScrollFade({ className = '', children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ up: false, down: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdge({
      up: scrollTop > 4,
      down: scrollTop + clientHeight < scrollHeight - 4,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, children]);

  return (
    <div className="scrollfade-wrap">
      <div ref={ref} className={`scrollfade-body hide-scrollbar ${className}`} onScroll={update}>
        {children}
      </div>
      {edge.up && <div className="scrollfade-arrow up" aria-hidden="true">▲</div>}
      {edge.down && <div className="scrollfade-arrow down" aria-hidden="true">▼</div>}
    </div>
  );
}
