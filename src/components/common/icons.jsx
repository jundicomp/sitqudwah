// Ikon SVG sederhana, SATU WARNA (pakai currentColor -- otomatis ikut warna teks
// putih kartu), dipakai di InfoCard. Bukan emoji -- emoji multi-warna & tampilannya
// beda-beda tiap OS/browser, sedangkan ikon garis begini konsisten di mana pun.
const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconUsers = (p) => (
  <svg {...props} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const IconUserCheck = (p) => (
  <svg {...props} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="m17 11 2 2 4-4" /></svg>
);
export const IconMoney = (p) => (
  <svg {...props} {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 10v.01M18 14v.01" /></svg>
);
export const IconReceipt = (p) => (
  <svg {...props} {...p}><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z" /><path d="M8 7h8M8 11h8M8 15h4" /></svg>
);
export const IconAlertTriangle = (p) => (
  <svg {...props} {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const IconCheckCircle = (p) => (
  <svg {...props} {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
);
export const IconAlertCircle = (p) => (
  <svg {...props} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
);
export const IconXCircle = (p) => (
  <svg {...props} {...p}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
);
export const IconBox = (p) => (
  <svg {...props} {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>
);
export const IconLayers = (p) => (
  <svg {...props} {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 14 9 5 9-5" /></svg>
);
export const IconBuilding = (p) => (
  <svg {...props} {...p}><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>
);
export const IconTrendUp = (p) => (
  <svg {...props} {...p}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
);
export const IconTrendDown = (p) => (
  <svg {...props} {...p}><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></svg>
);
export const IconCalendarClock = (p) => (
  <svg {...props} {...p}><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /><path d="M16 2v4M8 2v4M3 10h18" /><circle cx="18" cy="18" r="4" /><path d="M18 16.5V18l1 1" /></svg>
);
export const IconFileText = (p) => (
  <svg {...props} {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
);
export const IconGraduationCap = (p) => (
  <svg {...props} {...p}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" /></svg>
);
export const IconPercent = (p) => (
  <svg {...props} {...p}><path d="m19 5-14 14M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>
);
