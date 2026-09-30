import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import Modal from '../../components/common/Modal';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { AKUN_BAWAAN, AKUN_FIELDS, AKUN_HEADERS, emptyAkunRow } from '../../db/akunBukuBesarFields';
import { addAkunToSheet, updateAkunInSheet, deleteAkunFromSheet, fetchAkunFromSheet } from '../../services/googleSheets';
import { pembayaranAsli, bulanTahunAjaran, piutangAsOf, tanggalPiutangMuncul } from '../../db/laporanHelpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { formatTanggalTampil, parseTanggalFleksibel } from '../../db/helpers';
import Rupiah from '../../components/common/Rupiah';
import { exportToExcel } from '../../utils/exportTable';

// Bangun daftar mutasi MENTAH (blm difilter periode) utk 1 akun -- dipisah jadi
// fungsi sendiri supaya bisa dipakai utk 2 keperluan: (a) menghitung Saldo Awal
// (replay semua mutasi SEBELUM periode terpilih), (b) menampilkan mutasi periode itu.
function bangunItemMentah(akunAktif, pembayaran, pemasukanLain, pengeluaran, allTagihan, beasiswaSiswa, beasiswaKategori) {
  const asli = pembayaranAsli(pembayaran);
  let items = [];

  if (akunAktif.id === 'BAWAAN-kas') {
    items = [
      ...asli.filter(p => !p.akun || p.akun === 'Kas').map(p => ({ tanggal: p.tanggalBayar, ket: `Pembayaran ${p.jenis} — ${p.namaSiswa}`, debit: p.nominal, kredit: 0 })),
      ...pemasukanLain.filter(p => !p.akun || p.akun === 'Kas').map(p => ({ tanggal: p.tanggal, ket: `${p.kategori} — ${p.keterangan}`, debit: p.nominal, kredit: 0 })),
      ...pengeluaran.filter(p => !p.akun || p.akun === 'Kas').map(p => ({ tanggal: p.tanggal, ket: `${p.kategori} — ${p.keterangan}`, debit: 0, kredit: p.nominal })),
    ];
  } else if (akunAktif.jenis === 'Aktiva' && !akunAktif.bawaan) {
    items = [
      ...asli.filter(p => p.akun === akunAktif.nama).map(p => ({ tanggal: p.tanggalBayar, ket: `Pembayaran ${p.jenis} — ${p.namaSiswa}`, debit: p.nominal, kredit: 0 })),
      ...pemasukanLain.filter(p => p.akun === akunAktif.nama).map(p => ({ tanggal: p.tanggal, ket: `${p.kategori} — ${p.keterangan}`, debit: p.nominal, kredit: 0 })),
      ...pengeluaran.filter(p => p.akun === akunAktif.nama).map(p => ({ tanggal: p.tanggal, ket: `${p.kategori} — ${p.keterangan}`, debit: 0, kredit: p.nominal })),
    ];
  } else if (akunAktif.id === 'BAWAAN-piutang') {
    // Piutang digambarkan sbg 2 arah spy konsisten dgn Neraca (piutangAsOf): tagihan BARU
    // menambah piutang (Debit) -- dicatat di AWAL periode tagihan itu (lihat
    // tanggalPiutangMuncul), BUKAN jatuh tempo -- dan pembayaran mengurangi piutang (Kredit).
    // PENTING (lapis pertahanan KEDUA): kalau ternyata ADA yg bayar LEBIH AWAL drpd tanggal
    // "muncul" itu sendiri (mis. bayar SPP Agustus di bulan Juli, sebelum tgl 1 Agustus) --
    // tanggal munculnya piutang itu DIMUNDURKAN ke tanggal pembayaran tercepatnya, supaya
    // di buku besar (yg diurutkan kronologis) piutangnya SELALU tampil duluan sebelum
    // pembayarannya sendiri, brp pun awalnya orang bayar. Ini genuinely mencegah minus,
    // bukan cuma mengurangi kemungkinannya.
    items = allTagihan.map(t => {
      // NISN sbg lapis pengaman kedua (konsisten dgn hitungTerbayar()/piutangAsOf, lihat
      // perbaikan v1.31.7 & v1.31.12) -- mencegah pembayaran siswa lain yg RefNo-nya
      // kebetulan sama salah "ketiban" ke mutasi piutang tagihan ini.
      const bayarUntukIni = asli.filter(p => p.refType === t.refType && p.refNo === t.no && (!t.nisn || !p.nisn || p.nisn === t.nisn));
      const tglMuncul = parseTanggalFleksibel(tanggalPiutangMuncul(t));
      let tglDipakai = tanggalPiutangMuncul(t);
      bayarUntukIni.forEach(p => {
        const d = parseTanggalFleksibel(p.tanggalBayar);
        if (d && tglMuncul && d.getTime() < tglMuncul.getTime()) tglDipakai = p.tanggalBayar;
      });
      const totalTerbayarUntukIni = bayarUntukIni.reduce((s, p) => s + p.nominal, 0);
      return { tanggal: tglDipakai, ket: `Tagihan Baru: ${t.label} — ${t.namaSiswa}`, debit: nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, Date.now(), totalTerbayarUntukIni).nominalEfektif, kredit: 0 };
    });
    items = [
      ...items,
      ...asli.map(p => ({ tanggal: p.tanggalBayar, ket: `Pembayaran ${p.jenis} — ${p.namaSiswa} (mengurangi piutang)`, debit: 0, kredit: p.nominal })),
    ];
  } else if (akunAktif.id === 'BAWAAN-pend-spp') {
    items = asli.filter(p => p.refType === 'SPP').map(p => ({ tanggal: p.tanggalBayar, ket: `${p.jenis} — ${p.namaSiswa}`, debit: 0, kredit: p.nominal }));
  } else if (akunAktif.id === 'BAWAAN-pend-lain-siswa') {
    items = asli.filter(p => p.refType === 'LAIN').map(p => ({ tanggal: p.tanggalBayar, ket: `${p.jenis} — ${p.namaSiswa}`, debit: 0, kredit: p.nominal }));
  } else if (akunAktif.id === 'BAWAAN-pend-nonsiswa') {
    items = pemasukanLain.map(p => ({ tanggal: p.tanggal, ket: `${p.kategori} — ${p.keterangan}`, debit: 0, kredit: p.nominal }));
  } else if (akunAktif.kategoriPengeluaran) {
    items = pengeluaran.filter(p => p.kategori === akunAktif.kategoriPengeluaran).map(p => ({ tanggal: p.tanggal, ket: p.keterangan, debit: p.nominal, kredit: 0 }));
  }

  return items
    .filter(it => parseTanggalFleksibel(it.tanggal)) // buang yg tanggalnya kosong/tak valid
    .sort((a, b) => parseTanggalFleksibel(a.tanggal).getTime() - parseTanggalFleksibel(b.tanggal).getTime());
}

export default function BukuBesarTab() {
  const { akun, pembayaran, pemasukanLain, pengeluaran, allTagihan, tahunAjaran, tahunAjaranAktif, refreshAkun, beasiswaSiswa, beasiswaKategori } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [kelolaOpen, setKelolaOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [akunDipilih, setAkunDipilih] = useState('BAWAAN-kas');
  const [taLabel, setTaLabel] = useState(null);
  const [bulanIdx, setBulanIdx] = useState(null); // null = "Semua Bulan"

  const labelDipakai = taLabel || tahunAjaranAktif?.label;
  const bulanList = useMemo(() => labelDipakai ? bulanTahunAjaran(labelDipakai) : [], [labelDipakai]);
  const bulanTerpilih = bulanIdx !== null ? bulanList[bulanIdx] : null;

  const semuaAkun = useMemo(() => [...AKUN_BAWAAN, ...akun], [akun]);
  const akunAktif = semuaAkun.find(a => a.id === akunDipilih) || semuaAkun[0];

  // Batas awal & akhir periode terpilih (dlm ms) -- null kalau "Semua Bulan" (tanpa batas).
  const { cutoffAwalMs, cutoffAkhirMs } = useMemo(() => {
    if (!bulanTerpilih) return { cutoffAwalMs: null, cutoffAkhirMs: null };
    const awal = new Date(bulanTerpilih.calYear, bulanTerpilih.monthIdx, 1).getTime();
    const akhir = new Date(bulanTerpilih.calYear, bulanTerpilih.monthIdx + 1, 1).getTime() - 1;
    return { cutoffAwalMs: awal, cutoffAkhirMs: Math.min(akhir, Date.now()) };
  }, [bulanTerpilih]);

  const { mutasi, saldoAwal } = useMemo(() => {
    if (!akunAktif) return { mutasi: [], saldoAwal: 0 };
    const itemMentah = bangunItemMentah(akunAktif, pembayaran, pemasukanLain, pengeluaran, allTagihan, beasiswaSiswa, beasiswaKategori);

    // SALDO AWAL periode = saldo akhir bulan SEBELUMNYA (bukan mulai dari 0 tiap kali
    // difilter) -- dihitung dgn me-replay semua mutasi SEBELUM cutoffAwal. Khusus
    // Piutang Siswa, dihitung pakai piutangAsOf yg SAMA dgn Neraca (bukan replay mutasi
    // biasa) supaya kedua laporan selalu konsisten persis.
    let awal = 0;
    if (cutoffAwalMs !== null) {
      if (akunAktif.id === 'BAWAAN-piutang') {
        awal = piutangAsOf(allTagihan, pembayaran, cutoffAwalMs - 1, beasiswaSiswa, beasiswaKategori);
      } else {
        const sebelum = itemMentah.filter(it => parseTanggalFleksibel(it.tanggal).getTime() < cutoffAwalMs);
        awal = sebelum.reduce((s, it) => {
          const delta = akunAktif.saldoNormal === 'Kredit' ? (it.kredit - it.debit) : (it.debit - it.kredit);
          return s + delta;
        }, 0);
      }
    }

    const dalamPeriode = itemMentah.filter(it => {
      const t = parseTanggalFleksibel(it.tanggal).getTime();
      if (cutoffAwalMs !== null && t < cutoffAwalMs) return false;
      if (cutoffAkhirMs !== null && t > cutoffAkhirMs) return false;
      return true;
    });

    let saldo = awal;
    const hasil = dalamPeriode.map(it => {
      const delta = akunAktif.saldoNormal === 'Kredit' ? (it.kredit - it.debit) : (it.debit - it.kredit);
      saldo += delta;
      return { ...it, saldo };
    });
    return { mutasi: hasil, saldoAwal: awal };
  }, [akunAktif, pembayaran, pemasukanLain, pengeluaran, allTagihan, cutoffAwalMs, cutoffAkhirMs, beasiswaSiswa, beasiswaKategori]);

  const totalDebit = mutasi.reduce((s, m) => s + m.debit, 0);
  const totalKredit = mutasi.reduce((s, m) => s + m.kredit, 0);
  const saldoAkhir = mutasi.length > 0 ? mutasi[mutasi.length - 1].saldo : saldoAwal;

  function handleExportSatuAkun() {
    const rows = [
      { Tanggal: '', Keterangan: 'Saldo Awal', Debit: '', Kredit: '', Saldo: saldoAwal },
      ...mutasi.map(m => ({ Tanggal: formatTanggalTampil(m.tanggal), Keterangan: m.ket, Debit: m.debit || '', Kredit: m.kredit || '', Saldo: m.saldo })),
    ];
    exportToExcel(['Tanggal', 'Keterangan', 'Debit', 'Kredit', 'Saldo'], rows, `Buku Besar - ${akunAktif.nama}`, `Buku Besar — ${akunAktif.nama}${bulanTerpilih ? ` (${bulanTerpilih.label})` : ''}`);
  }

  function handleExportSemuaAkun() {
    const rows = semuaAkun.map(a => {
      const itemMentah = bangunItemMentah(a, pembayaran, pemasukanLain, pengeluaran, allTagihan, beasiswaSiswa, beasiswaKategori);
      let awal = 0;
      if (cutoffAwalMs !== null) {
        if (a.id === 'BAWAAN-piutang') awal = piutangAsOf(allTagihan, pembayaran, cutoffAwalMs - 1, beasiswaSiswa, beasiswaKategori);
        else awal = itemMentah.filter(it => parseTanggalFleksibel(it.tanggal).getTime() < cutoffAwalMs)
          .reduce((s, it) => s + (a.saldoNormal === 'Kredit' ? (it.kredit - it.debit) : (it.debit - it.kredit)), 0);
      }
      const dalamPeriode = itemMentah.filter(it => {
        const t = parseTanggalFleksibel(it.tanggal).getTime();
        if (cutoffAwalMs !== null && t < cutoffAwalMs) return false;
        if (cutoffAkhirMs !== null && t > cutoffAkhirMs) return false;
        return true;
      });
      const debit = dalamPeriode.reduce((s, it) => s + it.debit, 0);
      const kredit = dalamPeriode.reduce((s, it) => s + it.kredit, 0);
      const akhir = awal + (a.saldoNormal === 'Kredit' ? (kredit - debit) : (debit - kredit));
      return { 'Kode Akun': a.kode, 'Nama Akun': a.nama, Jenis: a.jenis, 'Saldo Awal': awal, Debit: debit, Kredit: kredit, 'Saldo Akhir': akhir };
    });
    exportToExcel(['Kode Akun', 'Nama Akun', 'Jenis', 'Saldo Awal', 'Debit', 'Kredit', 'Saldo Akhir'], rows, 'Buku Besar - Semua Akun', `Buku Besar — Semua Akun${bulanTerpilih ? ` (${bulanTerpilih.label})` : ''}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>📒 Buku Besar</h3><p>Pilih akun untuk melihat mutasi (riwayat debit/kredit) dan saldo berjalannya.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={() => setKelolaOpen(o => !o)}>{kelolaOpen ? '📕 Tutup Daftar Akun' : '📖 Kelola Daftar Akun'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Akun Baru</button>
        </div>
      </div>
      <div className="card-body">
        <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
          <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
            Setiap kali mencatat Pembayaran/Pemasukan Lain/Pengeluaran, Anda memilih akun kas/bank mana yang sungguhan
            menerima/mengeluarkan uangnya (tidak otomatis diasumsikan "Kas" semua) — supaya saldo tiap akun akurat dan
            tidak ada selisih antar akun kas/bank. Akun Pendapatan &amp; Beban tetap otomatis terisi sesuai kategori
            transaksi. Saldo Awal tiap periode dihitung otomatis dari saldo akhir bulan sebelumnya (utk Piutang Siswa,
            dihitung dgn cara yg sama persis dgn Neraca, supaya kedua laporan selalu konsisten).
          </div>
        </div>

        {kelolaOpen && (
          <div style={{ marginBottom: 20 }}>
            <GenericStoredTable
              title="Daftar Akun (Custom)"
              subtitle="Akun tambahan yang Anda buat sendiri, di luar akun standar bawaan."
              headers={AKUN_HEADERS}
              fields={AKUN_FIELDS}
              fetchFn={fetchAkunFromSheet}
              updateFn={updateAkunInSheet}
              deleteFn={deleteAkunFromSheet}
              moduleLabel="Akun Buku Besar"
              labelKey="Nama Akun"
              searchFn={(r, t) => String(r['Nama Akun'] ?? '').toLowerCase().includes(t) || String(r['Kode Akun'] ?? '').toLowerCase().includes(t)}
              onChanged={refreshAkun}
              refreshSignal={refreshSignal}
              target="keuangan"
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ maxWidth: 420, flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Pilih Akun</label>
            <select value={akunDipilih} onChange={e => setAkunDipilih(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
              <optgroup label="Akun Standar">
                {AKUN_BAWAAN.map(a => <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>)}
              </optgroup>
              {akun.length > 0 && (
                <optgroup label="Akun Custom">
                  {akun.map(a => <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Tahun Ajaran</label>
            <select value={labelDipakai || ''} onChange={e => { setTaLabel(e.target.value); setBulanIdx(null); }} style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
              {tahunAjaran.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Bulan</label>
            <select value={bulanIdx === null ? '' : bulanIdx} onChange={e => setBulanIdx(e.target.value === '' ? null : Number(e.target.value))} style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
              <option value="">Semua Bulan</option>
              {bulanList.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button className="btn btn-sm" onClick={handleExportSatuAkun}>📊 Excel Akun Ini</button>
            <button className="btn btn-sm" onClick={handleExportSemuaAkun}>📊 Excel Semua Akun</button>
          </div>
        </div>

        {akunAktif && (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Debit</th><th>Kredit</th><th>Saldo</th></tr></thead>
              <tbody>
                {cutoffAwalMs !== null && (
                  <tr style={{ background: '#F6F8F5', fontStyle: 'italic' }}>
                    <td colSpan={4} style={{ color: 'var(--muted)' }}>Saldo Bulan Sebelumnya</td>
                    <td style={{ fontWeight: 700 }}><Rupiah value={saldoAwal} bold /></td>
                  </tr>
                )}
                {mutasi.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada mutasi untuk akun & periode ini.</td></tr>
                )}
                {mutasi.map((m, i) => (
                  <tr key={i}>
                    <td>{formatTanggalTampil(m.tanggal)}</td>
                    <td>{m.ket}</td>
                    <td>{m.debit > 0 ? <Rupiah value={m.debit} /> : '-'}</td>
                    <td>{m.kredit > 0 ? <Rupiah value={m.kredit} /> : '-'}</td>
                    <td><Rupiah value={m.saldo} bold /></td>
                  </tr>
                ))}
                {/* Baris ringkasan Total Debit/Kredit/Saldo Akhir -- SEJAJAR kolom di atasnya
                    (bukan lagi 3 kartu terpisah), supaya konsisten dgn pola Kartu SPP. */}
                <tr style={{ borderTop: '2px solid var(--green-dark)' }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}><Rupiah value={totalDebit} bold /></td>
                  <td style={{ fontWeight: 700 }}><Rupiah value={totalKredit} bold /></td>
                  <td style={{ fontWeight: 800, color: 'var(--green-dark)' }}><Rupiah value={saldoAkhir} bold /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Tambah Akun Buku Besar Baru" onClose={() => setModalOpen(false)}>
          <GenericManualForm
            fields={AKUN_FIELDS}
            emptyRow={emptyAkunRow}
            addFn={addAkunToSheet}
            onSaved={() => { refreshAkun(); setRefreshSignal(s => s + 1); setModalOpen(false); }}
            title="Tambah Akun Buku Besar Baru"
            subtitle="Data langsung tersimpan ke Google Sheets Keuangan."
            target="keuangan"
            bare
          />
        </Modal>
      )}
    </div>
  );
}
