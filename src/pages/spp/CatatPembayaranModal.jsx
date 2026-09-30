import { useMemo, useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import KwitansiModal from '../keuangan/KwitansiModal';
import BayarSekaligusModal from '../keuangan/BayarSekaligusModal';
import { addPembayaranToSheet, addLogEntry } from '../../services/googleSheets';
import { statusTagihan } from '../../db/tagihanHelpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { METODE_BAYAR_OPTIONS, SARAN_AKUN_PER_METODE } from '../../db/pembayaranFields';
import { akunAktivaOptions } from '../../db/akunBukuBesarFields';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { initials, avatarColor, todayWIB, formatTanggalTampil, formatRupiah } from '../../db/helpers';

// Sejak v1.31.16: dulu "Catat Pembayaran" berupa form yang SELALU tampil di
// atas halaman Pembayaran -- sekarang jadi tombol yang membuka modal LEBAR
// 2 kolom: kiri form cari-siswa & catat pembayaran (isi/logikanya sama persis
// dgn yang dulu, cuma dipindah kesini), kanan riwayat pembayaran siswa yang
// SEDANG dipilih saja -- supaya admin bisa langsung cek riwayat sblm/sesudah
// mencatat pembayaran baru, tanpa pindah ke tabel Riwayat Pembayaran di bawah.
export default function CatatPembayaranModal({ onClose }) {
  const { siswa, kelas, allTagihan, pembayaran, tagihanTerbayar, toast, akun, beasiswaSiswa, beasiswaKategori, refreshPembayaran } = useAppData();
  const { currentUser } = useAuth();

  const [term, setTerm] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState(null);
  const inputRef = useRef(null);
  const [selectedTagihanId, setSelectedTagihanId] = useState(null);
  const [nominal, setNominal] = useState('');
  // Tanggal pembayaran per BARIS tagihan (bukan 1 tanggal global) -- diisi user DULU
  // sblm tombol "Bayar Sekarang" aktif. Sengaja KOSONG di awal (bukan otomatis hari
  // ini) supaya admin selalu SADAR memilih tanggalnya sendiri.
  const [tanggalPerBaris, setTanggalPerBaris] = useState({});
  const [tanggalBayar, setTanggalBayar] = useState(() => todayWIB());
  const [metode, setMetode] = useState(METODE_BAYAR_OPTIONS[0]);
  const [akunPenerima, setAkunPenerima] = useState(SARAN_AKUN_PER_METODE[METODE_BAYAR_OPTIONS[0]] || 'Kas');
  // Wajib diisi utk pembayaran DI LUAR SPP (refType !== 'SPP') -- lihat submitPembayaran.
  const [keterangan, setKeterangan] = useState('');
  // Cuma dipakai kalau tagihan yg dipilih punya Nilai Cicilan (dari Tarif, lihat
  // pilihTagihan) -- pilih mau bayar berapa KALI cicilan sekaligus (1x, 2x, dst).
  // Nominal & Keterangan otomatis mengikuti pilihan ini (lihat handleGantiJumlahCicilan).
  const [jumlahCicilan, setJumlahCicilan] = useState(1);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null); // null | 'saving' | 'done'
  const [lihatKwitansi, setLihatKwitansi] = useState(null);
  const [bayarSekaligus, setBayarSekaligus] = useState(false);

  const [filterKelas, setFilterKelas] = useState('');
  const [filterRombel, setFilterRombel] = useState('');

  const daftarKelasOptions = useMemo(() => {
    const set = new Set(kelas.map(k => k.tingkat).filter(Boolean));
    return Array.from(set).sort();
  }, [kelas]);

  const daftarRombelOptions = useMemo(() => {
    if (!filterKelas) return [];
    const set = new Set(kelas.filter(k => k.tingkat === filterKelas).map(k => k.namaKelas).filter(Boolean));
    return Array.from(set).sort();
  }, [kelas, filterKelas]);

  function gantiFilterKelas(v) {
    setFilterKelas(v);
    setFilterRombel('');
  }

  const suggestions = useMemo(() => {
    if (!term.trim() || selectedSiswaId) return [];
    const t = term.toLowerCase();
    return siswa
      .filter(s => !filterKelas || s.kelasTingkat === filterKelas)
      .filter(s => !filterRombel || s.rombel === filterRombel)
      .filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t))
      .slice(0, 6);
  }, [term, siswa, selectedSiswaId, filterKelas, filterRombel]);

  const selectedSiswa = siswa.find(s => s.id === selectedSiswaId);

  const tagihanBelumLunasSiswa = useMemo(() => {
    if (!selectedSiswa) return [];
    const cutoffMs = Date.now();
    return allTagihan
      .filter(t => t.nisn === selectedSiswa.nisn)
      .map(t => {
        const terbayar = tagihanTerbayar(t.refType, t.no, t.nisn);
        const { nominalEfektif, potongan } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar);
        const sisa = nominalEfektif - terbayar;
        return { ...t, nominalAsli: t.nominal, nominalEfektif, potonganBeasiswa: potongan, terbayar, sisa, status: statusTagihan(nominalEfektif, terbayar) };
      })
      .filter(t => t.sisa > 0 || t.potonganBeasiswa);
  }, [selectedSiswa, allTagihan, tagihanTerbayar, beasiswaSiswa, beasiswaKategori]);

  const selectedTagihan = tagihanBelumLunasSiswa.find(t => t.id === selectedTagihanId);

  function pilihSiswa(s) {
    setSelectedSiswaId(s.id);
    setTerm(s.nama);
    setSelectedTagihanId(null);
    setNominal('');
    setKeterangan('');
    setJumlahCicilan(1);
    setTanggalPerBaris({});
  }

  function gantiSiswa() {
    setSelectedSiswaId(null);
    setTerm('');
    setSelectedTagihanId(null);
    setNominal('');
    setKeterangan('');
    setJumlahCicilan(1);
    setTanggalPerBaris({});
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function pilihTagihan(t, tanggal) {
    setSelectedTagihanId(t.id);
    // Default nominal: kalau tagihan ini punya Nilai Cicilan (diatur di Tarif), pakai
    // itu utk 1x cicilan (dibatasi maksimal sisa tagihan) -- bukan langsung sisa penuh.
    // Kalau tidak ada cicilan diatur (0), perilaku lama tetap sama: default ke sisa penuh.
    const cicilan = Number(t.cicilan) || 0;
    const defaultNominal = cicilan > 0 ? Math.min(cicilan, t.sisa) : t.sisa;
    setNominal(String(defaultNominal));
    // Preset "1 kali cicilan" di Keterangan cuma relevan kalau nominalnya memang
    // TERKUNCI ikut kelipatan Cicilan (t.nominalTetap = Ya) -- kalau nominalnya bebas
    // diedit, jangan preset teks yg bisa jadi salah/menyesatkan begitu admin ganti
    // nominalnya manual (mis. Uang Bangunan yg py Cicilan cuma sbg referensi, tapi
    // Nominal Tetap = Tidak supaya bebas dibayar berapa aja per termin).
    setKeterangan(cicilan > 0 && t.nominalTetap ? '1 kali cicilan' : '');
    setJumlahCicilan(1);
    setTanggalBayar(tanggal || todayWIB());
  }

  // Dipanggil saat admin ganti pilihan "Jumlah Kali Cicilan" -- Nominal & Keterangan
  // langsung mengikuti pilihan ini (ditulis ulang otomatis), tapi keduanya tetap
  // field biasa yg bisa diedit manual lagi sesudahnya kalau perlu.
  function handleGantiJumlahCicilan(t, n) {
    const cicilan = Number(t.cicilan) || 0;
    setJumlahCicilan(n);
    setNominal(String(Math.min(cicilan * n, t.sisa)));
    setKeterangan(`${n} kali cicilan`);
  }

  function handleGantiMetode(m) {
    setMetode(m);
    setAkunPenerima(SARAN_AKUN_PER_METODE[m] || 'Kas');
  }

  async function submitPembayaran(e) {
    e?.preventDefault();
    if (!selectedTagihan) { toast('Pilih tagihan yang mau dibayar dulu.', 'error'); return; }
    const nom = Number(nominal);
    const bolehNol = selectedTagihan.potonganBeasiswa && selectedTagihan.sisa === 0;
    if ((!nom || nom <= 0) && !bolehNol) { toast('Nominal harus lebih dari 0.', 'error'); return; }
    if (nom < 0 || nom > selectedTagihan.sisa) { toast(`Nominal tidak boleh melebihi sisa tagihan (${formatRupiah(selectedTagihan.sisa)}).`, 'error'); return; }
    // Keterangan WAJIB diisi utk pembayaran DI LUAR SPP (Uang Pangkal, Seragam, dst) --
    // SPP tidak diwajibkan krn jenisnya sendiri sudah jelas dari label bulan/tahunnya.
    if (selectedTagihan.refType !== 'SPP' && !keterangan.trim()) {
      toast('Keterangan wajib diisi untuk pembayaran di luar SPP.', 'error');
      return;
    }
    setSaving(true);
    setPhase('saving');
    try {
      const catatanBeasiswa = selectedTagihan.potonganBeasiswa
        ? `Potongan Beasiswa: ${selectedTagihan.potonganBeasiswa.kategori.nama} (${formatRupiah(selectedTagihan.potonganBeasiswa.nominalPotongan)}) -- nominal asli ${formatRupiah(selectedTagihan.nominalAsli)}`
        : '';
      const row = {
        RefType: selectedTagihan.refType,
        RefNo: selectedTagihan.no,
        NISN: selectedSiswa.nisn,
        'Nama Siswa': selectedSiswa.nama,
        Jenis: selectedTagihan.label,
        Nominal: nom,
        'Tanggal Bayar': tanggalBayar,
        Metode: metode,
        Akun: akunPenerima,
        // Gabungkan catatan potongan beasiswa (fakta historis otomatis) DENGAN keterangan
        // manual dari admin -- keduanya independen, tidak saling menimpa.
        Keterangan: [catatanBeasiswa, keterangan.trim()].filter(Boolean).join(' | '),
      };
      await addPembayaranToSheet(row);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Catat Pembayaran',
        modul: 'Pembayaran & Invoice',
        detail: `${selectedTagihan.label} - ${selectedSiswa.nisn} ${selectedSiswa.nama} - ${formatRupiah(nom)}${selectedTagihan.potonganBeasiswa ? ` (potongan beasiswa ${selectedTagihan.potonganBeasiswa.kategori.nama})` : ''}`,
      });
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      setTanggalPerBaris(prev => { const { [selectedTagihan.id]: _hapus, ...sisanya } = prev; return sisanya; });
      setSelectedTagihanId(null);
      setNominal('');
      setKeterangan('');
      setJumlahCicilan(1);
      refreshPembayaran();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  const riwayatSiswaIni = useMemo(() => {
    if (!selectedSiswa) return [];
    return pembayaran.filter(p => p.nisn === selectedSiswa.nisn).slice().reverse();
  }, [pembayaran, selectedSiswa]);

  const totalRiwayat = useMemo(() => riwayatSiswaIni.reduce((s, p) => s + p.nominal, 0), [riwayatSiswaIni]);

  return (
    <>
      <Modal title="Catat Pembayaran" subtitle="Cari siswa, pilih tagihan yang mau dibayar, lalu simpan." onClose={onClose} wide>
        <div className="cp-modal-grid">
          {/* ===== Kolom 1: cari siswa + pilih tagihan + form bayar ===== */}
          <div className="cp-modal-col">
            <h4>1. Cari Siswa &amp; Tagihan</h4>
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div className="field" style={{ minWidth: 140 }}>
                <label>Pilih Kelas</label>
                <select value={filterKelas} onChange={e => gantiFilterKelas(e.target.value)} disabled={!!selectedSiswa}>
                  <option value="">Semua Kelas</option>
                  {daftarKelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div className="field" style={{ minWidth: 140 }}>
                <label>Pilih Rombel</label>
                <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)} disabled={!filterKelas || !!selectedSiswa}>
                  <option value="">Semua Rombel</option>
                  {daftarRombelOptions.map(r => <option key={r} value={r}>Rombel {r}</option>)}
                </select>
              </div>
            </div>

            {!selectedSiswa && (
              <div style={{ marginBottom: 18, position: 'relative' }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Cari Siswa</label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nama atau NISN..."
                  value={term}
                  onChange={e => { setTerm(e.target.value); setSelectedSiswaId(null); setSelectedTagihanId(null); }}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                  autoFocus
                />
                <SuggestionDropdown anchorRef={inputRef} visible={suggestions.length > 0}>
                  {suggestions.map(s => (
                    <div key={s.id} onClick={() => pilihSiswa(s)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(s.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{initials(s.nama)}</div>
                      <div style={{ fontSize: 13 }}>{s.nama} <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>· {s.nisn}</span></div>
                    </div>
                  ))}
                </SuggestionDropdown>
              </div>
            )}

            {selectedSiswa && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'var(--green-soft)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(selectedSiswa.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700 }}>{initials(selectedSiswa.nama)}</span>
                    <b>{selectedSiswa.nama}</b> <span style={{ color: 'var(--muted)' }}>· {selectedSiswa.nisn}</span>
                  </span>
                  <button type="button" className="btn btn-sm" onClick={gantiSiswa}>Ganti Siswa</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Pilih Tagihan Belum Lunas</label>
                  <button type="button" className="btn btn-sm" onClick={() => setBayarSekaligus(true)}>🗓️ Bayar Sekaligus</button>
                </div>
                {tagihanBelumLunasSiswa.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Semua tagihan siswa ini sudah lunas. 🎉</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tagihanBelumLunasSiswa.map(t => {
                    const tanggalDipilih = tanggalPerBaris[t.id] || '';
                    const isSelected = t.id === selectedTagihanId;
                    return (
                      <div key={t.id}>
                        <div
                          style={{
                            padding: '10px 14px', border: `1.5px solid ${isSelected ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius: isSelected ? '8px 8px 0 0' : 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexWrap: 'wrap', gap: 10, background: '#fff',
                          }}
                        >
                          <span style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            {t.label} <span className={`badge ${t.status === 'Sebagian' ? 'badge-gold' : 'badge-red'}`}>{t.status}</span>
                            <input
                              type="date"
                              value={tanggalDipilih}
                              max={todayWIB()}
                              onChange={e => setTanggalPerBaris(prev => ({ ...prev, [t.id]: e.target.value }))}
                              style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}
                              title="Pilih tanggal pembayaran (boleh tanggal mundur) dulu sebelum bisa Bayar Sekarang"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={!tanggalDipilih}
                              onClick={() => pilihTagihan(t, tanggalDipilih)}
                              title={!tanggalDipilih ? 'Pilih tanggal pembayaran dulu' : undefined}
                            >
                              {isSelected ? 'Ganti Rincian' : 'Bayar Sekarang'}
                            </button>
                          </span>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>Sisa {formatRupiah(t.sisa)}</span>
                        </div>

                        {isSelected && (
                          <div style={{ border: '1.5px solid var(--green)', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'var(--green-soft)', padding: 16 }}>
                            {t.potonganBeasiswa && (
                              <div style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 14, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                                  <span>Nominal Tagihan Asli</span>
                                  <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{formatRupiah(t.nominalAsli)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                                  <span>Potongan Beasiswa <span style={{ background: 'var(--gold)', color: 'var(--green-dark)', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, marginLeft: 6 }}>🎓 {t.potonganBeasiswa.kategori.nama} -{formatRupiah(t.potonganBeasiswa.nominalPotongan)}</span></span>
                                  <span style={{ color: 'var(--red)' }}>- {formatRupiah(t.nominalAsli - t.nominalEfektif)}</span>
                                </div>
                                <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--green-soft)', borderRadius: 8, padding: '10px 14px' }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green-dark)' }}>Nominal Setelah Potongan</span>
                                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>{formatRupiah(t.nominalEfektif)}</span>
                                </div>
                              </div>
                            )}
                            <div className="form-grid">
                              {/* Sejak v1.31.25: dropdown ini cuma muncul kalau nominalnya memang
                                  TERKUNCI (t.nominalTetap = Ya) -- soalnya dulu dropdown ini tetap
                                  tampil walau Nominal Tetap = Tidak, jadi bisa "1 dipilih 2x cicilan"
                                  di dropdown TAPI nominal yg dicatat malah diketik manual beda sendiri
                                  (kasus ambigu Uang Bangunan: Cicilan diisi cuma sbg referensi, tapi
                                  Nominal Tetap = Tidak supaya bebas dibayar berapa aja per termin).
                                  Kalau nominal bebas diedit, referensi Nilai Cicilan cukup ditampilkan
                                  sbg teks bantuan di bawah field Nominal Dibayar (lihat di bawah). */}
                              {Number(t.cicilan) > 0 && t.nominalTetap && (
                                <div className="field">
                                  <label>Jumlah Kali Cicilan</label>
                                  <select value={jumlahCicilan} onChange={e => handleGantiJumlahCicilan(t, Number(e.target.value))}>
                                    {Array.from({ length: Math.max(1, Math.ceil(t.sisa / Number(t.cicilan))) }, (_, i) => i + 1).map(n => (
                                      <option key={n} value={n}>{n}x — {formatRupiah(Math.min(Number(t.cicilan) * n, t.sisa))}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div className="field">
                                <label>Nominal Dibayar (Rp)</label>
                                {/* Sejak v1.31.24: kunci/buka field ini SEPENUHNYA ditentukan oleh
                                    `t.nominalTetap` -- field "Nominal Tetap Saat Bayar?" yg diatur di
                                    Tarif (lihat tarifFields.js), disalin ke tiap tagihan SAAT diterbitkan
                                    (spt Cicilan), dibaca di sini lewat normalizeSheetTagihanSpp/Lain
                                    (tagihanHelpers.js). Ini MENGGANTIKAN 2 aturan hardcode sebelumnya:
                                    v1.31.22 (Tagihan Lain dikunci OTOMATIS kalau py Cicilan, tanpa cara
                                    diatur) & v1.31.23 (SPP dikunci PERMANEN, tanpa cara diatur) -- sekarang
                                    Admin yg pegang kendali penuh per Tarif, termasuk bisa membuka kunci
                                    SPP lagi (utk bayar sebagian) atau mengunci Tagihan Lain walau TIDAK py
                                    Cicilan, tinggal ganti "Nominal Tetap Saat Bayar?" di Tarif-nya.
                                    Pesannya beda tergantung KENAPA terkunci, murni supaya jelas dibaca:
                                    SPP -> tidak py opsi cicilan sama sekali; py Cicilan -> ikuti kelipatan
                                    Jumlah Kali Cicilan; selain itu -> generic "sudah ditentukan Tetap". */}
                                {t.nominalTetap ? (
                                  <>
                                    <input type="number" value={nominal} disabled style={{ background: 'var(--green-soft)', color: 'var(--muted)', cursor: 'not-allowed' }} />
                                    <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>
                                      {t.refType === 'SPP'
                                        ? '🔒 Nominal SPP dikunci sebesar sisa tagihan bulan ini -- tidak bisa diedit manual maupun dibayar sebagian lewat sini.'
                                        : Number(t.cicilan) > 0
                                          ? '🔒 Nominal mengikuti Nilai Cicilan yang sudah ditentukan saat tagihan ini dibuat -- tidak bisa diedit manual. Ganti pilihan "Jumlah Kali Cicilan" di atas kalau mau bayar jumlah kali yang berbeda.'
                                          : '🔒 Nominal tagihan ini sudah ditentukan Tetap saat dibuat -- tidak bisa diedit manual. Kalau perlu diubah, atur "Nominal Tetap Saat Bayar?" jadi "Tidak" di Tarif-nya (berlaku utk tagihan berikutnya) atau langsung di tabel Daftar Tagihan Lain (khusus tagihan ini).'}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <input type="number" value={nominal} onChange={e => setNominal(e.target.value)} max={t.sisa} />
                                    {Number(t.cicilan) > 0 && (
                                      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>
                                        💡 Nilai cicilan standar (referensi saja, boleh dibayar dengan jumlah berbeda): {formatRupiah(Number(t.cicilan))} per kali.
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="field">
                                <label>Tanggal Bayar</label>
                                <input type="date" value={tanggalBayar} onChange={e => setTanggalBayar(e.target.value)} />
                              </div>
                              <div className="field">
                                <label>Metode</label>
                                <select value={metode} onChange={e => handleGantiMetode(e.target.value)}>
                                  {METODE_BAYAR_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                              <div className="field">
                                <label>Akun Kas/Bank Penerima</label>
                                <select value={akunPenerima} onChange={e => setAkunPenerima(e.target.value)}>
                                  {akunAktivaOptions(akun).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </div>
                              <div className="field span2">
                                <label>Keterangan{t.refType !== 'SPP' && <span style={{ color: 'var(--red)' }}> *</span>}</label>
                                <input
                                  type="text"
                                  value={keterangan}
                                  onChange={e => setKeterangan(e.target.value)}
                                  placeholder={t.refType !== 'SPP' ? 'Wajib diisi, mis. cicilan ke-2 dari 3' : 'Opsional'}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                              <button type="button" className="btn" onClick={() => setSelectedTagihanId(null)}>Batal</button>
                              <button type="button" className="btn btn-primary" onClick={submitPembayaran} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===== Kolom 2: riwayat pembayaran siswa yang sedang dipilih ===== */}
          <div className="cp-modal-col">
            <h4>2. Riwayat Pembayaran{selectedSiswa ? ` — ${selectedSiswa.nama}` : ''}</h4>
            {!selectedSiswa && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Pilih siswa dulu di kolom kiri untuk melihat riwayat pembayarannya di sini.</p>}
            {selectedSiswa && riwayatSiswaIni.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Siswa ini belum pernah tercatat melakukan pembayaran.</p>}
            {selectedSiswa && riwayatSiswaIni.length > 0 && (
              <>
                <div className="cp-riwayat-scroll">
                  <table>
                    <thead><tr><th>Tanggal</th><th>Jenis</th><th style={{ textAlign: 'right' }}>Nominal</th><th className="no-print"></th></tr></thead>
                    <tbody>
                      {riwayatSiswaIni.map(p => (
                        <tr key={p.id}>
                          <td>{formatTanggalTampil(p.tanggalBayar)}</td>
                          <td>{p.jenis}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(p.nominal)}</td>
                          <td className="no-print"><button type="button" className="btn-icon" title="Lihat Kwitansi" onClick={() => setLihatKwitansi(p)}>🧾</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 10, padding: '8px 4px' }}>
                  <span>Total ({riwayatSiswaIni.length} transaksi)</span>
                  <span>{formatRupiah(totalRiwayat)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {lihatKwitansi && <KwitansiModal pembayaran={lihatKwitansi} onClose={() => setLihatKwitansi(null)} />}
      {bayarSekaligus && selectedSiswa && <BayarSekaligusModal siswa={selectedSiswa} onClose={() => setBayarSekaligus(false)} />}
      {phase && <SaveProgressModal phase={phase} />}
    </>
  );
}
