import { useEffect, useMemo, useState } from 'react';
import Page from '../../../components/layout/Page';
import useTabAccess from '../../../hooks/useTabAccess';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import DataTable from '../../../components/common/DataTable';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas } from '../../../db/akses';
import { namaTingkat } from '../../../config/jenjang';
import { SEMESTER_OPTIONS, semesterDariTanggal } from '../../../db/akademikFields';
import { tpUntuk, buatIdTp, kodeTp, faseDariTingkat, barisSheetTp } from '../../../db/kurikulumFields';
import { pasanganMengajar, isiModulAwal, BADGE_STATUS_MODUL, jpTotal, barisDuplikatModul } from '../../../db/modulAjarFields';
import { simpanTpKeSheet, upsertModulAjarToSheet, hapusModulAjarDiSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';
import ModulEditor from './ModulEditor';
import PengaturanFormatModul from './PengaturanFormatModul';
import GaleriModul from './GaleriModul';
import RencanaPaudTab from './RencanaPaudTab';
import PersetujuanTab from './PersetujuanTab';
import { bolehMenerbitkan } from '../../../db/akses';

const TABS = [
  { id: 'saya', label: 'KELAS & MAPEL SAYA' },
  { id: 'modul', label: 'SUSUN MODUL' },
  { id: 'galeri', label: 'GALERI MODUL' },
  { id: 'paud', label: 'RENCANA TEMA PAUD' },
  { id: 'persetujuan', label: 'PERSETUJUAN' },
  { id: 'format', label: 'FORMAT MODUL' },
];

function modulBaru({ ta, semester, pasangan, guru }) {
  return {
    idModul: '', no: null, tahunAjaran: ta, semester, mapel: pasangan?.mapel || '', tingkat: pasangan?.tingkat || '',
    rombel: pasangan ? pasangan.rombel.join(', ') : '', guru: guru || '', judul: '', tp: [], isi: isiModulAwal(),
    status: 'Draft', catatan: '',
  };
}

// ---------------------------------------------------------------- Kelas & Mapel Saya
function KelasMapelSaya({ ta, semester, pasanganList, modulDipakai, onBuat, onBuka }) {
  const { tp, refreshTp, toast } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const [aktif, setAktif] = useState(null);
  const [teksTp, setTeksTp] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { if (aktif && !pasanganList.some(p => p.kunci === aktif)) setAktif(null); }, [pasanganList, aktif]);

  const kartu = pasanganList.map(p => {
    const daftarTp = tpUntuk(tp, p.mapel, p.tingkat, semester);
    const modul = modulDipakai.filter(x => x.mapel === p.mapel && x.tingkat === p.tingkat);
    const tpTercakup = new Set(modul.flatMap(x => x.tp));
    return { ...p, daftarTp, modul, tercakup: daftarTp.filter(t => tpTercakup.has(t.idTp)).length };
  });
  const dipilih = kartu.find(k => k.kunci === aktif);
  const bolehTambahTp = (p) => semua || p.guru.includes(currentUser?.guru);

  async function tambahTp() {
    const baris = teksTp.split('\n').map(x => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
    if (!baris.length || !dipilih) return;
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      const ada = new Set(tp.map(x => x.idTp).filter(Boolean));
      const urutMaks = tp.filter(x => x.mapel === dipilih.mapel && x.tingkat === dipilih.tingkat && x.semester === semester).reduce((a, x) => Math.max(a, x.urutan), 0);
      const sekarang = new Date().toISOString();
      const tambahan = baris.map((tujuan, i) => ({
        idTp: buatIdTp(ada), mapel: dipilih.mapel, fase: faseDariTingkat(dipilih.tingkat), tingkat: dipilih.tingkat, semester,
        urutan: urutMaks + i + 1, kode: kodeTp(dipilih.tingkat, semester, urutMaks + i + 1), elemen: '', tujuan, jp: '', aktif: true,
        diubahOleh: currentUser.nama, diubahPada: sekarang,
      }));
      await simpanTpKeSheet(barisSheetTp([...tp.map(x => ({ ...x, idTp: x.idTp || buatIdTp(ada) })), ...tambahan]));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Tambah Tujuan Pembelajaran', modul: 'Modul Ajar', detail: `${dipilih.mapel} ${namaTingkat(dipilih.tingkat)} ${semester}: ${tambahan.length} TP` });
      setTeksTp('');
      await refreshTp();
      toast(`${tambahan.length} tujuan pembelajaran ditambahkan.`);
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui. Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  if (!pasanganList.length) {
    return (
      <div className="banner-info"><span>{semua
        ? `Belum ada jadwal pelajaran untuk ${ta} semester ${semester}. Isi Jadwal Pelajaran dulu supaya kelas & mapel tiap guru muncul di sini.`
        : !currentUser?.guru
          ? 'Akun Anda belum terhubung ke data guru. Minta Admin mengisi "Terhubung ke Guru" di Manajemen User, lalu login ulang.'
          : `Belum ada mapel yang tercatat diajar ${currentUser.guru} di Jadwal Pelajaran ${ta} semester ${semester}.`}</span></div>
    );
  }

  return (
    <div>
      <div className="ma-kartu-grid">
        {kartu.map(k => {
          const persen = k.daftarTp.length ? Math.round((k.tercakup / k.daftarTp.length) * 100) : 0;
          return (
            <button key={k.kunci} type="button" className={`ma-kartu ${aktif === k.kunci ? 'on' : ''}`} onClick={() => setAktif(a => (a === k.kunci ? null : k.kunci))}>
              <div className="ma-kartu-h"><b>{k.mapel}</b><span>{namaTingkat(k.tingkat)}</span></div>
              <div className="ma-kartu-sub">{k.rombel.length ? `Rombel ${k.rombel.join(', ')}` : '—'}{semua && k.guru.length ? ` · ${k.guru.join(', ')}` : ''}</div>
              <div className="ma-bar"><i style={{ width: `${persen}%` }} /></div>
              <div className="ma-kartu-f">
                <span>{k.daftarTp.length ? `${k.tercakup} dari ${k.daftarTp.length} TP sudah punya modul` : 'Belum ada TP'}</span>
                <span className="badge badge-muted">{k.modul.length} modul</span>
              </div>
            </button>
          );
        })}
      </div>

      {dipilih && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <div><h3>{dipilih.mapel} · {namaTingkat(dipilih.tingkat)} · Semester {semester}</h3><p>Alur tujuan pembelajaran semester ini dan modul yang mencakupnya.</p></div>
            <button className="btn btn-primary btn-sm" onClick={() => onBuat(dipilih, [])}>+ Modul baru</button>
          </div>
          <div className="card-body">
            {!dipilih.daftarTp.length && <p className="paud-kosong" style={{ marginTop: 0 }}>Belum ada tujuan pembelajaran untuk mapel &amp; kelas ini di semester {semester}.</p>}
            <ol className="ma-atp">
              {dipilih.daftarTp.map(t => {
                const modul = dipilih.modul.filter(x => x.tp.includes(t.idTp));
                return (
                  <li key={t.idTp} className={modul.length ? 'ada' : ''}>
                    <code>{t.kode}</code>
                    <div className="ma-atp-isi">
                      <div>{t.tujuan}{t.elemen && <small> · {t.elemen}</small>}{t.jp ? <small> · {t.jp} JP</small> : null}</div>
                      <div className="ma-atp-modul">
                        {modul.map(x => <button key={x.id} type="button" className="ma-chip" onClick={() => onBuka(x)}><span className={`badge ${BADGE_STATUS_MODUL[x.status]}`}>{x.status}</span>{x.judul}</button>)}
                        {!modul.length && <button type="button" className="btn btn-sm" onClick={() => onBuat(dipilih, [t.idTp])}>+ Buat modul untuk TP ini</button>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {bolehTambahTp(dipilih) && (
              <div className="ma-tambah-tp">
                <label>Tambah tujuan pembelajaran (satu per baris)</label>
                <textarea rows={3} value={teksTp} onChange={e => setTeksTp(e.target.value)} placeholder="Peserta didik dapat …" />
                <button type="button" className="btn btn-sm" disabled={menyimpan || !teksTp.trim()} onClick={tambahTp}>{menyimpan ? 'Menyimpan…' : 'Tambahkan TP'}</button>
                <small>Urutan, elemen &amp; JP bisa dirapikan di Kurikulum &amp; KKM › Capaian &amp; Tujuan Pembelajaran.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Daftar modul (Susun Modul)
function DaftarModul({ modulDipakai, onBuat, onBuka }) {
  const { tp, refreshModulAjar, toast } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const [status, setStatus] = useState('');
  const [mapel, setMapel] = useState('');
  const kodeTpDari = (ids) => ids.map(id => tp.find(t => t.idTp === id)?.kode).filter(Boolean).join(', ');
  const milik = (x) => semua || (x.guru && x.guru === currentUser?.guru);
  const rows = modulDipakai.filter(x => (!status || x.status === status) && (!mapel || x.mapel === mapel));

  async function duplikat(x) {
    try {
      await upsertModulAjarToSheet([barisDuplikatModul(x, semua ? x.guru : currentUser.guru, currentUser.nama)]);
      await refreshModulAjar();
      toast('Modul diduplikat sebagai draft baru.');
    } catch (e) { toast(e.message, 'error'); }
  }
  async function hapus(x) {
    if (!window.confirm(`Hapus modul "${x.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await hapusModulAjarDiSheet(x.no);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Hapus Modul Ajar', modul: 'Modul Ajar', detail: x.judul });
      await refreshModulAjar();
      toast('Modul dihapus.');
    } catch (e) { toast(e.message, 'error'); }
  }

  const columns = [
    { key: 'judul', label: 'Materi pokok', sortable: true, render: r => <><b>{r.judul || 'Tanpa judul'}</b>{r.isi.bab ? <span style={{ fontSize: 12, color: 'var(--muted)' }}> · Bab {r.isi.bab}</span> : null}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{kodeTpDari(r.tp) || 'belum ada TP'}</div></> },
    { key: 'mapel', label: 'Mapel', sortable: true },
    { key: 'tingkat', label: 'Kelas', sortable: true, render: r => <>{namaTingkat(r.tingkat)}{r.rombel ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.rombel}</div> : null}</> },
    ...(semua ? [{ key: 'guru', label: 'Penyusun', sortable: true }] : []),
    { key: 'jp', label: 'JP', accessor: r => jpTotal(r.isi), render: r => jpTotal(r.isi) || '—' },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_MODUL[r.status]}`}>{r.status}</span> },
    { key: 'aksi', label: '', render: r => (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={() => onBuka(r)}>{milik(r) && ['Draft', 'Dikembalikan'].includes(r.status) ? 'Ubah' : 'Lihat'}</button>
        {(semua || currentUser?.guru) && <button className="btn btn-sm" onClick={() => duplikat(r)} title="Salin jadi draft baru (mis. untuk tahun depan)">Duplikat</button>}
        {milik(r) && r.status !== 'Disetujui' && <button className="btn btn-sm" onClick={() => hapus(r)}>Hapus</button>}
      </div>
    ) },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Modul ajar</h3><p>{semua ? 'Semua modul ajar guru pada tahun ajaran & semester ini.' : 'Modul ajar yang Anda susun pada tahun ajaran & semester ini.'}</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => onBuat(null, [])}>+ Modul baru</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Mata pelajaran"><Select value={mapel} onChange={setMapel} options={[...new Set(modulDipakai.map(x => x.mapel))]} placeholder="Semua" /></Field>
          <Field label="Status"><Select value={status} onChange={setStatus} options={['Draft', 'Diajukan', 'Dikembalikan', 'Disetujui']} placeholder="Semua" /></Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="mapel" pageSize={25}
          searchFn={(r, t) => `${r.judul} ${r.mapel} ${r.guru}`.toLowerCase().includes(t)} emptyMessage="Belum ada modul ajar. Klik + Modul baru, atau mulai dari tab Kelas & Mapel Saya." />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Halaman
export default function ModulAjar() {
  const { jadwal, modulAjar, pengaturanModul } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const { tahunAjaranOptions, taAktif } = useAkademikOptions();
  const akses = useTabAccess('modul-ajar', TABS.map(t => t.id));
  const { tab, setTab } = akses;
  // Format Modul hanya utk Kepala Sekolah & Admin (selain izin tab di Hak Akses).
  const bolehTab = (id) => akses.bolehTab(id) && (!['format', 'persetujuan'].includes(id) || bolehMenerbitkan(currentUser));
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [editor, setEditor] = useState(null);
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);

  const pasanganList = useMemo(() => pasanganMengajar(jadwal, { guru: semua ? '' : (currentUser?.guru || '__tidak_ada__'), ta, semester })
    .sort((a, b) => a.tingkat.localeCompare(b.tingkat, 'id', { numeric: true }) || a.mapel.localeCompare(b.mapel)), [jadwal, semua, currentUser, ta, semester]);
  // Modul yg terlihat: admin/kepsek semua; guru miliknya sendiri.
  const modulDipakai = useMemo(() => modulAjar.filter(x => x.tahunAjaran === ta && x.semester === semester && (semua || (x.guru && x.guru === currentUser?.guru))), [modulAjar, ta, semester, semua, currentUser]);

  const buat = (pasangan, tpAwal) => {
    const m = modulBaru({ ta, semester, pasangan, guru: semua ? (pasangan?.guru[0] || '') : currentUser?.guru });
    m.tp = tpAwal;
    // Modul baru memakai format & acuan dimensi sekolah saat ini (disalin ke dalam modul).
    m.isi = { ...m.isi, format: JSON.parse(JSON.stringify(pengaturanModul.format)), setDimensi: pengaturanModul.setDimensi };
    setEditor(m);
  };

  return (
    <Page pageId="modul-ajar" title="Modul Ajar" path="Akademik / Modul Ajar">
      <AkademikBelumTersambung />
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body">
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
            <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></Field>
            <div style={{ alignSelf: 'center', fontSize: 13, color: 'var(--muted)' }}>
              {semua ? 'Anda melihat semua guru.' : currentUser?.guru ? `Masuk sebagai ${currentUser.guru}.` : ''}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'saya' && bolehTab('saya') && <KelasMapelSaya ta={ta} semester={semester} pasanganList={pasanganList} modulDipakai={modulDipakai} onBuat={buat} onBuka={setEditor} />}
          {tab === 'modul' && bolehTab('modul') && <DaftarModul modulDipakai={modulDipakai} onBuat={buat} onBuka={setEditor} />}
          {tab === 'galeri' && bolehTab('galeri') && <GaleriModul onBuka={setEditor} onLihat={(m) => setEditor({ ...m, __pratinjau: true })} />}
          {tab === 'paud' && bolehTab('paud') && <RencanaPaudTab ta={ta} semester={semester} />}
          {tab === 'persetujuan' && bolehTab('persetujuan') && <PersetujuanTab onPeriksaModul={(m) => setEditor({ ...m, __pratinjau: true, __periksa: true })} />}
          {tab === 'format' && bolehTab('format') && <PengaturanFormatModul />}
        </div>
      </div>
      {editor && <ModulEditor key={(editor.idModul || 'baru') + (editor.__pratinjau ? 'p' : '')} modul={editor} mulaiPratinjau={!!editor.__pratinjau} pasanganList={pasanganList} onClose={() => setEditor(null)} onSelesaiPeriksa={editor.__periksa ? () => setEditor(null) : undefined} />}
    </Page>
  );
}
