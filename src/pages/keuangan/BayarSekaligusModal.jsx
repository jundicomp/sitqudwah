import { useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BULAN_ID, todayWIB, parseTanggalFleksibel } from '../../db/helpers';
import { statusTagihan } from '../../db/tagihanHelpers';
import { nominalEfektifTagihan, nominalSppSaatTerbit } from '../../db/beasiswaFields';
import { cariTarifSppUntukKelas } from '../../db/tarifFields';
import { METODE_BAYAR_OPTIONS, SARAN_AKUN_PER_METODE } from '../../db/pembayaranFields';
import { akunAktivaOptions } from '../../db/akunBukuBesarFields';
import { bulkAddTagihanSppToSheet, bulkAddPembayaranToSheet, fetchTagihanSppFromSheet, addLogEntry } from '../../services/googleSheets';
import SaveProgressModal from '../../components/common/SaveProgressModal';

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

function keyBulan(monthIdx, calYear) {
  return `${monthIdx}-${calYear}`;
}

const STATUS_INFO = {
  'Lunas': { badge: 'badge-green', label: 'Lunas' },
  'Sebagian': { badge: 'badge-gold', label: 'Sebagian' },
  'Belum Lunas': { badge: 'badge-red', label: 'Belum Bayar' },
  'Belum Ditagih': { badge: 'badge-blue', label: '🆕 Belum Ditagih' },
  'Beasiswa Penuh': { badge: 'badge-purple', label: '🎓 Beasiswa 100%' },
};

// Modal "Bayar SPP Beberapa Bulan Sekaligus" -- dibuka dari tab Pembayaran begitu
// siswa sudah ditemukan/dipilih (siswa DIKIRIM sbg prop, modal ini TIDAK punya
// pencarian siswa sendiri lagi -- dulu ini tab terpisah "Bayar Sekaligus" dgn
// pencarian sendiri, sekarang digabung jadi 1 tombol di sini spy tdk perlu
// berpindah tab/cari ulang siswa yg sama).
export default function BayarSekaligusModal({ siswa, onClose }) {
  const {
    tarif, tahunAjaranAktif, tagihanSpp, tagihanTerbayar, beasiswaSiswa, beasiswaKategori, akun,
    refreshTagihanSpp, refreshPembayaran, toast,
  } = useAppData();
  const { currentUser } = useAuth();

  const [bulanTerpilih, setBulanTerpilih] = useState({});
  const [sampaiBulanKey, setSampaiBulanKey] = useState('');
  const [tanggalBayar, setTanggalBayar] = useState(() => todayWIB());
  const [metode, setMetode] = useState(METODE_BAYAR_OPTIONS[0]);
  const [akunPenerima, setAkunPenerima] = useState(SARAN_AKUN_PER_METODE[METODE_BAYAR_OPTIONS[0]] || 'Kas');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);

  const tarifSiswa = useMemo(() => {
    if (!tahunAjaranAktif) return null;
    return cariTarifSppUntukKelas(tarif, tahunAjaranAktif.label, siswa.kelasTingkat);
  }, [siswa, tarif, tahunAjaranAktif]);

  // Jadwal 12 bulan SPP tahun ajaran aktif KHUSUS siswa ini -- lihat catatan lengkap
  // soal per-siswa vs per-bulan di BayarSekaligusModal versi sebelumnya (dulu file
  // terpisah BayarSekaligusTab.jsx).
  const jadwalBulan = useMemo(() => {
    if (!tahunAjaranAktif) return [];
    const startYear = parseInt(tahunAjaranAktif.label.split('/')[0]);
    const cutoffMs = Date.now();
    const tagihanSiswa = tagihanSpp.filter(t => t.nisn === siswa.nisn && t.tahunAjaran === tahunAjaranAktif.label);
    const list = [];
    for (let m = 0; m < 12; m++) {
      const monthIdx = (6 + m) % 12;
      const calYear = monthIdx >= 6 ? startYear : startYear + 1;
      const bulanLabel = BULAN_ID[monthIdx];
      const t = tagihanSiswa.find(x => x.bulan === bulanLabel && Number(x.tahunKalender) === calYear);
      if (t) {
        const terbayar = tagihanTerbayar('SPP', t.no, t.nisn);
        const { nominalEfektif, potongan } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar);
        const sisa = Math.max(0, nominalEfektif - terbayar);
        const status = statusTagihan(nominalEfektif, terbayar);
        list.push({ monthIdx, calYear, bulanLabel, ada: true, no: t.no, nominal: nominalEfektif, sisa, status, potongan, bisaDipilih: status !== 'Lunas' });
      } else {
        const nominalPenuh = tarifSiswa ? tarifSiswa.nominal : 0;
        const tanggalAwalBulanMs = new Date(calYear, monthIdx, 1).getTime();
        const { nominal, potongan } = nominalSppSaatTerbit(siswa.nisn, nominalPenuh, tanggalAwalBulanMs, beasiswaSiswa, beasiswaKategori, parseTanggalFleksibel);
        const beasiswaPenuh = nominal <= 0;
        list.push({
          monthIdx, calYear, bulanLabel, ada: false, no: null, nominal, sisa: nominal, potongan,
          status: beasiswaPenuh ? 'Beasiswa Penuh' : 'Belum Ditagih',
          bisaDipilih: !beasiswaPenuh && !!tarifSiswa,
        });
      }
    }
    return list;
  }, [siswa, tahunAjaranAktif, tagihanSpp, tarifSiswa, tagihanTerbayar, beasiswaSiswa, beasiswaKategori]);

  function toggleBulan(item) {
    if (!item.bisaDipilih) return;
    const k = keyBulan(item.monthIdx, item.calYear);
    setBulanTerpilih(prev => ({ ...prev, [k]: !prev[k] }));
  }

  function terapkanSampaiBulan() {
    if (!sampaiBulanKey) return;
    const idxTarget = jadwalBulan.findIndex(j => keyBulan(j.monthIdx, j.calYear) === sampaiBulanKey);
    if (idxTarget === -1) return;
    const next = { ...bulanTerpilih };
    for (let i = 0; i <= idxTarget; i++) {
      const j = jadwalBulan[i];
      if (j.bisaDipilih) next[keyBulan(j.monthIdx, j.calYear)] = true;
    }
    setBulanTerpilih(next);
  }

  const dipilih = useMemo(
    () => jadwalBulan.filter(j => j.bisaDipilih && bulanTerpilih[keyBulan(j.monthIdx, j.calYear)]),
    [jadwalBulan, bulanTerpilih]
  );
  const totalNominal = dipilih.reduce((s, j) => s + j.sisa, 0);
  const jumlahBaruTerbit = dipilih.filter(j => !j.ada).length;

  function handleGantiMetode(m) {
    setMetode(m);
    setAkunPenerima(SARAN_AKUN_PER_METODE[m] || 'Kas');
  }

  async function simpan() {
    if (dipilih.length === 0) { toast('Pilih minimal 1 bulan yang mau dibayar.', 'error'); return; }
    if (!tanggalBayar) { toast('Isi tanggal bayar.', 'error'); return; }
    const belumAdaTagihan = dipilih.filter(j => !j.ada);
    if (belumAdaTagihan.length > 0 && !tarifSiswa) { toast('Tarif SPP untuk kelas siswa ini belum diatur. Lengkapi dulu di tab Tarif.', 'error'); return; }

    setSaving(true);
    setPhase('saving');
    try {
      const tagihanBaruByKey = {};
      if (belumAdaTagihan.length > 0) {
        const rows = belumAdaTagihan.map(j => ({
          NISN: siswa.nisn,
          'Nama Siswa': siswa.nama,
          'Tahun Ajaran': tahunAjaranAktif.label,
          Bulan: j.bulanLabel,
          'Tahun Kalender': j.calYear,
          Nominal: j.nominal,
          'Jatuh Tempo': `10/${j.monthIdx + 1}/${j.calYear}`,
          Keterangan: j.potongan ? `Potongan Beasiswa: ${j.potongan.nama} (${formatRupiah(j.potongan.potonganSpp)})` : '',
        }));
        await bulkAddTagihanSppToSheet(rows);
        const rawTerbaru = await fetchTagihanSppFromSheet();
        belumAdaTagihan.forEach(j => {
          const found = rawTerbaru.find(r =>
            String(r['NISN'] ?? '').trim() === siswa.nisn &&
            r['Bulan'] === j.bulanLabel &&
            Number(r['Tahun Kalender']) === j.calYear &&
            String(r['Tahun Ajaran'] ?? '').trim() === tahunAjaranAktif.label
          );
          if (found) tagihanBaruByKey[keyBulan(j.monthIdx, j.calYear)] = found['No'];
        });
      }

      const rowsBayar = dipilih
        .map(j => {
          const refNo = j.ada ? j.no : tagihanBaruByKey[keyBulan(j.monthIdx, j.calYear)];
          return {
            RefType: 'SPP',
            RefNo: refNo,
            NISN: siswa.nisn,
            'Nama Siswa': siswa.nama,
            Jenis: `SPP ${j.bulanLabel} ${j.calYear}`,
            Nominal: j.sisa,
            'Tanggal Bayar': tanggalBayar,
            Metode: metode,
            Akun: akunPenerima,
            Keterangan: `Bayar SPP Sekaligus (${dipilih.length} bulan)${j.potongan ? ` — Potongan Beasiswa: ${j.potongan.nama}` : ''}`,
          };
        })
        .filter(r => r.RefNo && r.Nominal > 0);

      if (rowsBayar.length > 0) await bulkAddPembayaranToSheet(rowsBayar);

      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Catat Pembayaran',
        modul: 'Pembayaran & Invoice',
        // Format singkat "Jenis - NISN Nama - Rp..." konsisten dgn PembayaranTab.jsx --
        // daftar bulan tetap disertakan (informasi penting), tapi kalimat panjangnya dipangkas.
        detail: `SPP Sekaligus ${dipilih.length} Bulan (${dipilih.map(j => `${j.bulanLabel} ${j.calYear}`).join(', ')}) - ${siswa.nisn} ${siswa.nama} - ${formatRupiah(totalNominal)}${jumlahBaruTerbit > 0 ? ` (${jumlahBaruTerbit} bln baru terbit)` : ''}`,
      });

      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      await Promise.all([refreshTagihanSpp(), refreshPembayaran()]);
      toast(`Pembayaran ${dipilih.length} bulan SPP untuk ${siswa.nama} berhasil disimpan.`);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setSaving(false);
      setPhase(null);
    }
  }

  return (
    <>
      <Modal
        title="🗓️ Bayar SPP Sekaligus"
        subtitle={`${siswa.nama} — Kelas ${siswa.kelasTingkat || '-'}${siswa.rombel ? ' Rombel ' + siswa.rombel : ''} · Tarif SPP: ${tarifSiswa ? `${formatRupiah(tarifSiswa.nominal)}/bulan` : 'belum diatur'}`}
        onClose={onClose}
        actions={
          <>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Batal</button>
            <button type="button" className="btn btn-primary" onClick={simpan} disabled={saving || dipilih.length === 0}>
              {saving ? 'Menyimpan...' : `Simpan — ${dipilih.length} Bulan (${formatRupiah(totalNominal)})`}
            </button>
          </>
        }
      >
        {!tarifSiswa && (
          <p style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 12 }}>
            ⚠️ Tarif SPP untuk Kelas {siswa.kelasTingkat} belum diatur — bulan yang "Belum Ditagih" tidak bisa dipilih sampai tarifnya dilengkapi di tab Tarif.
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F6F8F5', borderRadius: 8, marginBottom: 10, fontSize: 12.5 }}>
          <span style={{ fontWeight: 700, color: 'var(--muted)' }}>⚡ Bayar sampai bulan</span>
          <select value={sampaiBulanKey} onChange={e => setSampaiBulanKey(e.target.value)} style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12.5 }}>
            <option value="">— pilih bulan —</option>
            {jadwalBulan.map(j => (
              <option key={keyBulan(j.monthIdx, j.calYear)} value={keyBulan(j.monthIdx, j.calYear)}>{j.bulanLabel} {j.calYear}</option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={terapkanSampaiBulan} disabled={!sampaiBulanKey}>Terapkan ↓</button>
        </div>

        <div className="table-scroll" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table>
            <thead><tr><th style={{ width: 32 }}></th><th>Bulan</th><th>Status</th><th style={{ textAlign: 'right' }}>Nominal</th></tr></thead>
            <tbody>
              {jadwalBulan.map(j => {
                const k = keyBulan(j.monthIdx, j.calYear);
                const info = STATUS_INFO[j.status];
                return (
                  <tr key={k} style={!j.bisaDipilih ? { color: 'var(--muted)' } : undefined}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" style={{ width: 15, height: 15 }} checked={!!bulanTerpilih[k]} disabled={!j.bisaDipilih} onChange={() => toggleBulan(j)} />
                    </td>
                    <td>{j.bulanLabel} {j.calYear}</td>
                    <td><span className={`badge ${info.badge}`}>{info.label}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: bulanTerpilih[k] ? 700 : 400 }}>{formatRupiah(j.sisa)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {jumlahBaruTerbit > 0 && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--purple-soft)', border: '1px solid #D8C9EE', borderRadius: 8, padding: '10px 13px', fontSize: 12, color: 'var(--purple-dark)', lineHeight: 1.5, margin: '12px 0' }}>
            <span>ℹ️</span>
            <span>{jumlahBaruTerbit} bulan belum ada tagihannya — akan diterbitkan otomatis khusus untuk <strong>{siswa.nama}</strong> (siswa lain tidak ikut ditagih), lalu langsung ditandai lunas.</span>
          </div>
        )}

        <div className="form-grid" style={{ marginTop: 14 }}>
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
            <label>Akun Penerima</label>
            <select value={akunPenerima} onChange={e => setAkunPenerima(e.target.value)}>
              {akunAktivaOptions(akun).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {phase && <SaveProgressModal phase={phase} />}
    </>
  );
}
