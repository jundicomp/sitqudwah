import { useMemo, useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import { useAppData } from '../../context/AppContext';
import { initials, avatarColor, todayWIB, formatTanggalTampil } from '../../db/helpers';
import { cariTarifSppUntukKelas } from '../../db/tarifFields';
import { formatRupiah } from '../../db/helpers';
import {
  addBeasiswaSiswaToSheet, updateBeasiswaSiswaInSheet, deleteBeasiswaSiswaFromSheet,
} from '../../services/googleSheets';
import InfoCard from '../../components/common/InfoCard';
import { IconGraduationCap, IconMoney } from '../../components/common/icons';

export default function BeasiswaSiswaTab() {
  const { siswa, beasiswaKategori, beasiswaSiswa, refreshBeasiswaSiswa, tarif, tahunAjaranAktif, toast } = useAppData();
  const [modalOpen, setModalOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState(null);
  const [kategoriDipilih, setKategoriDipilih] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(todayWIB());
  const [keterangan, setKeterangan] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!term.trim() || selectedSiswaId) return [];
    const t = term.toLowerCase();
    return siswa.filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t)).slice(0, 6);
  }, [term, siswa, selectedSiswaId]);

  const selectedSiswa = siswa.find(s => s.id === selectedSiswaId);

  function pilihSiswa(s) { setSelectedSiswaId(s.id); setTerm(s.nama); }

  function bersihkanForm() {
    setSelectedSiswaId(null); setTerm(''); setKategoriDipilih(''); setTanggalMulai(todayWIB()); setKeterangan('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!selectedSiswa) { toast('Pilih siswa dulu.', 'error'); return; }
    if (!kategoriDipilih) { toast('Pilih kategori beasiswa dulu.', 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await addBeasiswaSiswaToSheet({
        NISN: selectedSiswa.nisn,
        'Nama Siswa': selectedSiswa.nama,
        'Kategori Beasiswa': kategoriDipilih,
        'Tanggal Mulai': tanggalMulai,
        Keterangan: keterangan,
      });
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      bersihkanForm();
      refreshBeasiswaSiswa();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  // Perkiraan potongan SPP per bulan -- HANYA estimasi ke depan (berdasarkan tarif
  // SPP kelas siswa itu SAAT INI), BUKAN audit historis potongan yg sudah diberikan
  // sebelumnya (krn nominal yg sudah terlanjur diterbitkan tersimpan apa adanya).
  const daftarDenganEstimasi = useMemo(() => {
    return beasiswaSiswa.map(b => {
      const s = siswa.find(x => x.nisn === b.nisn);
      const kategori = beasiswaKategori.find(k => k.nama === b.kategoriBeasiswa);
      let estimasiPotonganSpp = 0;
      if (s && kategori && tahunAjaranAktif) {
        const t = cariTarifSppUntukKelas(tarif, tahunAjaranAktif.label, s.kelasTingkat);
        if (t) estimasiPotonganSpp = Math.min(kategori.potonganSpp, t.nominal);
      }
      return { ...b, kelasTingkat: s?.kelasTingkat || '-', potonganSpp: kategori?.potonganSpp || 0, potonganBiayaLain: kategori?.potonganBiayaLain || 0, estimasiPotonganSpp };
    });
  }, [beasiswaSiswa, siswa, beasiswaKategori, tarif, tahunAjaranAktif]);

  const totalEstimasiPotonganBulanan = daftarDenganEstimasi.reduce((s, b) => s + b.estimasiPotonganSpp, 0);

  async function hapusSiswa(row) {
    if (!confirm(`Hapus ${row.namaSiswa} dari daftar penerima beasiswa?`)) return;
    try {
      await deleteBeasiswaSiswaFromSheet(row.no);
      toast('Berhasil dihapus.');
      refreshBeasiswaSiswa();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="info-grid" style={{ marginBottom: 18 }}>
        <InfoCard icon={IconGraduationCap} color="c-purple" value={beasiswaSiswa.length} label="Siswa Penerima Beasiswa" />
        <InfoCard icon={IconMoney} color="c-gold" value={formatRupiah(totalEstimasiPotonganBulanan)} label="Estimasi Potongan SPP / Bulan" valueFontSize={17} />
      </div>

      <div className="card">
        <div className="card-head">
          <div><h3>👥 Siswa Penerima Beasiswa</h3><p>Daftar siswa yang tercatat menerima potongan/gratis biaya sesuai kategori beasiswanya.</p></div>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Tambah Penerima</button>
        </div>
        <div className="card-body">
          <DataTable
            columns={[
              { key: 'namaSiswa', label: 'Nama Siswa', accessor: r => r.namaSiswa, sortable: true },
              { key: 'nisn', label: 'NISN', accessor: r => r.nisn },
              { key: 'kelasTingkat', label: 'Kelas', accessor: r => r.kelasTingkat ? `Kelas ${r.kelasTingkat}` : '-' },
              { key: 'kategoriBeasiswa', label: 'Kategori Beasiswa', accessor: r => r.kategoriBeasiswa },
              { key: 'potongan', label: 'Potongan', accessor: r => `SPP ${formatRupiah(r.potonganSpp)} · Lain ${formatRupiah(r.potonganBiayaLain)}` },
              { key: 'tanggalMulai', label: 'Tanggal Mulai', accessor: r => formatTanggalTampil(r.tanggalMulai) },
              { key: 'keterangan', label: 'Keterangan', accessor: r => r.keterangan || '-' },
              { key: 'aksi', label: 'Aksi', headerClassName: 'no-print', render: r => <div className="no-print"><button className="btn btn-sm" onClick={() => hapusSiswa(r)}>🗑️</button></div> },
            ]}
            data={daftarDenganEstimasi}
            searchFn={(r, t) => (r.namaSiswa || '').toLowerCase().includes(t) || (r.nisn || '').includes(t) || (r.kategoriBeasiswa || '').toLowerCase().includes(t)}
            emptyMessage="Belum ada siswa yang tercatat menerima beasiswa."
            rowKey={r => r.id}
          />
        </div>
      </div>

      {modalOpen && (
        <Modal title="Tambah Siswa Penerima Beasiswa" onClose={() => { setModalOpen(false); bersihkanForm(); }}>
          <form onSubmit={submit}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Cari Siswa</label>
              <input
                ref={inputRef} type="text" value={term}
                onChange={e => { setTerm(e.target.value); setSelectedSiswaId(null); }}
                placeholder="Nama atau NISN..." style={{ width: '100%' }}
              />
              <SuggestionDropdown anchorRef={inputRef} visible={suggestions.length > 0}>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => pilihSiswa(s)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(s.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{initials(s.nama)}</div>
                    <div style={{ fontSize: 13 }}>{s.nama} <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>· {s.nisn} · Kelas {s.kelasTingkat || '-'}</span></div>
                  </div>
                ))}
              </SuggestionDropdown>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Kategori Beasiswa <span style={{ color: 'var(--red)' }}>*</span></label>
                <select value={kategoriDipilih} onChange={e => setKategoriDipilih(e.target.value)}>
                  <option value="">— pilih —</option>
                  {beasiswaKategori.map(k => <option key={k.id} value={k.nama}>{k.nama} (SPP -{formatRupiah(k.potonganSpp)}, Lain -{formatRupiah(k.potonganBiayaLain)})</option>)}
                </select>
                {beasiswaKategori.length === 0 && <p style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>Belum ada Kategori Beasiswa. Tambahkan dulu di tab "Kategori Beasiswa".</p>}
              </div>
              <div className="field">
                <label>Tanggal Mulai</label>
                <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Keterangan</label>
                <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="opsional" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn" onClick={bersihkanForm}>Bersihkan</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
          {phase && <SaveProgressModal phase={phase} />}
        </Modal>
      )}
    </>
  );
}
