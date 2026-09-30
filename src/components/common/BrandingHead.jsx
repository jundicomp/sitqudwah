import { useEffect } from 'react';
import { useAppData } from '../../context/AppContext';
import { LOGO_CACHE_KEY } from '../../config/appInfo';

const FAVICON_BAWAAN = `${import.meta.env.BASE_URL}favicon.svg`;

function pasangIkon(rel, href, type) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
  if (type) el.type = type; else el.removeAttribute('type');
}

// Favicon tab browser = logo di Pengaturan › Profil Sekolah. Kalau logo belum
// diunggah, kembali ke favicon bawaan. Tidak merender apa pun.
export default function BrandingHead() {
  const { profilSekolah, profilLoading } = useAppData();
  const logo = profilSekolah?.logo || '';
  useEffect(() => {
    if (logo) {
      pasangIkon('icon', logo);
      pasangIkon('apple-touch-icon', logo);
      try { localStorage.setItem(LOGO_CACHE_KEY, logo); } catch { /* storage penuh/diblokir -- abaikan */ }
    } else if (profilSekolah && !profilLoading) {
      pasangIkon('icon', FAVICON_BAWAAN, 'image/svg+xml');
      try { localStorage.removeItem(LOGO_CACHE_KEY); } catch { /* abaikan */ }
    }
  }, [logo, profilSekolah, profilLoading]);
  return null;
}
