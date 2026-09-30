import { useMemo, useState, Fragment } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  bulkUpdateSiswaInSheet, bulkUpdateTagihanSppInSheet, bulkUpdateTagihanLainInSheet,
  bulkUpdatePembayaranInSheet, addLogEntry,
} from '../../services/googleSheets';

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

// Buat daftar kode NISN SEMENTARA berurutan (mis. IKH0001, IKH0002, ...) sebanyak yg
// dibutuhkan -- kode yg KEBETULAN sudah dipakai siswa lain (mis. sisa dari batch
// sebelumnya, atau NISN asli yg formatnya kebetulan sama) dilewati otomatis supaya
// tidak ada 2 siswa kembar NISN-nya.
function buatKodeSementara(prefix, jumlahDigit, jumlahDibutuhkan, nisnSudahDipakai) {
  const hasil = [];
  let n = 1;
  while (hasil.length < jumlahDibutuhkan && n <= 999999) {
    const kode = prefix + String(n).padStart(jumlahDigit, '0');
    if (!nisnSudahDipakai.has(kode.toUpperCase())) hasil.push(kode);
    n++;
  }
  return hasil;
}

// Kelompokkan baris jadi { nama, jumlah } unik -- dipakai utk daftar "nama yang
// sudah ada NISN" (biasanya panjang, jadi cukup diringkas per nama + berapa baris).
function kelompokNama(rows, getNama) {
  const map = new Map();
  rows.forEach(r => {
    const nama = getNama(r) || '(tanpa nama)';
    map.set(nama, (map.get(nama) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

// Analisis 1 sumber data (Data Siswa / Tagihan SPP / Tagihan Lain / Pembayaran) --
// pisahkan baris yg NISN-nya kosong vs terisi, siapkan daftar utk ditampilkan. Utk
// sumber transaksi (bukan 'siswa'), sekalian dihitung mana yg bisa diperbaiki
// OTOMATIS lewat pencocokan nama ke Data Siswa (siswaList).
function analisisSumber({ key, label, rows, getNama, getNisn, getDetail }, siswaList) {
  const adaNisn = [];
  const tidakAdaNisn = [];
  rows.forEach(r => {
    const nisn = String(getNisn(r) ?? '').trim();
    if (nisn) adaNisn.push(r); else tidakAdaNisn.push(r);
  });
  return {
    key, label, getNama,
    total: rows.length,
    jumlahAda: adaNisn.length,
    jumlahTidakAda: tidakAdaNisn.length,
    rowsTidakAda: tidakAdaNisn,
    daftarTidakAda: tidakAdaNisn.map(r => ({ nama: getNama(r) || '(tanpa nama)', detail: getDetail(r) })),
    namaAdaDikelompok: kelompokNama(adaNisn, getNama),
    otomatis: key !== 'siswa' ? cariPerbaikanOtomatisNisn(tidakAdaNisn, siswaList, getNama) : null,
  };
}

// Untuk baris transaksi (Tagihan SPP/Tagihan Lain/Pembayaran) yg NISN-nya kosong --
// coba cocokkan NAMA-nya ke Data Siswa. Cuma dianggap "bisa diperbaiki otomatis"
// kalau nama itu cocok PERSIS ke SATU siswa saja (tidak ambigu) DAN siswa itu SENDIRI
// sudah punya NISN (kalau siswanya juga belum punya NISN, isi dulu lewat "Isi NISN
// Massal (Sementara)" di atas, baru fitur ini akan bisa memakainya).
function cariPerbaikanOtomatisNisn(rowsTanpaNisn, siswaList, getNama) {
  const bisaOtomatis = [];
  const tidakBisa = [];
  rowsTanpaNisn.forEach(row => {
    const nama = String(getNama(row) || '').trim().toLowerCase();
    const cocok = nama ? siswaList.filter(s => String(s.nama || '').trim().toLowerCase() === nama) : [];
    if (cocok.length === 0) {
      tidakBisa.push({ row, nama: getNama(row), alasan: 'Nama tidak ditemukan di Data Siswa' });
    } else if (cocok.length > 1) {
      tidakBisa.push({ row, nama: getNama(row), alasan: `Nama cocok dengan ${cocok.length} siswa berbeda -- ambigu, perlu dicek manual` });
    } else if (!String(cocok[0].nisn || '').trim()) {
      tidakBisa.push({ row, nama: getNama(row), alasan: 'Siswanya sendiri belum punya NISN -- isi dulu lewat "Isi NISN Massal" di atas' });
    } else {
      bisaOtomatis.push({ row, nama: getNama(row), nisnBaru: String(cocok[0].nisn).trim() });
    }
  });
  return { bisaOtomatis, tidakBisa };
}

// Konfigurasi aksi perbaikan otomatis per sumber transaksi -- fungsi bulkUpdate mana
// yg dipanggil & fungsi refresh mana yg dipanggil setelah berhasil.
function konfigPerbaikanOtomatis({ refreshTagihanSpp, refreshTagihanLain, refreshPembayaran }) {
  return {
    tagihanSpp: { bulkUpdateFn: bulkUpdateTagihanSppInSheet, refreshFn: refreshTagihanSpp },
    tagihanLain: { bulkUpdateFn: bulkUpdateTagihanLainInSheet, refreshFn: refreshTagihanLain },
    pembayaran: { bulkUpdateFn: bulkUpdatePembayaranInSheet, refreshFn: refreshPembayaran },
  };
}

export default function CekDataNisnTab() {
  const {
    siswa, allTagihan, pembayaran, refreshSiswa,
    refreshTagihanSpp, refreshTagihanLain, refreshPembayaran, toast,
  } = useAppData();
  const { currentUser } = useAuth();
  const [sudahDicek, setSudahDicek] = useState(false);
  const [terbukaAda, setTerbukaAda] = useState({}); // { [sourceKey]: true } -- toggle daftar "sudah ada NISN" per sumber
  const [terbukaTidakBisa, setTerbukaTidakBisa] = useState({}); // { [sourceKey]: true } -- toggle daftar "perlu manual"
  const [memprosesOtomatis, setMemprosesOtomatis] = useState({}); // { [sourceKey]: true }
  const [hasilOtomatis, setHasilOtomatis] = useState({}); // { [sourceKey]: [{nama, nisnBaru}] } -- stlh berhasil

  // ---- Isi NISN Massal (Sementara) -- khusus Data Siswa, sumber NISN yg asli ----
  const [prefixNisn, setPrefixNisn] = useState('IKH');
  const [digitNisn, setDigitNisn] = useState(4);
  const [memprosesNisnMassal, setMemprosesNisnMassal] = useState(false);
  const [hasilPerbaikanNisn, setHasilPerbaikanNisn] = useState(null); // [{nama, nisnBaru}] -- ditampilkan stlh berhasil

  const siswaTanpaNisn = useMemo(() => siswa.filter(s => !String(s.nisn ?? '').trim()), [siswa]);
  const nisnSudahDipakai = useMemo(() => new Set(siswa.map(s => String(s.nisn ?? '').trim().toUpperCase()).filter(Boolean)), [siswa]);
  const previewKodeNisn = useMemo(
    () => buatKodeSementara((prefixNisn || 'IKH').trim().toUpperCase() || 'IKH', Number(digitNisn) || 4, siswaTanpaNisn.length, nisnSudahDipakai),
    [prefixNisn, digitNisn, siswaTanpaNisn.length, nisnSudahDipakai]
  );

  async function terapkanNisnMassal() {
    if (siswaTanpaNisn.length === 0 || previewKodeNisn.length < siswaTanpaNisn.length) return;
    const konfirmasi = confirm(
      `Akan memberikan NISN SEMENTARA ke ${siswaTanpaNisn.length} siswa yang NISN-nya masih kosong, ` +
      `berurutan dari ${previewKodeNisn[0]} sampai ${previewKodeNisn[siswaTanpaNisn.length - 1]}.\n\n` +
      `Ingat: ini nomor SEMENTARA, bukan NISN resmi Dapodik -- ganti dengan NISN asli begitu sudah tersedia. Lanjutkan?`
    );
    if (!konfirmasi) return;
    setMemprosesNisnMassal(true);
    try {
      const updates = siswaTanpaNisn.map((s, i) => ({ no: s.no, patch: { NISN: previewKodeNisn[i] } }));
      const hasil = await bulkUpdateSiswaInSheet(updates);
      const daftarBerhasil = siswaTanpaNisn.slice(0, hasil.jumlahDiupdate).map((s, i) => ({ nama: s.nama, nisnBaru: previewKodeNisn[i] }));
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Isi NISN Massal (Sementara)',
        modul: 'Cek Data dan Sistem',
        detail: `Memberikan NISN sementara ke ${hasil.jumlahDiupdate} siswa (${previewKodeNisn[0]} - ${previewKodeNisn[Math.max(0, hasil.jumlahDiupdate - 1)]})`,
      });
      setHasilPerbaikanNisn(daftarBerhasil);
      await refreshSiswa();
      toast(`${hasil.jumlahDiupdate} siswa berhasil diberi NISN sementara.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemprosesNisnMassal(false);
    }
  }

  const sumberData = useMemo(() => ([
    { key: 'siswa', label: '👦 Data Siswa', rows: siswa, getNama: s => s.nama, getNisn: s => s.nisn, getDetail: s => `Kelas ${s.kelasTingkat || '-'}${s.rombel ? ' ' + s.rombel : ''}` },
    { key: 'tagihanSpp', label: '🧾 Tagihan SPP', rows: allTagihan.filter(t => t.refType === 'SPP'), getNama: t => t.namaSiswa, getNisn: t => t.nisn, getDetail: t => `SPP ${t.bulan} ${t.tahunKalender} — No=${t.no}` },
    { key: 'tagihanLain', label: '🧾 Tagihan Biaya Lain', rows: allTagihan.filter(t => t.refType === 'LAIN'), getNama: t => t.namaSiswa, getNisn: t => t.nisn, getDetail: t => `${t.label} — No=${t.no}` },
    { key: 'pembayaran', label: '💳 Pembayaran', rows: pembayaran, getNama: p => p.namaSiswa, getNisn: p => p.nisn, getDetail: p => `${p.jenis || p.refType} — ${formatRupiah(p.nominal)} — No=${p.no}` },
  ]), [siswa, allTagihan, pembayaran]);

  const hasil = useMemo(() => sumberData.map(s => analisisSumber(s, siswa)), [sumberData, siswa]);

  const totalTidakAda = hasil.reduce((s, h) => s + h.jumlahTidakAda, 0);
  const totalAda = hasil.reduce((s, h) => s + h.jumlahAda, 0);
  const totalSemua = hasil.reduce((s, h) => s + h.total, 0);

  const konfigOtomatis = konfigPerbaikanOtomatis({ refreshTagihanSpp, refreshTagihanLain, refreshPembayaran });

  // Terapkan perbaikan NISN otomatis (isi berdasarkan kecocokan nama ke Data Siswa)
  // utk 1 sumber transaksi (Tagihan SPP / Tagihan Lain / Pembayaran).
  async function terapkanPerbaikanOtomatis(h) {
    const { bisaOtomatis } = h.otomatis;
    if (!bisaOtomatis || bisaOtomatis.length === 0) return;
    const { bulkUpdateFn, refreshFn } = konfigOtomatis[h.key];
    if (!confirm(`Isi NISN untuk ${bisaOtomatis.length} baris "${h.label.replace(/^\S+\s/, '')}" berdasarkan kecocokan nama dengan Data Siswa. Lanjutkan?`)) return;
    setMemprosesOtomatis(m => ({ ...m, [h.key]: true }));
    try {
      const updates = bisaOtomatis.map(b => ({ no: b.row.no, patch: { NISN: b.nisnBaru } }));
      const hasilUpdate = await bulkUpdateFn(updates);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Perbaiki Otomatis NISN',
        modul: 'Cek Data dan Sistem',
        detail: `Mengisi NISN ${hasilUpdate.jumlahDiupdate} baris di ${h.label} berdasarkan kecocokan nama dengan Data Siswa`,
      });
      setHasilOtomatis(r => ({ ...r, [h.key]: bisaOtomatis.slice(0, hasilUpdate.jumlahDiupdate).map(b => ({ nama: b.nama, nisnBaru: b.nisnBaru })) }));
      await refreshFn();
      toast(`${hasilUpdate.jumlahDiupdate} baris di ${h.label} berhasil diisi NISN-nya.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemprosesOtomatis(m => ({ ...m, [h.key]: false }));
    }
  }

  return (
    <div>
      <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          ⚠️ Alat ini memindai <strong>Data Siswa, Tagihan SPP, Tagihan Biaya Lain, dan Pembayaran</strong> untuk
          mencari baris yang kolom <strong>NISN</strong>-nya kosong. Baris dengan NISN kosong berisiko salah
          dicocokkan (mis. pembayaran nyasar ke tagihan siswa lain kalau nomor tagihannya kebetulan sama) — cek
          &amp; lengkapi NISN-nya langsung di Google Sheets kalau ditemukan.
        </div>
      </div>

      {!sudahDicek && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 28 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Klik tombol di bawah untuk memindai {totalSemua} baris data dan mengecek kelengkapan NISN.
            </p>
            <button className="btn btn-primary" onClick={() => setSudahDicek(true)}>🔍 Cek NISN &amp; Nama Sekarang</button>
          </div>
        </div>
      )}

      {sudahDicek && (
        <>
          <div className="info-grid" style={{ marginBottom: 18 }}>
            <div className="card"><div className="card-body">
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-dark)' }}>{totalAda}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Baris Sudah Ada NISN</div>
            </div></div>
            <div className="card"><div className="card-body">
              <div style={{ fontSize: 24, fontWeight: 800, color: totalTidakAda > 0 ? 'var(--red)' : 'var(--green-dark)' }}>{totalTidakAda}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Baris TIDAK Ada NISN</div>
            </div></div>
            <div className="card"><div className="card-body">
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-dark)' }}>{totalSemua}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Baris Diperiksa</div>
            </div></div>
          </div>

          {siswaTanpaNisn.length > 0 && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head">
                <div>
                  <h3>🆕 Isi NISN Massal (Sementara)</h3>
                  <p>Berikan kode NISN sementara berurutan ke {siswaTanpaNisn.length} siswa yang NISN-nya masih kosong di Data Siswa. Ini <strong>bukan</strong> NISN resmi -- cuma pengganti sementara supaya sistem tidak salah cocok, sampai NISN asli didapat dari Dapodik/sekolah.</p>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 14 }}>
                  <div className="field" style={{ minWidth: 140 }}>
                    <label>Awalan (Prefix)</label>
                    <input type="text" value={prefixNisn} onChange={e => setPrefixNisn(e.target.value)} maxLength={8} placeholder="mis. IKH" />
                  </div>
                  <div className="field" style={{ minWidth: 120 }}>
                    <label>Jumlah Digit Angka</label>
                    <select value={digitNisn} onChange={e => setDigitNisn(Number(e.target.value))}>
                      {[3, 4, 5, 6].map(d => <option key={d} value={d}>{d} digit</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={terapkanNisnMassal} disabled={memprosesNisnMassal || previewKodeNisn.length < siswaTanpaNisn.length}>
                    {memprosesNisnMassal ? 'Menyimpan...' : `✅ Terapkan ke ${siswaTanpaNisn.length} Siswa`}
                  </button>
                </div>
                {previewKodeNisn.length >= siswaTanpaNisn.length && (
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                    Pratinjau: akan diberikan ke <strong>{siswaTanpaNisn.length} siswa</strong>, berurutan dari{' '}
                    <strong>{previewKodeNisn[0]}</strong> sampai <strong>{previewKodeNisn[siswaTanpaNisn.length - 1]}</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {hasilPerbaikanNisn && (
            <div className="card" style={{ marginBottom: 18, background: 'var(--green-soft)' }}>
              <div className="card-head">
                <div>
                  <h3>✅ NISN Sementara Berhasil Diberikan</h3>
                  <p>{hasilPerbaikanNisn.length} siswa berikut sekarang sudah punya NISN (sementara):</p>
                </div>
                <button className="btn btn-sm" onClick={() => setHasilPerbaikanNisn(null)}>✕ Tutup</button>
              </div>
              <div className="card-body table-scroll">
                <table>
                  <thead><tr><th>Nama Siswa</th><th>NISN Sementara Baru</th></tr></thead>
                  <tbody>
                    {hasilPerbaikanNisn.map((r, i) => (
                      <tr key={i}><td>{r.nama}</td><td style={{ fontWeight: 700 }}>{r.nisnBaru}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasil.map(h => (
            <div className="card" key={h.key} style={{ marginBottom: 18 }}>
              <div className="card-head" style={{ alignItems: 'center' }}>
                <div>
                  <h3>{h.label}</h3>
                  <p>{h.total} baris diperiksa</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-green">Ada NISN: {h.jumlahAda}</span>
                  <span className={`badge ${h.jumlahTidakAda > 0 ? 'badge-red' : 'badge-green'}`}>Tanpa NISN: {h.jumlahTidakAda}</span>
                </div>
              </div>
              <div className="card-body table-scroll">
                {h.jumlahTidakAda === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>
                    ✅ Semua baris di sumber ini sudah punya NISN.
                  </p>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Nama TANPA NISN ({h.jumlahTidakAda})
                    </div>
                    <table style={{ marginBottom: 14 }}>
                      <thead><tr><th>Nama</th><th>Detail</th></tr></thead>
                      <tbody>
                        {h.daftarTidakAda.map((r, i) => (
                          <tr key={i}><td>{r.nama}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.detail}</td></tr>
                        ))}
                      </tbody>
                    </table>

                    {h.otomatis && (
                      <div style={{ marginBottom: 14 }}>
                        {h.otomatis.bisaOtomatis.length > 0 && (
                          <div className="card-head" style={{ padding: '10px 0', flexWrap: 'wrap', gap: 10 }}>
                            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                              🔧 <strong>{h.otomatis.bisaOtomatis.length} baris</strong> di atas bisa diperbaiki OTOMATIS -- namanya cocok persis dengan 1 siswa di Data Siswa yang NISN-nya sudah ada.
                            </p>
                            <button className="btn btn-sm btn-primary" onClick={() => terapkanPerbaikanOtomatis(h)} disabled={memprosesOtomatis[h.key]}>
                              {memprosesOtomatis[h.key] ? 'Memperbaiki...' : `🔧 Perbaiki Otomatis (${h.otomatis.bisaOtomatis.length} Baris)`}
                            </button>
                          </div>
                        )}
                        {hasilOtomatis[h.key] && (
                          <div style={{ background: 'var(--green-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                            <p style={{ fontSize: 12.5, margin: '0 0 6px', fontWeight: 700 }}>✅ Berhasil diisi NISN-nya:</p>
                            {hasilOtomatis[h.key].map((r, i) => (
                              <div key={i} style={{ fontSize: 12 }}>{r.nama} — <strong>{r.nisnBaru}</strong></div>
                            ))}
                          </div>
                        )}
                        {h.otomatis.tidakBisa.length > 0 && (
                          <>
                            <button className="btn btn-sm" onClick={() => setTerbukaTidakBisa(t => ({ ...t, [h.key]: !t[h.key] }))}>
                              {terbukaTidakBisa[h.key] ? 'Tutup daftar perlu perbaikan manual' : `⚠️ Lihat ${h.otomatis.tidakBisa.length} baris yang perlu diperbaiki manual`}
                            </button>
                            {terbukaTidakBisa[h.key] && (
                              <table style={{ marginTop: 10 }}>
                                <thead><tr><th>Nama</th><th>Kenapa Tidak Bisa Otomatis</th></tr></thead>
                                <tbody>
                                  {h.otomatis.tidakBisa.map((r, i) => (
                                    <tr key={i}><td>{r.nama}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.alasan}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
                <button className="btn btn-sm" onClick={() => setTerbukaAda(t => ({ ...t, [h.key]: !t[h.key] }))}>
                  {terbukaAda[h.key] ? 'Tutup daftar nama yang sudah ada NISN' : `Lihat ${h.namaAdaDikelompok.length} nama yang sudah ada NISN`}
                </button>
                {terbukaAda[h.key] && (
                  <table style={{ marginTop: 10 }}>
                    <thead><tr><th>Nama</th><th>Jumlah Baris</th></tr></thead>
                    <tbody>
                      {h.namaAdaDikelompok.map((r, i) => (
                        <Fragment key={i}>
                          <tr><td>{r.nama}</td><td>{r.jumlah}</td></tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
