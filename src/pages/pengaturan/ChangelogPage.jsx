import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import { CHANGELOG } from '../../data/changelog';

const PER_HALAMAN = 10;

function formatTanggalIndo(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChangelogPage() {
  // Dikelompokkan per versi, TERTUTUP semua secara default -- isi poinnya baru
  // muncul kalau baris versinya diklik, biar halaman tidak langsung penuh dgn
  // seluruh riwayat sekaligus. State cuma simpan versi mana saja yg lagi terbuka.
  const [terbuka, setTerbuka] = useState(() => new Set());
  // Sejak v1.31.30: daftar changelog dipaginasi 10 per halaman (Next/Back) supaya
  // tidak perlu scroll panjang -- daftarnya sudah ratusan versi.
  const [halaman, setHalaman] = useState(1);

  const totalHalaman = Math.max(1, Math.ceil(CHANGELOG.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const dataHalaman = useMemo(() => {
    const mulai = (halamanAman - 1) * PER_HALAMAN;
    return CHANGELOG.slice(mulai, mulai + PER_HALAMAN);
  }, [halamanAman]);

  function toggle(versi) {
    setTerbuka(prev => {
      const next = new Set(prev);
      if (next.has(versi)) next.delete(versi);
      else next.add(versi);
      return next;
    });
  }

  function gantiHalaman(h) {
    setHalaman(h);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <Page pageId="changelog" title="Riwayat Pembaruan" path="Pengaturan / Riwayat Pembaruan">
      <div className="card">
        <div className="card-body">
          <div className="changelog-timeline">
            {dataHalaman.map((entri, idx) => {
              const sedangTerbuka = terbuka.has(entri.versi);
              const idxGlobal = (halamanAman - 1) * PER_HALAMAN + idx;
              return (
                <div key={entri.versi} className={`changelog-entry${idxGlobal === 0 ? ' terbaru' : ''}`}>
                  <div className="changelog-dot" />
                  <div className="changelog-ver-row changelog-ver-row-clickable" onClick={() => toggle(entri.versi)}>
                    <span className={`changelog-arrow${sedangTerbuka ? ' open' : ''}`}>▸</span>
                    <span className="changelog-ver-badge">v{entri.versi}</span>
                    <span className="changelog-tanggal">{formatTanggalIndo(entri.tanggal)}</span>
                    {idxGlobal === 0 && <span className="changelog-tag-terbaru">Terbaru</span>}
                  </div>
                  {sedangTerbuka && (
                    <div className="changelog-card">
                      <ul>
                        {entri.poin.map((p, i) => <li key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalHalaman > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 22 }}>
              <button className="btn btn-sm" onClick={() => gantiHalaman(halamanAman - 1)} disabled={halamanAman <= 1}>
                ← Sebelumnya
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Halaman {halamanAman} dari {totalHalaman}</span>
              <button className="btn btn-sm" onClick={() => gantiHalaman(halamanAman + 1)} disabled={halamanAman >= totalHalaman}>
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
