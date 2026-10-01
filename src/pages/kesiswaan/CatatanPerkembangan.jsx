import { useCallback, useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import ClipCell from '../../components/common/ClipCell';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import AspekPerkembanganTab from './AspekPerkembanganTab';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { siswaDiRombel, labelRombel, semesterDariTanggal, dalamRentang } from '../../db/akademikFields';
import { ARAH_OPTIONS, IKON_ARAH, BADGE_ARAH, WARNA_ASPEK } from '../../db/perkembanganFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatTanggalAngka } from '../../db/helpers';
import { perkembanganApi, addLogEntry, isConfigured } from '../../services/googleSheets';

const TABS = [
  { id: 'linimasa', label: 'LINIMASA SISWA' },
  { id: 'daftar', label: 'SEMUA CATATAN' },
  { id: 'catat', label: 'CATAT PERKEMBANGAN' },
  { id: 'aspek', label: 'KATEGORI ASPEK' },
];
const kelasArah = (a) => (a === 'Perlu Perhatian' ? 'turun' : a === 'Tetap' ? 'tetap' : '');

function useWarnaAspek() {
  const { aspekSemua } = useAppData();
  return useCallback((nama) => { const i = aspekSemua.findIndex(a => a.nama === nama); return WARNA_ASPEK[(i < 0 ? 4 : i) % WARNA_ASPEK.length]; }, [aspekSemua]);
}

// Pilih siswa: rombel dulu, lalu siswa aktif di rombel itu.
function PilihSiswa({ rombelKey, setRombelKey, nisn, setNisn }) {
  const { siswa } = useAppData();
  const { rombelList } = useAkademikOptions();
  const rombel = rombelList.find(r => r.key === rombelKey);
  const daftar = useMemo(() => (rombel ? siswaDiRombel(siswa, rombel.tingkat, rombel.rombel).filter(s => s.nisn) : []), [siswa, rombel]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey, setRombelKey]);
  return (
    <>
      <Field label="Kelas / Rombel"><Select value={rombelKey} onChange={v => { setRombelKey(v); setNisn(''); }} options={rombelList.map(r => ({ value: r.key, label: r.label }))} /></Field>
      <Field label="Siswa" grow><Select value={nisn} onChange={setNisn} placeholder="— pilih siswa —" options={daftar.map(s => ({ value: s.nisn, label: s.nama }))} /></Field>
    </>
  );
}

function Linimasa({ onCatat, awal }) {
  const { siswa, perkembangan, aspekSemua } = useAppData();
  const warna = useWarnaAspek();
  const [rombelKey, setRombelKey] = useState(awal?.rombelKey || '');
  const [nisn, setNisn] = useState(awal?.nisn || '');
  const [filterAspek, setFilterAspek] = useState('');
  const sw = siswa.find(s => s.nisn === nisn);
  const milik = useMemo(() => perkembangan.filter(p => p.nisn === nisn).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || Number(b.no) - Number(a.no)), [perkembangan, nisn]);
  const tampil = milik.filter(p => !filterAspek || p.aspek === filterAspek);
  // Ringkasan per aspek: jumlah catatan & arah terakhir.
  const ringkas = useMemo(() => aspekSemua.map(a => {
    const x = milik.filter(p => p.aspek === a.nama);
    return { nama: a.nama, n: x.length, terakhir: x[0]?.arah };
  }).filter(r => r.n), [aspekSemua, milik]);

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Linimasa perkembangan</h3><p>Semua catatan satu siswa, terbaru di atas.</p></div>
        {sw && <button className="btn btn-primary btn-sm" onClick={() => onCatat({ rombelKey, nisn })}>+ Catat untuk {sw.nama.split(' ')[0]}</button>}
      </div>
      <div className="card-body">
        <div className="filter-bar"><PilihSiswa rombelKey={rombelKey} setRombelKey={setRombelKey} nisn={nisn} setNisn={setNisn} /></div>
        {!sw ? <Kosong>Pilih siswa untuk melihat linimasanya.</Kosong> : (
          <>
            {ringkas.length > 0 && (
              <div className="ringkas-bar" style={{ marginBottom: 14 }}>
                <button className={`badge ${!filterAspek ? 'badge-green' : 'badge-muted'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => setFilterAspek('')}>Semua · {milik.length}</button>
                {ringkas.map(r => (
                  <button key={r.nama} className={`badge ${filterAspek === r.nama ? warna(r.nama) : 'badge-muted'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => setFilterAspek(f => (f === r.nama ? '' : r.nama))}>
                    {r.nama} · {r.n} {r.terakhir && IKON_ARAH[r.terakhir]}
                  </button>
                ))}
              </div>
            )}
            {!tampil.length ? <Kosong>Belum ada catatan perkembangan untuk {sw.nama}.</Kosong> : (
              <div className="linimasa">
                {tampil.map(p => (
                  <div key={p.id} className={`linimasa-item ${kelasArah(p.arah)}`}>
                    <div className="linimasa-meta">
                      <b style={{ color: 'var(--green-dark)' }}>{formatTanggalAngka(p.tanggal)}</b>
                      <span className={`badge ${warna(p.aspek)}`}>{p.aspek}</span>
                      {p.arah && <span className={`badge ${BADGE_ARAH[p.arah] || 'badge-muted'}`}>{IKON_ARAH[p.arah]} {p.arah}</span>}
                      {p.noKasus && <span className="badge badge-muted">tindak lanjut kasus #{p.noKasus}</span>}
                      <span>· {p.oleh || '-'} · {labelRombel(p.tingkat, p.rombel)}</span>
                    </div>
                    <div className="linimasa-isi">{p.catatan}</div>
                    {p.tindakLanjut && <div className="linimasa-tl"><b>Rencana:</b> {p.tindakLanjut}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FormCatat({ awal, onSelesai }) {
  const { siswa, pelanggaran, aspekAktif, tahunAjaran, tahunAjaranAktif, refreshPerkembangan, toast } = useAppData();
  const { currentUser } = useAuth();
  const [rombelKey, setRombelKey] = useState(awal?.rombelKey || '');
  const [nisn, setNisn] = useState(awal?.nisn || '');
  const [f, setF] = useState({ tanggal: sekarangWIB().tanggal, aspek: '', arah: '', catatan: '', tindak: '', kasus: '' });
  const [menyimpan, setMenyimpan] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const sw = siswa.find(s => s.nisn === nisn);
  const kasus = useMemo(() => pelanggaran.filter(p => p.nisn === nisn).sort((a, b) => b.tanggal.localeCompare(a.tanggal)), [pelanggaran, nisn]);
  const keteranganAspek = aspekAktif.find(a => a.nama === f.aspek)?.keterangan;

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!sw) { toast('Pilih siswa dulu.', 'error'); return; }
    if (!f.aspek) { toast('Pilih aspek.', 'error'); return; }
    if (!f.catatan.trim()) { toast('Tulis catatan observasinya.', 'error'); return; }
    const ta = tahunAjaran.find(t => dalamRentang(f.tanggal, t.mulai, t.selesai))?.label || tahunAjaranAktif?.label || '';
    setMenyimpan(true);
    try {
      await perkembanganApi.add({
        Tanggal: f.tanggal, NISN: sw.nisn, 'Nama Siswa': sw.nama, Tingkat: sw.kelasTingkat, Rombel: sw.rombel, Aspek: f.aspek,
        Catatan: f.catatan.trim(), Arah: f.arah, 'Tindak Lanjut': f.tindak.trim(), 'No Kasus': f.kasus,
        'Tahun Ajaran': ta, Semester: semesterDariTanggal(f.tanggal), 'Dicatat Oleh': currentUser.nama,
      });
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Catat Perkembangan', modul: 'Catatan Perkembangan', detail: `${sw.nama} · ${f.aspek}${f.arah ? ` · ${f.arah}` : ''}` });
      await refreshPerkembangan();
      toast(`Catatan perkembangan ${sw.nama} tersimpan.`);
      onSelesai({ rombelKey, nisn });
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Catat perkembangan</h3><p>Satu catatan = satu pengamatan. Tulis yang terlihat (bukan penilaian umum), mis. "mulai berani bertanya", "3 hari berturut-turut terlambat".</p></div></div>
      <div className="card-body">
        <div className="filter-bar"><PilihSiswa rombelKey={rombelKey} setRombelKey={setRombelKey} nisn={nisn} setNisn={setNisn} /></div>
        <div className="form-grid">
          <Field label="Tanggal"><input type="date" value={f.tanggal} max={sekarangWIB().tanggal} onChange={e => set('tanggal', e.target.value)} /></Field>
          <div className="field"><label>Aspek</label>
            <Select value={f.aspek} onChange={v => set('aspek', v)} placeholder="— pilih aspek —" options={aspekAktif.map(a => a.nama)} />
            {keteranganAspek && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{keteranganAspek}</div>}
          </div>
          <div className="field span2"><label>Arah perkembangan (opsional)</label>
            <div className="seg-pilih" role="radiogroup">
              {ARAH_OPTIONS.map(a => (
                <button key={a} type="button" role="radio" aria-checked={f.arah === a} className={f.arah === a ? `on ${kelasArah(a)}` : ''} onClick={() => set('arah', f.arah === a ? '' : a)}>{IKON_ARAH[a]} {a}</button>
              ))}
            </div>
          </div>
          <div className="field span2"><label>Catatan observasi</label><textarea rows={4} value={f.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Apa yang terlihat? Kapan, dalam situasi apa?" /></div>
          <div className="field span2"><label>Rencana tindak lanjut (opsional)</label><textarea rows={2} value={f.tindak} onChange={e => set('tindak', e.target.value)} placeholder="mis. koordinasi dengan orang tua, beri tugas tambahan, pantau 2 minggu" /></div>
          {kasus.length > 0 && (
            <div className="field span2"><label>Tindak lanjut kasus pelanggaran (opsional)</label>
              <Select value={f.kasus} onChange={v => set('kasus', v)} placeholder="— tidak terkait kasus —" options={kasus.map(k => ({ value: String(k.no), label: `#${k.no} · ${formatTanggalAngka(k.tanggal)} · ${k.jenis} (${k.statusTL})` }))} />
            </div>
          )}
        </div>
        <div className="save-bar"><span /><button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan catatan'}</button></div>
      </div>
    </div>
  );
}

export default function CatatanPerkembangan() {
  const { perkembangan, aspekSemua, refreshPerkembangan } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('perkembangan', TABS.map(t => t.id));
  const { withKelasVirtual } = useAkademikOptions();
  const warna = useWarnaAspek();
  const [pilihan, setPilihan] = useState(null); // {rombelKey, nisn} dibawa antar tab

  const editFields = useMemo(() => [
    { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'Aspek', label: 'Aspek', type: 'select', options: aspekSemua.map(a => a.nama), required: true },
    { key: 'Arah', label: 'Arah perkembangan', type: 'select', options: ARAH_OPTIONS },
    { key: 'Catatan', label: 'Catatan observasi', type: 'textarea', required: true },
    { key: 'Tindak Lanjut', label: 'Rencana tindak lanjut', type: 'textarea' },
  ], [aspekSemua]);
  const fetchFn = useCallback(async () => (await perkembanganApi.fetch()).map(withKelasVirtual), [withKelasVirtual]);
  const updateFn = useCallback(({ Kelas, ...r }) => perkembanganApi.update({ ...r, Semester: semesterDariTanggal(String(r.Tanggal).slice(0, 10)) }), []); // eslint-disable-line no-unused-vars

  const bulanIni = sekarangWIB().tanggal.slice(0, 7);
  const stat = { bulan: perkembangan.filter(p => p.tanggal.startsWith(bulanIni)).length, perhatian: perkembangan.filter(p => p.tanggal.startsWith(bulanIni) && p.arah === 'Perlu Perhatian').length };

  return (
    <Page pageId="perkembangan" title="Catatan Perkembangan" path="Kesiswaan / Catatan Perkembangan">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'linimasa' && bolehTab('linimasa') && <Linimasa key={pilihan?.nisn || 'x'} awal={pilihan} onCatat={p => { setPilihan(p); setTab('catat'); }} />}
          {tab === 'daftar' && bolehTab('daftar') && (
            <GenericStoredTable title={`Semua catatan — bulan ini ${stat.bulan} catatan, ${stat.perhatian} perlu perhatian`} subtitle="Klik Edit untuk memperbaiki catatan."
              headers={['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Aspek', 'Arah', 'Catatan', 'Tindak Lanjut', 'Dicatat Oleh']} fields={editFields}
              fetchFn={fetchFn} updateFn={updateFn} deleteFn={perkembanganApi.remove}
              moduleLabel="Catatan Perkembangan" labelKey="Nama Siswa" target="akademik" onChanged={refreshPerkembangan}
              columnRenderers={{
                Aspek: r => <span className={`badge ${warna(r.Aspek)}`}>{r.Aspek}</span>,
                Arah: r => (r.Arah ? <span className={`badge ${BADGE_ARAH[r.Arah] || 'badge-muted'}`}>{IKON_ARAH[r.Arah]} {r.Arah}</span> : '—'),
                Catatan: r => <ClipCell value={r.Catatan} maxWidth={300} />,
                'Tindak Lanjut': r => <ClipCell value={r['Tindak Lanjut']} maxWidth={220} />,
              }}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r.Aspek} ${r.Catatan} ${r.Kelas} ${r['Dicatat Oleh']}`.toLowerCase().includes(t)} />
          )}
          {tab === 'catat' && bolehTab('catat') && <FormCatat key={pilihan?.nisn || 'baru'} awal={pilihan} onSelesai={p => { setPilihan(p); if (bolehTab('linimasa')) setTab('linimasa'); }} />}
          {tab === 'aspek' && bolehTab('aspek') && <AspekPerkembanganTab />}
        </div>
      </div>
    </Page>
  );
}
