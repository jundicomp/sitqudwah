import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { addLogEntry, isConfigured } from '../../services/googleSheets';
import { PEMBAYARAN_BAWAAN, taBeku, taBerikut } from '../../db/sistemFields';
import { formatRupiah } from '../../db/helpers';

// v1.63.0: Keuangan › Pengaturan Keuangan › Status Pembayaran Siswa.
// Menjeda SELURUH sistem pembayaran siswa (SPP + biaya lain) sampai tahun ajaran tertentu.
function StatusPembayaranCard() {
  const { statusPembayaran, simpanKunciSistem, toast, tahunAjaran, tahunAjaranAktif, tagihanSppSemua, tagihanLainSemua, tagihanTerbayar } = useAppData();
  const { currentUser } = useAuth();
  const [f, setF] = useState(() => ({ ...PEMBAYARAN_BAWAAN, ...statusPembayaran }));
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { setF({ ...PEMBAYARAN_BAWAAN, ...statusPembayaran }); }, [statusPembayaran]);

  const opsiTa = useMemo(() => {
    const ada = [...new Set((tahunAjaran || []).map(t => t.label).filter(Boolean))].sort();
    const terakhir = ada[ada.length - 1] || tahunAjaranAktif?.label || '';
    const lanjut = taBerikut(terakhir);
    return [...ada, ...(lanjut && !ada.includes(lanjut) ? [lanjut] : [])];
  }, [tahunAjaran, tahunAjaranAktif]);
  useEffect(() => {
    if (!f.mulaiTa && opsiTa.length) setF(x => ({ ...x, mulaiTa: taBerikut(tahunAjaranAktif?.label) || opsiTa[opsiTa.length - 1] }));
  }, [opsiTa, f.mulaiTa, tahunAjaranAktif]);

  // Ringkasan tagihan yg akan / sedang dibekukan.
  const ringkas = useMemo(() => {
    const uji = { jeda: true, mulaiTa: f.mulaiTa };
    const beku = [...(tagihanSppSemua || []), ...(tagihanLainSemua || [])].filter(t => taBeku(uji, t.tahunAjaran));
    const nominal = beku.reduce((a, t) => a + t.nominal, 0);
    const dibayar = beku.reduce((a, t) => a + tagihanTerbayar(t.refType, t.no, t.nisn), 0);
    return { jumlah: beku.length, spp: beku.filter(t => t.refType === 'SPP').length, nominal, dibayar };
  }, [f.mulaiTa, tagihanSppSemua, tagihanLainSemua, tagihanTerbayar]);

  async function simpan(patch, pesanOk) {
    if (!isConfigured('master')) { toast('Data Induk belum tersambung.', 'error'); return; }
    const baru = { ...f, ...patch, oleh: currentUser?.nama || '', pada: new Date().toISOString() };
    if (baru.jeda && !baru.mulaiTa) { toast('Pilih tahun ajaran mulai dipakai.', 'error'); return; }
    setMenyimpan(true);
    try {
      await simpanKunciSistem('pembayaran', { jeda: !!baru.jeda, mulaiTa: baru.mulaiTa, pesan: String(baru.pesan || '').trim(), oleh: baru.oleh, pada: baru.pada });
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Status Pembayaran Siswa', modul: 'Pengaturan Keuangan', detail: baru.jeda ? `Dijeda, mulai dipakai TA ${baru.mulaiTa} (${ringkas.jumlah} tagihan dibekukan)` : 'Sistem pembayaran diaktifkan' });
      toast(pesanOk);
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Data Induk belum mengenal tab "sistem". Tempel ulang Code.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const aktifSekarang = statusPembayaran.jeda;
  const taAktifBeku = taBeku({ jeda: true, mulaiTa: f.mulaiTa }, tahunAjaranAktif?.label);
  return (
    <div className="card">
      <div className="card-head"><div><h3>💤 Status Pembayaran Siswa</h3>
        <p>Jeda seluruh sistem pembayaran siswa (SPP dan semua biaya lain) sampai tahun ajaran tertentu. Tagihan tahun ajaran sebelumnya tidak dihitung, tidak tampil, dan tidak bisa dibayar. <b>Data tidak dihapus</b>, jadi bisa dikembalikan kapan saja.</p></div>
        <span className={`badge ${aktifSekarang ? 'badge-gold' : 'badge-green'}`}>{aktifSekarang ? `Dijeda · mulai ${statusPembayaran.mulaiTa}` : 'Aktif'}</span>
      </div>
      <div className="card-body">
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700, fontSize: 14 }}>
          <input type="checkbox" checked={!!f.jeda} onChange={e => setF(x => ({ ...x, jeda: e.target.checked }))} style={{ width: 18, height: 18 }} />
          Sistem pembayaran belum dipakai (jeda)
        </label>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: 12 }}>
          <div className="field"><label htmlFor="jp-ta">Mulai dipakai tahun ajaran</label>
            <select id="jp-ta" value={f.mulaiTa} disabled={!f.jeda} onChange={e => setF(x => ({ ...x, mulaiTa: e.target.value }))}>
              {opsiTa.map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div className="field"><label htmlFor="jp-pesan">Keterangan di pita SPP (opsional)</label>
            <input id="jp-pesan" value={f.pesan} disabled={!f.jeda} placeholder={`Tagihan SPP & biaya lain mulai tahun ajaran ${f.mulaiTa || '…'}.`} onChange={e => setF(x => ({ ...x, pesan: e.target.value }))} /></div>
        </div>
        {f.jeda && (
          <div className="banner-info" style={{ marginTop: 12 }}><span>
            Tagihan yang dibekukan: <b>{ringkas.jumlah}</b> tagihan ({ringkas.spp} SPP, {ringkas.jumlah - ringkas.spp} biaya lain), total {formatRupiah(ringkas.nominal)}.
            {ringkas.dibayar > 0 ? <> Ada pembayaran {formatRupiah(ringkas.dibayar)} pada tagihan ini; uangnya tetap tercatat di kas dan laporan keuangan.</> : ' Belum ada pembayaran pada tagihan ini.'}
            {taAktifBeku ? <> Tahun ajaran aktif ({tahunAjaranAktif?.label}) ikut dijeda, jadi penerbitan SPP dan biaya lain dikunci.</> : null}
          </span></div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
          {aktifSekarang && <button className="btn" disabled={menyimpan} onClick={() => simpan({ jeda: false }, 'Sistem pembayaran diaktifkan. Semua tagihan kembali dihitung.')}>Aktifkan sekarang</button>}
          <button className="btn btn-primary" disabled={menyimpan} onClick={() => simpan({}, f.jeda ? `Sistem pembayaran dijeda sampai TA ${f.mulaiTa}.` : 'Pengaturan disimpan.')}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
        {statusPembayaran.pada && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0', textAlign: 'right' }}>Terakhir diubah {statusPembayaran.oleh ? `oleh ${statusPembayaran.oleh} ` : ''}{new Date(statusPembayaran.pada).toLocaleString('id-ID')}</p>}
      </div>
    </div>
  );
}

export default function PengaturanKeuangan() {
  return (
    <Page pageId="pengaturan-keuangan" title="Pengaturan Keuangan" path="Keuangan / Pengaturan Keuangan">
      <StatusPembayaranCard />
    </Page>
  );
}
