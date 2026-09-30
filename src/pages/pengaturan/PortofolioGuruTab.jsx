import { useMemo, useRef, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { formatTanggalTampil, initials } from '../../db/helpers';
import { printElementById } from '../../utils/exportTable';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';

function SideBlock({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ textAlign: 'left', marginBottom: 16 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, opacity: .7 }}>{label}</div>
      <div style={{ fontSize: 12.5 }}>{value}</div>
    </div>
  );
}

function MainSection({ title, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--green-dark)', borderBottom: '2px solid var(--green-dark)', paddingBottom: 6, marginBottom: 12, marginTop: 22 }}>{title}</div>
      {children}
    </div>
  );
}

export default function PortofolioGuruTab() {
  const { guru } = useAppData();
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState(null);
  const inputRef = useRef(null);

  const saran = useMemo(() => {
    if (!cari.trim() || dipilih) return [];
    const t = cari.trim().toLowerCase();
    return guru.filter(g => g.nama.toLowerCase().includes(t) || g.nip.includes(t)).slice(0, 8);
  }, [cari, guru, dipilih]);

  function pilih(g) { setDipilih(g); setCari(g.nama); }
  function gantiOrang() { setDipilih(null); setCari(''); }

  const tugasList = dipilih?.tugasTambahan ? dipilih.tugasTambahan.split(';').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>🪪 Portofolio Guru / Staff</h3><p>Riwayat hidup (CV) elegan, siap cetak.</p></div>
        {dipilih && (
          <div style={{ display: 'flex', gap: 8 }} className="no-print">
            <button className="btn btn-sm" onClick={gantiOrang}>🔄 Ganti Orang</button>
            <button className="btn btn-primary btn-sm" onClick={() => printElementById('portofolio-guru-print')}>🖨️ Cetak / Ekspor PDF</button>
          </div>
        )}
      </div>
      <div className="card-body">
        {!dipilih && (
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <input
              ref={inputRef}
              type="text" value={cari} onChange={e => setCari(e.target.value)}
              placeholder="Cari nama atau NIP/NUPTK..." style={{ width: '100%' }}
            />
            <SuggestionDropdown anchorRef={inputRef} visible={saran.length > 0}>
              {saran.map(g => (
                <div key={g.id} onClick={() => pilih(g)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(g.nama)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.kategori} · {g.nip || '-'}</div>
                  </div>
                </div>
              ))}
            </SuggestionDropdown>
            <SuggestionDropdown anchorRef={inputRef} visible={!!cari.trim() && saran.length === 0}>
              <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>
                Tidak ditemukan guru/staff dengan nama atau NIP mengandung "{cari.trim()}". Coba kata kunci lain, atau cek ejaannya di menu Data Guru & Staff (Tabel).
              </div>
            </SuggestionDropdown>
          </div>
        )}

        {dipilih && (
          <div id="portofolio-guru-print" style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.08)', border: '1px solid var(--border)', fontFamily: 'Georgia, Cambria, serif' }}>
              <div style={{ width: 240, background: 'linear-gradient(160deg, var(--green), var(--green-dark))', color: '#fff', padding: '30px 22px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--green-soft)', border: '4px solid var(--gold)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'var(--green-dark)' }}>
                  {initials(dipilih.nama)}
                </div>
                <h2 style={{ fontSize: 15.5, margin: '0 0 4px', wordBreak: 'break-word', lineHeight: 1.35 }}>{dipilih.nama}</h2>
                <div style={{ fontSize: 11.5, opacity: .85, marginBottom: 20 }}>{dipilih.kategori}</div>
                <SideBlock label="Kontak" value={[dipilih.tempatLahir, dipilih.hp].filter(Boolean).join(' · ')} />
                <SideBlock label="NIP / NUPTK" value={dipilih.nip} />
                <SideBlock label="Pangkat / Golongan" value={dipilih.pangkatGolongan} />
                <SideBlock label="TMT" value={formatTanggalTampil(dipilih.tmtMengajar)} />
                <SideBlock label="Status Kepegawaian" value={dipilih.statusKepegawaian} />
                <SideBlock label="Status Aktif" value={dipilih.status} />
              </div>
              <div style={{ flex: 1, padding: '30px 30px', background: '#FBF9F4' }}>
                <MainSection title="Pendidikan Terakhir">
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{dipilih.pendidikanTerakhir || '-'}</div>
                </MainSection>

                {dipilih.kategori !== 'Staff' && (
                  <MainSection title="Mengajar">
                    <div style={{ fontSize: 13.5 }}>{dipilih.mapel || '-'}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6355', fontStyle: 'italic', marginTop: 2 }}>
                      {dipilih.jumlahJamMengajar ? `${dipilih.jumlahJamMengajar} jam/minggu` : ''}
                      {dipilih.sertifikasi ? ` · Sertifikasi: ${dipilih.sertifikasi}` : ''}
                    </div>
                  </MainSection>
                )}

                {tugasList.length > 0 && (
                  <MainSection title="Tugas Tambahan">
                    {tugasList.map((t, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {t}</div>)}
                  </MainSection>
                )}

                <MainSection title="Data Diri">
                  <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                    Tempat/Tgl Lahir: {dipilih.tempatLahir || '-'}, {formatTanggalTampil(dipilih.tanggalLahir) || '-'}<br />
                    Jenis Kelamin: {dipilih.jenisKelamin || '-'}<br />
                    Email: {dipilih.email || '-'}
                  </div>
                </MainSection>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
