import { namaTingkat, bandingTingkat } from '../../config/jenjang';
import { useMemo, useRef, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { formatRupiah, formatTanggalTampil, initials } from '../../db/helpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { printElementById } from '../../utils/exportTable';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';
import PortofolioAkademikSiswa from '../../components/akademik/PortofolioAkademikSiswa';

function Baris({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, color: '#888', textTransform: 'uppercase', letterSpacing: .3 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value || '-'}</div>
    </div>
  );
}

function StatChip({ value, label, variant }) {
  const style = variant === 'lunas'
    ? { background: 'var(--green-soft)', color: 'var(--green-dark)' }
    : variant === 'belum-lunas'
    ? { background: '#F8E7E3', color: 'var(--red)' }
    : { background: '#F6F8F5', color: 'var(--green-dark)' };
  return (
    <div style={{ flex: 1, borderRadius: 10, padding: 12, textAlign: 'center', ...style }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10.5, opacity: .75 }}>{label}</div>
    </div>
  );
}

export default function PortofolioSiswaTab() {
  const { siswa, allTagihan, tagihanTerbayar, beasiswaSiswa, beasiswaKategori } = useAppData();
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState(null);
  const beasiswaDipilih = dipilih ? beasiswaSiswa.find(b => b.nisn === dipilih.nisn) : null;
  const inputRef = useRef(null);

  const saran = useMemo(() => {
    if (!cari.trim() || dipilih) return [];
    const t = cari.trim().toLowerCase();
    return siswa.filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t)).slice(0, 8);
  }, [cari, siswa, dipilih]);

  const keuangan = useMemo(() => {
    if (!dipilih) return null;
    const cutoffMs = Date.now();
    const milikSiswa = allTagihan.filter(t => t.nisn === dipilih.nisn);
    let totalTagihan = 0, totalSisa = 0;
    milikSiswa.forEach(t => {
      const terbayar = tagihanTerbayar(t.refType, t.no, t.nisn);
      const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar);
      totalTagihan += nominalEfektif;
      totalSisa += Math.max(0, nominalEfektif - terbayar);
    });
    return { totalTagihan, totalSisa, statusLunas: totalSisa === 0 };
  }, [dipilih, allTagihan, tagihanTerbayar, beasiswaSiswa, beasiswaKategori]);

  function pilih(s) { setDipilih(s); setCari(s.nama); }
  function gantiSiswa() { setDipilih(null); setCari(''); }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>🪪 Portofolio Siswa</h3><p>Cari siswa untuk melihat profil lengkapnya, siap cetak.</p></div>
        {dipilih && (
          <div style={{ display: 'flex', gap: 8 }} className="no-print">
            <button className="btn btn-sm" onClick={gantiSiswa}>🔄 Ganti Siswa</button>
            <button className="btn btn-primary btn-sm" onClick={() => printElementById('portofolio-siswa-print')}>🖨️ Cetak / Ekspor PDF</button>
          </div>
        )}
      </div>
      <div className="card-body">
        {!dipilih && (
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <input
              ref={inputRef}
              type="text" value={cari} onChange={e => setCari(e.target.value)}
              placeholder="Cari nama atau NISN..." style={{ width: '100%' }}
            />
            <SuggestionDropdown anchorRef={inputRef} visible={saran.length > 0}>
              {saran.map(s => (
                <div key={s.id} onClick={() => pilih(s)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(s.nama)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>NISN: {s.nisn || '-'} · {s.kelasTingkat ? namaTingkat(s.kelasTingkat) : 'Kelas -'}</div>
                  </div>
                </div>
              ))}
            </SuggestionDropdown>
            <SuggestionDropdown anchorRef={inputRef} visible={!!cari.trim() && saran.length === 0}>
              <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>
                Tidak ditemukan siswa dengan nama atau NISN mengandung "{cari.trim()}". Coba kata kunci lain, atau cek ejaannya di menu Data Siswa (Tabel).
              </div>
            </SuggestionDropdown>
          </div>
        )}

        {dipilih && (
          <div id="portofolio-siswa-print" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.08)', border: '1px solid var(--border)' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--green), var(--green-dark))', padding: '32px 28px 26px', color: '#fff', position: 'relative' }}>
                <div style={{ width: 70, height: 70, borderRadius: 14, background: 'var(--gold)', position: 'absolute', right: 26, top: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--green-dark)' }}>
                  {initials(dipilih.nama)}
                </div>
                <h2 style={{ fontSize: 22, margin: 0 }}>{dipilih.nama}</h2>
                <div style={{ fontSize: 12.5, opacity: .85, marginTop: 4 }}>NISN: {dipilih.nisn || '-'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <span style={{ background: 'rgba(255,255,255,.2)', padding: '4px 12px', borderRadius: 999, fontSize: 11 }}>{dipilih.status || 'Aktif'}</span>
                  <span style={{ background: 'rgba(255,255,255,.2)', padding: '4px 12px', borderRadius: 999, fontSize: 11 }}>{dipilih.kelasTingkat ? namaTingkat(dipilih.kelasTingkat) : 'Kelas -'}</span>
                  <span style={{ background: 'rgba(255,255,255,.2)', padding: '4px 12px', borderRadius: 999, fontSize: 11 }}>{dipilih.jenisKelamin || '-'}</span>
                  {beasiswaDipilih && (
                    <span style={{ background: 'var(--gold)', color: 'var(--green-dark)', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>🎓 {beasiswaDipilih.kategoriBeasiswa}</span>
                  )}
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--gold)' }} />
              <div style={{ padding: 28, background: '#fff' }}>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green-dark)', borderBottom: '2px solid var(--green-soft)', paddingBottom: 6, marginBottom: 12 }}>Data Pribadi</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                    <Baris label="Tempat, Tanggal Lahir" value={`${dipilih.tempatLahir || '-'}, ${formatTanggalTampil(dipilih.tanggalLahir) || '-'}`} />
                    <Baris label="NIK" value={dipilih.nik} />
                    <Baris label="Jenjang / NPSN" value={`${dipilih.jenjang || '-'} / ${dipilih.npsn || '-'}`} />
                    <Baris label="Jenis Pendaftaran" value={dipilih.jenisPendaftaran} />
                    <Baris label="Nama Ayah Kandung" value={dipilih.namaAyah} />
                    <Baris label="Nama Ibu Kandung" value={dipilih.namaIbu} />
                    <Baris label="Pekerjaan Orang Tua" value={dipilih.pekerjaan} />
                    <Baris label="Alamat" value={dipilih.alamat} />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green-dark)', borderBottom: '2px solid var(--green-soft)', paddingBottom: 6, marginBottom: 12 }}>Kewajiban Keuangan</div>
                  {keuangan && (
                    <div style={{ display: 'flex', gap: 14 }}>
                      <StatChip value={formatRupiah(keuangan.totalTagihan)} label="Total Tagihan" />
                      <StatChip value={formatRupiah(keuangan.totalSisa)} label="Sisa Belum Dibayar" />
                      <StatChip value={keuangan.statusLunas ? 'Lunas' : 'Belum Lunas'} label="Status" variant={keuangan.statusLunas ? 'lunas' : 'belum-lunas'} />
                    </div>
                  )}
                </div>

                <PortofolioAkademikSiswa nisn={dipilih.nisn} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
