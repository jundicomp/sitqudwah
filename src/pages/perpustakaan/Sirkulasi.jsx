import ClipCell from '../../components/common/ClipCell';
import { useMemo, useRef, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import usePerpus from '../../hooks/usePerpus';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SIRKULASI_HEADERS, stokBuku, tambahHari, selisihHari, sedangDipinjam } from '../../db/perpusFields';
import { cariDariKode, kodeSiswa, kodeGuru, sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatRupiah, formatTanggalAngka } from '../../db/helpers';
import {
  addSirkulasiToSheet, updateSirkulasiInSheet, deleteSirkulasiFromSheet, fetchSirkulasiFromSheet,
  addDendaPerpusToSheet, updateReservasiInSheet, addLogEntry, isConfigured,
} from '../../services/googleSheets';

const TABS = [
  { id: 'pinjam', label: 'PEMINJAMAN' },
  { id: 'kembali', label: 'PENGEMBALIAN' },
  { id: 'riwayat', label: 'RIWAYAT' },
];
const EDIT_FIELDS = [
  { key: 'Jatuh Tempo', label: 'Jatuh Tempo', type: 'date', required: true },
  { key: 'Catatan', label: 'Catatan', type: 'text' },
];
const reservasiAktif = (r) => r.status === 'Menunggu' || r.status === 'Siap Diambil';

// Terima kode kartu (S:/G:/format lama/NISN polos) atau potongan nama -> daftar anggota cocok.
function useCariAnggota() {
  const { siswa, guru } = useAppData();
  const { anggota, anggotaByKode } = usePerpus();
  return (teks) => {
    const t = teks.trim();
    if (!t) return [];
    const hit = cariDariKode(t, siswa, guru);
    if (hit) { const k = hit.tipe === 'siswa' ? kodeSiswa(hit.data) : kodeGuru(hit.data); return anggotaByKode[k] ? [anggotaByKode[k]] : []; }
    const low = t.toLowerCase();
    return anggota.filter(a => `${a.nama} ${a.kode}`.toLowerCase().includes(low)).slice(0, 8);
  };
}

function Peminjaman() {
  const { buku, sirkulasi, dendaPerpus, reservasi, refreshSirkulasi, refreshReservasi, toast } = useAppData();
  const { currentUser } = useAuth();
  const { aturan, bukuByKode } = usePerpus();
  const cariAnggota = useCariAnggota();
  const [qAnggota, setQAnggota] = useState('');
  const [calon, setCalon] = useState([]);
  const [agt, setAgt] = useState(null);
  const [qBuku, setQBuku] = useState('');
  const [keranjang, setKeranjang] = useState([]);
  const [tglPinjam, setTglPinjam] = useState(sekarangWIB().tanggal);
  const [menyimpan, setMenyimpan] = useState(false);
  const bukuRef = useRef(null);
  const jatuhTempo = tambahHari(tglPinjam, Number(aturan.maxHariPinjam) || 7);

  const pinjamanAgt = useMemo(() => (agt ? sirkulasi.filter(x => x.kodeAnggota === agt.kode && sedangDipinjam(x)) : []), [agt, sirkulasi]);
  const dendaAgt = useMemo(() => (agt ? dendaPerpus.filter(d => d.kodeAnggota === agt.kode && d.status !== 'Lunas').reduce((a, d) => a + d.nominal, 0) : 0), [agt, dendaPerpus]);
  const sisaKuota = (Number(aturan.maxBukuPerAnggota) || 3) - pinjamanAgt.length - keranjang.length;

  function pilihAnggota(e) {
    e?.preventDefault();
    const hasil = cariAnggota(qAnggota);
    if (hasil.length === 1) { setAgt(hasil[0]); setCalon([]); setQAnggota(''); setKeranjang([]); setTimeout(() => bukuRef.current?.focus(), 50); }
    else { setCalon(hasil); if (!hasil.length) toast('Anggota tidak ditemukan.', 'error'); }
  }

  const kandidatBuku = useMemo(() => {
    const t = qBuku.trim().toLowerCase();
    if (t.length < 2 || bukuByKode[t.toUpperCase()]) return [];
    return buku.filter(b => `${b.judul} ${b.penulis} ${b.kode}`.toLowerCase().includes(t)).slice(0, 6);
  }, [qBuku, buku, bukuByKode]);

  function tambahBuku(b) {
    if (!b) { toast('Kode buku tidak dikenal.', 'error'); return; }
    if (b.jenis === 'Digital') { toast(`"${b.judul}" koleksi digital, tidak dipinjam fisik.`, 'error'); return; }
    if (keranjang.some(x => x.kode === b.kode)) { toast('Buku sudah ada di daftar.', 'error'); return; }
    if (pinjamanAgt.some(x => x.kodeBuku === b.kode)) { toast(`${agt.nama} masih meminjam buku ini.`, 'error'); return; }
    if (sisaKuota <= 0) { toast(`Batas ${aturan.maxBukuPerAnggota} buku per anggota tercapai.`, 'error'); return; }
    const { tersedia } = stokBuku(b, sirkulasi);
    const antre = reservasi.filter(r => r.kodeBuku === b.kode && reservasiAktif(r));
    const milikSendiri = antre.some(r => r.kodeAnggota === agt.kode);
    const dipesanLain = antre.filter(r => r.kodeAnggota !== agt.kode).length;
    if (tersedia <= 0) { toast(`"${b.judul}" sedang habis dipinjam. Buat reservasi di menu Reservasi Buku.`, 'error'); return; }
    if (!milikSendiri && tersedia <= dipesanLain) { toast(`Stok tersisa sudah dipesan ${dipesanLain} anggota lain lewat reservasi.`, 'error'); return; }
    setKeranjang(k => [...k, b]);
    setQBuku('');
    bukuRef.current?.focus();
  }

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      for (const b of keranjang) {
        await addSirkulasiToSheet({
          'Kode Buku': b.kode, 'Judul Buku': b.judul, 'Kode Anggota': agt.kode, 'Jenis Peminjam': agt.jenis, 'Nama Peminjam': agt.nama, 'Kelas / Kategori': agt.info,
          'Tanggal Pinjam': tglPinjam, 'Jatuh Tempo': jatuhTempo, 'Tanggal Kembali': '', Status: 'Dipinjam', Petugas: currentUser.nama, Catatan: '',
        });
        const rsv = reservasi.find(r => r.kodeBuku === b.kode && r.kodeAnggota === agt.kode && reservasiAktif(r));
        if (rsv) await updateReservasiInSheet({ ...rsv.raw, Status: 'Selesai', Catatan: `${rsv.catatan ? rsv.catatan + '; ' : ''}Dipinjam ${tglPinjam}` });
      }
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Peminjaman Buku', modul: 'Perpustakaan', detail: `${agt.nama}: ${keranjang.map(b => b.judul).join(', ')} (jatuh tempo ${jatuhTempo})` });
      toast(`${keranjang.length} buku dipinjam ${agt.nama}, kembali paling lambat ${formatTanggalAngka(jatuhTempo)}.`);
      setKeranjang([]); setAgt(null);
      await Promise.all([refreshSirkulasi(), refreshReservasi()]);
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Peminjaman</h3><p>1. Scan kartu pelajar/pegawai (atau ketik nama). 2. Scan label buku (atau ketik judul). 3. Simpan.</p></div></div>
      <div className="card-body">
        {!agt ? (
          <>
            <form className="scan-box" onSubmit={pilihAnggota}>
              <input autoFocus value={qAnggota} onChange={e => setQAnggota(e.target.value)} placeholder="Scan kartu anggota atau ketik nama…" aria-label="Anggota" autoComplete="off" />
              <button className="btn btn-primary" type="submit">Cari</button>
            </form>
            {calon.length > 1 && (
              <div style={{ marginTop: 10 }}>{calon.map(a => (
                <div key={a.kode} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, fontSize: 13.5 }}>
                  <button className="btn btn-sm" onClick={() => { setAgt(a); setCalon([]); setQAnggota(''); }}>Pilih</button>
                  <b>{a.nama}</b><span style={{ color: 'var(--muted)' }}>{a.info} · {a.kode}</span>
                </div>
              ))}</div>
            )}
          </>
        ) : (
          <>
            <div className="ringkas-bar" style={{ marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>{agt.nama}</b><span className="badge badge-muted">{agt.info}</span>
              <span className="badge badge-blue">Sedang pinjam {pinjamanAgt.length}/{aturan.maxBukuPerAnggota}</span>
              {pinjamanAgt.some(x => x.jatuhTempo < tglPinjam) && <span className="badge badge-red">Ada pinjaman lewat jatuh tempo</span>}
              {dendaAgt > 0 && <span className="badge badge-red">Denda belum lunas {formatRupiah(dendaAgt)}</span>}
              <button className="btn btn-sm" onClick={() => { setAgt(null); setKeranjang([]); }}>Ganti anggota</button>
            </div>
            <form className="scan-box" onSubmit={e => { e.preventDefault(); const t = qBuku.trim().toUpperCase(); if (t) tambahBuku(bukuByKode[t] || (kandidatBuku.length === 1 ? kandidatBuku[0] : null)); }}>
              <input ref={bukuRef} value={qBuku} onChange={e => setQBuku(e.target.value)} placeholder="Scan label buku atau ketik judul…" aria-label="Buku" autoComplete="off" disabled={sisaKuota <= 0} />
              <button className="btn btn-primary" type="submit" disabled={sisaKuota <= 0}>Tambah</button>
            </form>
            {kandidatBuku.map(b => { const st = stokBuku(b, sirkulasi); return (
              <div key={b.kode} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, fontSize: 13.5 }}>
                <button className="btn btn-sm" onClick={() => tambahBuku(b)} disabled={!st.tersedia}>Tambah</button>
                <b>{b.judul}</b><span style={{ color: 'var(--muted)' }}>{b.kode} · tersedia {st.tersedia}/{b.eksemplar}</span>
              </div>); })}
            <div className="table-scroll" style={{ marginTop: 14 }}>
              {!keranjang.length ? <Kosong>Belum ada buku dipilih.</Kosong> : (
                <table><thead><tr><th>Kode</th><th>Judul</th><th>Rak</th><th></th></tr></thead>
                  <tbody>{keranjang.map(b => <tr key={b.kode}><td>{b.kode}</td><td><b><ClipCell value={b.judul} maxWidth={320} /></b></td><td>{b.rak || '—'}</td><td><button className="btn btn-sm" onClick={() => setKeranjang(k => k.filter(x => x.kode !== b.kode))}>Hapus</button></td></tr>)}</tbody></table>
              )}
            </div>
            <div className="save-bar">
              <div className="filter-bar" style={{ margin: 0 }}>
                <Field label="Tanggal pinjam"><input type="date" value={tglPinjam} onChange={e => setTglPinjam(e.target.value)} /></Field>
                <Field label="Jatuh tempo"><input value={formatTanggalAngka(jatuhTempo)} readOnly /></Field>
              </div>
              <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !keranjang.length}>{menyimpan ? 'Menyimpan…' : `Simpan peminjaman (${keranjang.length})`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Pengembalian() {
  const { sirkulasi, reservasi, refreshSirkulasi, refreshDendaPerpus, refreshReservasi, toast } = useAppData();
  const { currentUser } = useAuth();
  const { aturan, bukuByKode } = usePerpus();
  const [q, setQ] = useState('');
  const [tglKembali, setTglKembali] = useState(sekarangWIB().tanggal);
  const [proses, setProses] = useState('');
  const tarif = Number(aturan.tarifDendaPerHari) || 0;

  const aktif = useMemo(() => sirkulasi.filter(sedangDipinjam).sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo)), [sirkulasi]);
  const tampil = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return aktif;
    return aktif.filter(x => `${x.kodeBuku} ${x.judul} ${x.nama} ${x.kodeAnggota}`.toLowerCase().includes(t));
  }, [aktif, q]);

  async function kembalikan(x) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (tglKembali < x.pinjam) { toast('Tanggal kembali tidak boleh sebelum tanggal pinjam.', 'error'); return; }
    setProses(x.id);
    try {
      await updateSirkulasiInSheet({ ...x.raw, 'Tanggal Kembali': tglKembali, Status: 'Dikembalikan', Petugas: currentUser.nama });
      const hari = Math.max(0, selisihHari(x.jatuhTempo, tglKembali));
      let pesan = `"${x.judul}" dikembalikan ${x.nama}.`;
      if (hari > 0 && tarif > 0) {
        await addDendaPerpusToSheet({
          'No Sirkulasi': x.no, 'Kode Buku': x.kodeBuku, 'Judul Buku': x.judul, 'Kode Anggota': x.kodeAnggota, 'Nama Peminjam': x.nama,
          'Jenis Denda': 'Keterlambatan', 'Hari Terlambat': hari, Nominal: hari * tarif, Status: 'Belum Dibayar', 'Tanggal Denda': tglKembali, 'Tanggal Bayar': '',
          Keterangan: `Terlambat ${hari} hari mengembalikan buku.`,
        });
        pesan += ` Terlambat ${hari} hari, denda ${formatRupiah(hari * tarif)}.`;
      }
      // Reservasi tertua yg menunggu buku ini -> otomatis "Siap Diambil".
      const antre = reservasi.filter(r => r.kodeBuku === x.kodeBuku && r.status === 'Menunggu').sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0];
      if (antre) {
        await updateReservasiInSheet({ ...antre.raw, Status: 'Siap Diambil', Catatan: `${antre.catatan ? antre.catatan + '; ' : ''}Siap diambil sejak ${tglKembali}` });
        pesan += ` Buku ini dipesan ${antre.nama} — sisihkan, status reservasi jadi Siap Diambil.`;
      }
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Pengembalian Buku', modul: 'Perpustakaan', detail: pesan });
      toast(pesan);
      setQ('');
      await Promise.all([refreshSirkulasi(), refreshDendaPerpus(), refreshReservasi()]);
    } catch (e) { toast(e.message, 'error'); } finally { setProses(''); }
  }

  function onScan(e) {
    e.preventDefault();
    const kode = q.trim().toUpperCase();
    const cocok = aktif.filter(x => x.kodeBuku.toUpperCase() === kode);
    if (cocok.length === 1) kembalikan(cocok[0]);
    else if (!cocok.length && bukuByKode[kode]) toast('Buku ini tidak sedang dipinjam.', 'error');
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Pengembalian</h3><p>Scan label buku untuk langsung mengembalikan, atau cari lalu klik Kembalikan. Denda keterlambatan {formatRupiah(tarif)}/hari tercatat otomatis.</p></div></div>
      <div className="card-body">
        <div className="filter-bar">
          <form className="scan-box" onSubmit={onScan} style={{ flex: '1 1 320px' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Scan label buku, atau cari judul / nama peminjam…" aria-label="Cari pinjaman" autoComplete="off" />
          </form>
          <Field label="Tanggal kembali"><input type="date" value={tglKembali} onChange={e => setTglKembali(e.target.value)} /></Field>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>{aktif.length} buku sedang dipinjam · {aktif.filter(x => x.jatuhTempo < tglKembali).length} lewat jatuh tempo</p>
        {!tampil.length ? <Kosong>{aktif.length ? 'Tidak ada pinjaman yang cocok.' : 'Tidak ada buku yang sedang dipinjam.'}</Kosong> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Buku</th><th>Peminjam</th><th>Pinjam</th><th>Jatuh Tempo</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {tampil.slice(0, 100).map(x => {
                  const telat = Math.max(0, selisihHari(x.jatuhTempo, tglKembali));
                  return (
                    <tr key={x.id}>
                      <td><b><ClipCell value={x.judul} maxWidth={240} /></b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kodeBuku}</div></td>
                      <td>{x.nama}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kelas}</div></td>
                      <td>{formatTanggalAngka(x.pinjam)}</td><td>{formatTanggalAngka(x.jatuhTempo)}</td>
                      <td>{telat ? <span className="badge badge-red">Terlambat {telat} hari · {formatRupiah(telat * tarif)}</span> : <span className="badge badge-green">Tepat waktu</span>}</td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => kembalikan(x)} disabled={!!proses}>{proses === x.id ? '…' : 'Kembalikan'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sirkulasi() {
  const { refreshSirkulasi } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('sirkulasi', TABS.map(t => t.id));
  const hariIni = sekarangWIB().tanggal;
  return (
    <Page pageId="sirkulasi" title="Sirkulasi" path="Perpustakaan / Sirkulasi">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'pinjam' && bolehTab('pinjam') && <Peminjaman />}
          {tab === 'kembali' && bolehTab('kembali') && <Pengembalian />}
          {tab === 'riwayat' && bolehTab('riwayat') && (
            <GenericStoredTable title="Riwayat sirkulasi" subtitle="Semua peminjaman. Jatuh tempo bisa diperpanjang lewat Edit."
              headers={SIRKULASI_HEADERS} fields={EDIT_FIELDS}
              fetchFn={fetchSirkulasiFromSheet} updateFn={updateSirkulasiInSheet} deleteFn={deleteSirkulasiFromSheet}
              moduleLabel="Sirkulasi Buku" labelKey="Judul Buku" target="akademik"
              columnRenderers={{ Status: r => {
                const telat = r.Status === 'Dipinjam' && String(r['Jatuh Tempo']).slice(0, 10) < hariIni;
                const telatKembali = r.Status === 'Dikembalikan' && String(r['Tanggal Kembali']).slice(0, 10) > String(r['Jatuh Tempo']).slice(0, 10);
                return <span className={`badge ${telat ? 'badge-red' : r.Status === 'Dipinjam' ? 'badge-blue' : telatKembali ? 'badge-gold' : 'badge-green'}`}>{telat ? 'Terlambat' : telatKembali ? 'Kembali (terlambat)' : r.Status}</span>;
              } }}
              searchFn={(r, t) => `${r['Judul Buku']} ${r['Nama Peminjam']} ${r['Kode Buku']} ${r.Status}`.toLowerCase().includes(t)} onChanged={refreshSirkulasi} />
          )}
        </div>
      </div>
    </Page>
  );
}
