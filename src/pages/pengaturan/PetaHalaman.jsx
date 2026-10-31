import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../../components/layout/Page';
import { NAV_STRUCTURE } from '../../components/layout/navConfig';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STATUS_INFO, STATUS_KHUSUS, HALAMAN_RENCANA, TAB_RENCANA, CATATAN, BUKAN_TAB } from '../../data/petaHalaman';

const URUT = ['siap', 'progres', 'rencana'];

function Lencana({ status }) {
  const s = STATUS_INFO[status];
  return <span className={`ph-cek ${s.kelas}`} title={s.ket} aria-label={s.label}>{s.ikon}</span>;
}

// Susun pohon: grup -> halaman -> tab, lengkap dgn status masing2.
function susunPohon(hakAksesTabs) {
  const halaman = (it) => {
    const tabsAda = (hakAksesTabs[it.pageId] || []).filter(t => !BUKAN_TAB.includes(`${it.pageId}.${t.id}`)).map(t => ({ id: t.id, label: t.label, status: STATUS_KHUSUS[`${it.pageId}.${t.id}`] || 'siap', ada: true }));
    const tabsBaru = (TAB_RENCANA[it.pageId] || []).map(t => ({ ...t, ada: false }));
    return { pageId: it.pageId, label: it.label, to: it.to, status: STATUS_KHUSUS[it.pageId] || 'siap', ada: true, tabs: [...tabsAda, ...tabsBaru], catatan: CATATAN[it.pageId] || [] };
  };
  const sisip = (grupId, list) => {
    const hasil = [...list];
    HALAMAN_RENCANA.filter(r => r.grup === grupId).forEach(r => {
      const i = hasil.findIndex(h => h.pageId === r.setelah);
      const node = { pageId: r.pageId, label: r.label, to: null, status: r.status, ada: false, ket: r.ket, tabs: (r.tabs || []).map(t => ({ ...t, ada: false })), catatan: [] };
      hasil.splice(i >= 0 ? i + 1 : hasil.length, 0, node);
    });
    return hasil;
  };
  const grup = [{
    id: 'umum', label: 'Umum', icon: '🌐',
    sub: [{ id: 'umum', label: '', halaman: [
      halaman({ pageId: 'dashboard', label: 'Dashboard', to: '/dashboard' }),
      halaman({ pageId: 'profil-saya', label: 'Profil Saya', to: '/profil-saya' }),
      halaman({ pageId: 'changelog', label: 'Riwayat Pembaruan', to: '/changelog' }),
    ] }],
  }];
  NAV_STRUCTURE.filter(n => n.type === 'group').forEach(n => {
    const sub = n.subgroups
      ? n.subgroups.map(sg => ({ id: sg.id, label: sg.label, halaman: sisip(n.id, sg.items.map(halaman)) }))
      : [{ id: n.id, label: '', halaman: sisip(n.id, n.items.map(halaman)) }];
    grup.push({ id: n.id, label: n.label, icon: n.icon, sub });
  });
  return grup;
}

export default function PetaHalaman() {
  const { HAK_AKSES_TABS } = useAppData();
  const { canAccess } = useAuth();
  const [filter, setFilter] = useState('');
  const [cari, setCari] = useState('');
  const [tampilTab, setTampilTab] = useState(true);
  const pohon = useMemo(() => susunPohon(HAK_AKSES_TABS || {}), [HAK_AKSES_TABS]);

  const hitung = useMemo(() => {
    const c = { halaman: { siap: 0, progres: 0, rencana: 0 }, tab: { siap: 0, progres: 0, rencana: 0 } };
    pohon.forEach(g => g.sub.forEach(sg => sg.halaman.forEach(h => {
      c.halaman[h.status]++;
      h.tabs.forEach(t => c.tab[t.status]++);
      h.catatan.forEach(x => c.tab[x.status]++);
    })));
    return c;
  }, [pohon]);
  const totalHal = URUT.reduce((a, k) => a + hitung.halaman[k], 0);
  const persen = Math.round((hitung.halaman.siap / totalHal) * 100);

  const q = cari.trim().toLowerCase();
  const lolos = (h) => {
    const statusSemua = [h.status, ...h.tabs.map(t => t.status), ...h.catatan.map(c => c.status)];
    if (filter && !statusSemua.includes(filter)) return false;
    if (q && !`${h.label} ${h.tabs.map(t => t.label).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  };

  return (
    <Page pageId="peta-halaman" title="Peta Halaman" path="Pengaturan / System / Peta Halaman">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div><h3>Peta halaman Siskom Qudwah</h3><p>Seluruh menu, halaman, dan tab beserta statusnya. Klik nama halaman atau tab untuk langsung membukanya.</p></div>
        </div>
        <div className="card-body">
          <div className="ph-ringkas">
            <div className="ph-angka"><b>{persen}%</b><span>halaman siap</span><div className="ph-bar"><i style={{ width: `${persen}%` }} /></div></div>
            {URUT.map(k => (
              <button key={k} type="button" className={`ph-stat ${filter === k ? 'on' : ''}`} onClick={() => setFilter(f => (f === k ? '' : k))}>
                <Lencana status={k} />
                <div><b>{hitung.halaman[k]} halaman</b><span>{STATUS_INFO[k].label}{hitung.tab[k] ? ` · ${hitung.tab[k]} tab/fitur` : ''}</span></div>
              </button>
            ))}
          </div>
          <div className="filter-bar" style={{ marginTop: 14 }}>
            <div className="field" style={{ flex: 1 }}><label>Cari halaman atau tab</label><input value={cari} onChange={e => setCari(e.target.value)} placeholder="mis. rapor, nilai, arsip" /></div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, alignSelf: 'flex-end', paddingBottom: 10 }}>
              <input type="checkbox" checked={tampilTab} onChange={e => setTampilTab(e.target.checked)} /> Tampilkan tab
            </label>
            {filter && <button className="btn btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 6 }} onClick={() => setFilter('')}>Tampilkan semua status</button>}
          </div>
        </div>
      </div>

      <div className="ph-grid">
        {pohon.map(g => {
          const subTampil = g.sub.map(sg => ({ ...sg, halaman: sg.halaman.filter(lolos) })).filter(sg => sg.halaman.length);
          if (!subTampil.length) return null;
          const semua = g.sub.flatMap(sg => sg.halaman);
          return (
            <div key={g.id} className="ph-grup">
              <div className="ph-gh"><span>{g.icon} {g.label}</span><small>{semua.filter(h => h.status === 'siap').length}/{semua.length} siap</small></div>
              {subTampil.map(sg => (
                <div key={sg.id}>
                  {sg.label && <div className="ph-sub">{sg.label}</div>}
                  <ul className="ph-list">
                    {sg.halaman.map(h => {
                      const boleh = h.ada && canAccess(h.pageId);
                      return (
                        <li key={h.pageId} className={`ph-hal ${h.ada ? '' : 'baru'}`}>
                          <div className="ph-baris">
                            <Lencana status={h.status} />
                            {h.ada && boleh ? <Link to={h.to}>{h.label}</Link> : <span className="ph-mati" title={h.ada ? 'Anda tidak punya akses ke halaman ini' : 'Belum tersedia'}>{h.label}</span>}
                            {!h.ada && <span className={`ph-tag ${STATUS_INFO[h.status].kelas}`}>{STATUS_INFO[h.status].label}</span>}
                            {h.ada && <code className="ph-url">{h.to}</code>}
                          </div>
                          {h.ket && <div className="ph-ket">{h.ket}</div>}
                          {tampilTab && h.tabs.length > 0 && (
                            <div className="ph-tabs">
                              {h.tabs.map(t => (t.ada && boleh
                                ? <Link key={t.id} to={`${h.to}?tab=${t.id}`} className={`ph-tab ${STATUS_INFO[t.status].kelas}`}><Lencana status={t.status} />{t.label}</Link>
                                : <span key={t.id} className={`ph-tab mati ${STATUS_INFO[t.status].kelas}`} title={t.ada ? '' : 'Belum tersedia'}><Lencana status={t.status} />{t.label}</span>))}
                            </div>
                          )}
                          {h.catatan.map((c, i) => <div key={i} className="ph-catatan"><Lencana status={c.status} />{c.teks}</div>)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
        Siap = halaman &amp; semua tabnya sudah dites terbuka lewat link ini tanpa error. Lingkaran setengah = sedang dikerjakan, lingkaran putus-putus = harus ada tapi belum dikerjakan. Halaman yang tidak boleh Anda buka tampil abu-abu.
      </p>
    </Page>
  );
}
