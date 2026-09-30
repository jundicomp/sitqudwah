import Page from '../../components/layout/Page';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useAppData } from '../../context/AppContext';

const GRUP_ORDER = ['Umum', 'SPP', 'Keuangan', 'Akademik', 'Kepegawaian', 'Presensi Barcode', 'Kesiswaan', 'Perpustakaan', 'Komunikasi', 'Laporan & Grafik', 'Sarpras', 'Pengaturan'];

// Nilai EFEKTIF 1 izin (default "boleh" kalau belum pernah diatur -- konsisten dgn
// canAccess() di AuthContext yg jg pakai aturan "!== false berarti boleh").
function nilaiEfektif(permMap, itemId) {
  return permMap?.[itemId] !== false;
}

export default function ManajemenHakAkses() {
  const { HAK_AKSES_PAGES, HAK_AKSES_TABS, permissionRoles, halamanSensitif, ADMIN_ONLY_PAGES, permissions, terapkanPerubahanHakAkses, toast } = useAppData();
  const [terbuka, setTerbuka] = useState({}); // { [pageId]: true } -- halaman mana yg tabnya sedang ditampilkan
  const [terbukaSub, setTerbukaSub] = useState({}); // { [pageId.tabId]: true } -- tab mana yg sub-tabnya ditampilkan
  const [draft, setDraft] = useState(permissions); // salinan lokal -- checkbox ubah INI dulu, blm tersimpan
  const [menerapkan, setMenerapkan] = useState(false);
  // Penanda "draft sudah disentuh user, BELUM di-Terapkan/Batalkan" -- PENTING sejak
  // ada sinkron-ulang Hak Akses otomatis di latar belakang (berkala + tiap tab aktif
  // lagi, lihat AppContext). Tanpa penanda ini, background sync itu bisa nimpa balik
  // centang yg baru diklik tapi BELUM sempat "Terapkan" -- kelihatan spt "kok kecentang
  // lagi sendiri" padahal user belum pernah klik Terapkan sama sekali.
  const draftDisentuhRef = useRef(false);

  // Sinkronkan draft dari data server tiap kali permissions dari server berubah (mis.
  // setelah "Terapkan" selesai, role baru ditambahkan, ATAU sinkron-ulang otomatis di
  // latar belakang) -- TAPI cuma kalau user TIDAK sedang punya centang yg digantung
  // (belum diterapkan/dibatalkan). Kalau ada, biarkan draft apa adanya -- jangan ditimpa.
  useEffect(() => {
    if (draftDisentuhRef.current) return;
    setDraft(permissions);
  }, [permissions]);

  function toggle(role, itemId, checked) {
    draftDisentuhRef.current = true;
    setDraft(prev => ({ ...prev, [role]: { ...(prev[role] || {}), [itemId]: checked } }));
  }

  function isLocked(role, pageId) {
    if (ADMIN_ONLY_PAGES.includes(pageId)) return role !== 'Admin'; // admin-only: yang lain terkunci OFF permanen
    if (halamanSensitif.includes(pageId)) return role === 'Kepala Sekolah' || role === 'Admin'; // selalu ON, tak bisa dicabut
    return false;
  }

  // Hitung SEMUA (role, itemId) yg nilai efektifnya beda antara draft & yg tersimpan.
  const daftarPerubahan = [];
  permissionRoles.forEach(role => {
    const semuaItemId = new Set([...Object.keys(permissions[role] || {}), ...Object.keys(draft[role] || {})]);
    semuaItemId.forEach(itemId => {
      const asli = nilaiEfektif(permissions[role], itemId);
      const baru = nilaiEfektif(draft[role], itemId);
      if (asli !== baru) daftarPerubahan.push({ role, itemId, checked: baru });
    });
  });
  const adaPerubahan = daftarPerubahan.length > 0;

  async function terapkan() {
    setMenerapkan(true);
    try {
      await terapkanPerubahanHakAkses(daftarPerubahan);
      draftDisentuhRef.current = false; // sudah tersimpan -- boleh disinkron ulang dari server lagi
    } finally {
      setMenerapkan(false);
    }
  }

  function batalkan() {
    draftDisentuhRef.current = false;
    setDraft(permissions);
    toast('Perubahan yang belum diterapkan dibatalkan.');
  }

  return (
    <Page pageId="hakakses" title="Manajemen Hak Akses" path="Pengaturan / User / Manajemen Hak Akses">
      <div className="card">
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div><h3>🔐 Manajemen Hak Akses</h3><p>Centang menu yang boleh diakses tiap role. Klik ▸ di samping menu utk atur sampai level tab di dalamnya. Perubahan BELUM tersimpan sampai klik "Terapkan".</p></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {adaPerubahan && <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>{daftarPerubahan.length} perubahan belum diterapkan</span>}
            {adaPerubahan && <button className="btn btn-sm" onClick={batalkan} disabled={menerapkan}>Batalkan</button>}
            <button className="btn btn-primary btn-sm" onClick={terapkan} disabled={!adaPerubahan || menerapkan}>{menerapkan ? 'Menerapkan...' : '✓ Terapkan'}</button>
          </div>
        </div>
        <div className="card-body table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Menu</th>
                {permissionRoles.map(r => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {GRUP_ORDER.map(grup => {
                const pages = HAK_AKSES_PAGES.filter(p => p.grup === grup);
                if (pages.length === 0) return null;
                return (
                  <Fragment key={grup}>
                    <tr>
                      <td colSpan={permissionRoles.length + 1} style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', fontWeight: 800, textTransform: 'uppercase', fontSize: 11.5 }}>{grup}</td>
                    </tr>
                    {pages.map(p => {
                      const tabsHalamanIni = HAK_AKSES_TABS[p.id];
                      const punyaTab = tabsHalamanIni && tabsHalamanIni.length > 0;
                      const sedangTerbuka = !!terbuka[p.id];
                      return (
                        <Fragment key={p.id}>
                          <tr>
                            <td>
                              {punyaTab ? (
                                <button
                                  onClick={() => setTerbuka(t => ({ ...t, [p.id]: !t[p.id] }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, color: 'var(--text)' }}
                                >
                                  <span style={{ fontSize: 10, color: 'var(--muted)', width: 10, display: 'inline-block' }}>{sedangTerbuka ? '▾' : '▸'}</span>
                                  {p.label}
                                </button>
                              ) : (
                                <span style={{ paddingLeft: 16 }}>{p.label}</span>
                              )}
                            </td>
                            {permissionRoles.map(role => {
                              const locked = isLocked(role, p.id);
                              const checked = nilaiEfektif(draft[role], p.id);
                              const berubah = nilaiEfektif(permissions[role], p.id) !== checked;
                              return (
                                <td key={role} style={{ textAlign: 'center', background: berubah ? 'var(--gold-soft)' : undefined }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={locked}
                                    onChange={e => toggle(role, p.id, e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: 'var(--green)' }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                          {punyaTab && sedangTerbuka && tabsHalamanIni.map(tabInfo => {
                            const itemId = `${p.id}.${tabInfo.id}`;
                            const punyaSubTab = tabInfo.subTabs && tabInfo.subTabs.length > 0;
                            const subKey = itemId;
                            const subSedangTerbuka = !!terbukaSub[subKey];
                            return (
                              <Fragment key={itemId}>
                                <tr style={{ background: '#FAFBFA' }}>
                                  <td style={{ paddingLeft: 40, fontSize: 12.5, color: 'var(--muted)' }}>
                                    {punyaSubTab ? (
                                      <button
                                        onClick={() => setTerbukaSub(t => ({ ...t, [subKey]: !t[subKey] }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 12.5, color: 'var(--muted)' }}
                                      >
                                        <span style={{ fontSize: 9, width: 10, display: 'inline-block' }}>{subSedangTerbuka ? '▾' : '▸'}</span>
                                        ↳ {tabInfo.label}
                                      </button>
                                    ) : (
                                      <>↳ {tabInfo.label}</>
                                    )}
                                  </td>
                                  {permissionRoles.map(role => {
                                    const pageLocked = isLocked(role, p.id);
                                    const pageChecked = nilaiEfektif(draft[role], p.id);
                                    const tabChecked = nilaiEfektif(draft[role], itemId);
                                    const disabled = pageLocked || !pageChecked;
                                    const berubah = nilaiEfektif(permissions[role], itemId) !== tabChecked;
                                    return (
                                      <td key={role} style={{ textAlign: 'center', background: berubah ? 'var(--gold-soft)' : undefined }}>
                                        <input
                                          type="checkbox"
                                          checked={tabChecked}
                                          disabled={disabled}
                                          onChange={e => toggle(role, itemId, e.target.checked)}
                                          style={{ width: 14, height: 14, accentColor: 'var(--gold)' }}
                                          title={disabled && !pageLocked ? 'Aktifkan dulu akses halamannya' : undefined}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                                {punyaSubTab && subSedangTerbuka && tabInfo.subTabs.map(subInfo => {
                                  const subItemId = `${itemId}.${subInfo.id}`;
                                  return (
                                    <tr key={subItemId} style={{ background: '#F5F6F4' }}>
                                      <td style={{ paddingLeft: 64, fontSize: 12, color: 'var(--muted)' }}>↳ {subInfo.label}</td>
                                      {permissionRoles.map(role => {
                                        const pageLocked = isLocked(role, p.id);
                                        const tabChecked2 = nilaiEfektif(draft[role], itemId);
                                        const subChecked = nilaiEfektif(draft[role], subItemId);
                                        const disabled = pageLocked || !tabChecked2;
                                        const berubah = nilaiEfektif(permissions[role], subItemId) !== subChecked;
                                        return (
                                          <td key={role} style={{ textAlign: 'center', background: berubah ? 'var(--gold-soft)' : undefined }}>
                                            <input
                                              type="checkbox"
                                              checked={subChecked}
                                              disabled={disabled}
                                              onChange={e => toggle(role, subItemId, e.target.checked)}
                                              style={{ width: 13, height: 13, accentColor: 'var(--gold)' }}
                                              title={disabled && !pageLocked ? 'Aktifkan dulu tab induknya' : undefined}
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>
            ⚠️ Kepala Sekolah &amp; Admin selalu punya akses penuh ke halaman sensitif (Manajemen User, Hak Akses, Log
            Penghapusan) — tidak bisa dicabut lewat sini. <strong>Pengaturan Koneksi Google Sheets</strong> khusus
            Admin saja, bahkan Kepala Sekolah tidak bisa diberi akses ke situ. Centang di bawah menu (↳) hanya bisa
            diaktifkan kalau menu induknya sendiri sudah diizinkan. Kotak berwarna kuning menandakan perubahan yang
            belum diterapkan.
          </p>
        </div>
      </div>
    </Page>
  );
}
