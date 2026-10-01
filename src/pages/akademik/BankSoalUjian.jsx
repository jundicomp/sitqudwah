import ClipCell from '../../components/common/ClipCell';
import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { semesterDariTanggal, labelRombel } from '../../db/akademikFields';
import {
  BANK_SOAL_TABEL, UJIAN_TABEL, buildBankSoalFields, buildUjianFields, validasiSoal, normalizeSheetBankSoal,
} from '../../db/akademikLanjutanFields';
import { todayWIB, formatTanggal } from '../../db/helpers';
import {
  fetchBankSoalFromSheet, addBankSoalToSheet, updateBankSoalInSheet, deleteBankSoalFromSheet,
  fetchUjianFromSheet, addUjianToSheet, updateUjianInSheet, deleteUjianFromSheet, addLogEntry,
} from '../../services/googleSheets';
import { printElementById } from '../../utils/exportTable';
import { APP_NAME } from '../../config/appInfo';

const TABS = [
  { id: 'soal', label: 'BANK SOAL' },
  { id: 'tambah-soal', label: 'TAMBAH SOAL' },
  { id: 'ujian', label: 'DAFTAR UJIAN' },
  { id: 'tambah-ujian', label: 'BUAT UJIAN' },
];
const BADGE_UJIAN = { Draft: 'badge-muted', Aktif: 'badge-gold', Selesai: 'badge-green' };
const buangVirtual = ({ Kelas, 'Jumlah Soal': _j, ...rest }) => rest; // eslint-disable-line no-unused-vars

function KelolaSoalModal({ ujian, bankSoal, onClose, onSaved }) {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [dipilih, setDipilih] = useState(() => String(ujian['Soal No'] || '').split(',').map(x => x.trim()).filter(Boolean));
  const [menyimpan, setMenyimpan] = useState(false);
  const kandidat = bankSoal.filter(b => b.mapel === ujian['Mata Pelajaran'] && b.tingkat === String(ujian.Tingkat));
  const byNo = Object.fromEntries(bankSoal.map(b => [b.no, b]));
  const totalPoin = dipilih.reduce((a, no) => a + (byNo[no]?.poin || 0), 0);
  const toggle = (no) => setDipilih(d => d.includes(no) ? d.filter(x => x !== no) : [...d, no]);
  const geser = (i, n) => setDipilih(d => { const a = [...d]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function simpan() {
    setMenyimpan(true);
    try {
      await updateUjianInSheet({ ...buangVirtual(ujian), 'Soal No': dipilih.join(',') });
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Kelola Soal Ujian', modul: 'Bank Soal & Ujian', detail: `${ujian.Judul}: ${dipilih.length} soal, ${totalPoin} poin` });
      toast('Susunan soal tersimpan.');
      onSaved(); onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <Modal wide title={`Kelola soal: ${ujian.Judul}`} subtitle={`${ujian['Mata Pelajaran']} · Kelas ${ujian.Tingkat} · ${dipilih.length} soal · ${totalPoin} poin`} onClose={onClose}
      actions={<><button className="btn" onClick={onClose}>Batal</button><button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan susunan soal'}</button></>}>
      {dipilih.length > 0 && (
        <>
          <h4 style={{ margin: '4px 0 6px', color: 'var(--green-dark)' }}>Urutan di naskah</h4>
          <ol style={{ margin: '0 0 14px', paddingLeft: 22, fontSize: 13 }}>
            {dipilih.map((no, i) => (
              <li key={no} style={{ marginBottom: 4 }}>
                {byNo[no]?.pertanyaan || <i>Soal No. {no} sudah dihapus dari bank soal</i>}
                <span style={{ whiteSpace: 'nowrap', marginLeft: 6 }}>
                  <button className="btn-icon" onClick={() => geser(i, -1)} aria-label="Naikkan">▲</button>
                  <button className="btn-icon" onClick={() => geser(i, 1)} aria-label="Turunkan">▼</button>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      <h4 style={{ margin: '4px 0 6px', color: 'var(--green-dark)' }}>Soal tersedia untuk {ujian['Mata Pelajaran']} kelas {ujian.Tingkat}</h4>
      {!kandidat.length ? <Kosong>Belum ada soal untuk mapel dan tingkat ini. Tambahkan dulu di tab Tambah Soal.</Kosong> : (
        <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table>
            <thead><tr><th></th><th>Pertanyaan</th><th>Jenis</th><th>Kesulitan</th><th>Poin</th></tr></thead>
            <tbody>
              {kandidat.map(b => (
                <tr key={b.no}>
                  <td><input type="checkbox" checked={dipilih.includes(b.no)} onChange={() => toggle(b.no)} aria-label={`Pilih soal ${b.no}`} /></td>
                  <td style={{ fontSize: 13 }}><ClipCell value={b.pertanyaan} maxWidth={380} /></td><td>{b.jenis}</td><td>{b.kesulitan}</td><td>{b.poin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function NaskahModal({ ujian, bankSoal, kunci, onClose }) {
  const { profilSekolah } = useAppData();
  const byNo = Object.fromEntries(bankSoal.map(b => [b.no, b]));
  const soal = String(ujian['Soal No'] || '').split(',').map(x => byNo[x.trim()]).filter(Boolean);
  const total = soal.reduce((a, b) => a + b.poin, 0);
  const id = 'naskah-ujian-print';
  return (
    <Modal wide title={kunci ? 'Kunci jawaban' : 'Naskah soal'} subtitle={ujian.Judul} onClose={onClose}
      actions={<><button className="btn" onClick={onClose}>Tutup</button><button className="btn btn-primary" onClick={() => printElementById(id)} disabled={!soal.length}>🖨️ Cetak / PDF</button></>}>
      {!soal.length ? <Kosong>Ujian ini belum punya soal. Atur lewat tombol Kelola Soal.</Kosong> : (
        <div id={id} className="doc-print">
          <h2>{ujian.Judul}{kunci ? ' — Kunci Jawaban' : ''}</h2>
          <p className="doc-sub">{profilSekolah?.nama || APP_NAME} · Tahun Ajaran {ujian['Tahun Ajaran']} · Semester {ujian.Semester}</p>
          <div className="doc-meta">
            <div><b>Mata Pelajaran:</b> {ujian['Mata Pelajaran']}</div>
            <div><b>Kelas:</b> {labelRombel(ujian.Tingkat, ujian.Rombel)}</div>
            <div><b>Hari/Tanggal:</b> {ujian.Tanggal ? formatTanggal(String(ujian.Tanggal).slice(0, 10) + 'T00:00:00') : '-'}</div>
            <div><b>Waktu:</b> {ujian['Durasi (Menit)']} menit</div>
            {!kunci && <div><b>Nama:</b> ........................................</div>}
            <div><b>Jumlah Soal / Poin:</b> {soal.length} soal / {total} poin</div>
          </div>
          {soal.map((b, i) => (
            <div key={b.no} className="soal">
              <b>{i + 1}.</b> {b.pertanyaan} <span style={{ color: '#666', fontSize: 12 }}>({b.poin} poin)</span>
              {b.jenis === 'Pilihan Ganda' ? (
                <div className="opsi">{b.pilihan.map(p => <div key={p.huruf} style={kunci && p.huruf === b.kunci ? { fontWeight: 700, textDecoration: 'underline' } : undefined}>{p.huruf}. {p.teks}</div>)}</div>
              ) : kunci ? (
                <div style={{ marginLeft: 20 }}><i>Jawaban/rubrik:</i> {b.kunci}</div>
              ) : (
                <div style={{ marginLeft: 20, marginTop: 6, borderBottom: '1px dotted #555', height: b.jenis === 'Esai' ? 70 : 22 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function BankSoalUjian() {
  const { bankSoal, ujian, refreshBankSoal, refreshUjian } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('bank-soal', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, rombelLabels, guruOptions, withKelasVirtual, fromKelasVirtual } = useAkademikOptions();
  const [kelola, setKelola] = useState(null);
  const [naskah, setNaskah] = useState(null); // { ujian, kunci }
  const [sinyal, setSinyal] = useState(0);
  const [soalTerbaru, setSoalTerbaru] = useState(null); // hasil fetch utk modal (lebih segar dari context)

  const soalFields = useMemo(() => buildBankSoalFields({ tahunAjaranOptions, guruOptions }), [tahunAjaranOptions, guruOptions]);
  const ujianFields = useMemo(() => buildUjianFields({ tahunAjaranOptions, rombelLabels, guruOptions }), [tahunAjaranOptions, rombelLabels, guruOptions]);
  const emptySoal = useCallback(() => ({
    'Mata Pelajaran': '', Tingkat: '', 'Jenis Soal': 'Pilihan Ganda', Kesulitan: 'Sedang', Pertanyaan: '',
    'Pilihan A': '', 'Pilihan B': '', 'Pilihan C': '', 'Pilihan D': '', 'Kunci Jawaban': '', Poin: 10, 'Tahun Ajaran': taAktif, Guru: '',
  }), [taAktif]);
  const emptyUjian = useCallback(() => ({
    Judul: '', 'Mata Pelajaran': '', Kelas: '', 'Tahun Ajaran': taAktif, Semester: semesterDariTanggal(), Tanggal: todayWIB(),
    'Durasi (Menit)': 60, Status: 'Draft', 'Guru Pengawas': '', Catatan: '',
  }), [taAktif]);

  const addSoal = useCallback(async (f) => { await addBankSoalToSheet(validasiSoal(f)); await refreshBankSoal(); }, [refreshBankSoal]);
  const updateSoal = useCallback((r) => updateBankSoalInSheet(validasiSoal(r)), []);
  const addUjian = useCallback(async (f) => { await addUjianToSheet({ ...fromKelasVirtual(f), 'Soal No': '' }); await refreshUjian(); }, [fromKelasVirtual, refreshUjian]);
  // Edit: Kelas (virtual) -> Tingkat/Rombel; "Jumlah Soal" (virtual) dibuang.
  const updateUjian = useCallback(({ 'Jumlah Soal': _j, ...r }) => updateUjianInSheet(fromKelasVirtual(r)), [fromKelasVirtual]); // eslint-disable-line no-unused-vars
  const fetchUjian = useCallback(async () => (await fetchUjianFromSheet()).map(r => ({
    ...withKelasVirtual(r), 'Jumlah Soal': String(r['Soal No'] || '').split(',').filter(x => x.trim()).length,
  })), [withKelasVirtual]);

  async function bukaModal(setter, payload) {
    try { setSoalTerbaru((await fetchBankSoalFromSheet()).map(normalizeSheetBankSoal)); } catch { setSoalTerbaru(null); }
    setter(payload);
  }
  const soalUntukModal = soalTerbaru || bankSoal;

  const stat = useMemo(() => ({
    soal: bankSoal.length, pg: bankSoal.filter(b => b.jenis === 'Pilihan Ganda').length,
    ujianAktif: ujian.filter(u => u.status === 'Aktif').length, ujianDraft: ujian.filter(u => u.status === 'Draft').length,
  }), [bankSoal, ujian]);

  return (
    <Page pageId="bank-soal" title="Bank Soal & Ujian" path="Akademik / Bank Soal & Ujian">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.soal} label="Soal di bank" color="c-green" />
        <InfoCard value={stat.pg} label="Pilihan ganda" color="c-blue" />
        <InfoCard value={stat.ujianDraft} label="Ujian draft" color="c-purple" />
        <InfoCard value={stat.ujianAktif} label="Ujian aktif" color="c-gold" />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'soal' && bolehTab('soal') && (
            <GenericStoredTable
              title="Bank soal" subtitle="Kumpulan soal per mapel dan tingkat yang bisa dipakai ulang di banyak ujian."
              headers={BANK_SOAL_TABEL} fields={soalFields}
              fetchFn={fetchBankSoalFromSheet} updateFn={updateSoal} deleteFn={deleteBankSoalFromSheet}
              moduleLabel="Bank Soal" labelKey="Pertanyaan" target="akademik"
              columnRenderers={{ Pertanyaan: r => <ClipCell value={r.Pertanyaan} maxWidth={340} /> }}
              searchFn={(r, t) => `${r['Mata Pelajaran']} ${r.Pertanyaan} ${r['Jenis Soal']} kelas ${r.Tingkat}`.toLowerCase().includes(t)}
              onChanged={refreshBankSoal}
            />
          )}
          {tab === 'tambah-soal' && bolehTab('tambah-soal') && (
            <GenericManualForm fields={soalFields} emptyRow={emptySoal} addFn={addSoal} target="akademik"
              title="Tambah soal" subtitle="Untuk pilihan ganda isi Pilihan A–D dan kunci berupa hurufnya. Untuk isian/esai, kosongkan pilihan dan tulis jawaban atau rubrik di kunci." />
          )}
          {tab === 'ujian' && bolehTab('ujian') && (
            <GenericStoredTable
              title="Daftar ujian" subtitle="Susun soal dari bank soal lewat Kelola Soal, lalu cetak naskah dan kunci jawabannya."
              headers={UJIAN_TABEL} fields={ujianFields}
              fetchFn={fetchUjian} updateFn={updateUjian} deleteFn={deleteUjianFromSheet}
              moduleLabel="Ujian" labelKey="Judul" target="akademik" refreshSignal={sinyal}
              columnRenderers={{ Status: r => <span className={`badge ${BADGE_UJIAN[r.Status] || 'badge-muted'}`}>{r.Status}</span> }}
              extraActions={r => (
                <>
                  <button className="btn btn-sm" onClick={() => bukaModal(setKelola, r)}>Kelola Soal</button>
                  <button className="btn btn-sm" onClick={() => bukaModal(setNaskah, { ujian: r, kunci: false })}>Naskah</button>
                  <button className="btn btn-sm" onClick={() => bukaModal(setNaskah, { ujian: r, kunci: true })}>Kunci</button>
                </>
              )}
              searchFn={(r, t) => `${r.Judul} ${r['Mata Pelajaran']} ${r.Kelas} ${r.Status}`.toLowerCase().includes(t)}
              onChanged={refreshUjian}
            />
          )}
          {tab === 'tambah-ujian' && bolehTab('tambah-ujian') && (
            <GenericManualForm fields={ujianFields} emptyRow={emptyUjian} addFn={addUjian} target="akademik"
              title="Buat ujian" subtitle="Setelah tersimpan, buka Daftar Ujian lalu klik Kelola Soal untuk memilih soalnya." />
          )}
        </div>
      </div>
      {kelola && <KelolaSoalModal ujian={kelola} bankSoal={soalUntukModal} onClose={() => setKelola(null)} onSaved={() => { setSinyal(x => x + 1); refreshUjian(); }} />}
      {naskah && <NaskahModal ujian={naskah.ujian} kunci={naskah.kunci} bankSoal={soalUntukModal} onClose={() => setNaskah(null)} />}
    </Page>
  );
}
