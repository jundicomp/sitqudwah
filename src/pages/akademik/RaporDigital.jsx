import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { useAuth } from '../../context/AuthContext';
import { SEMESTER_OPTIONS, semesterDariTanggal } from '../../db/akademikFields';
import { formatRaporTingkat } from '../../config/jenjang';
import { rombelUntukUser, bolehMenerbitkan, bolehLihatSemuaKelas } from '../../db/akses';
import RaporPaudKelas from './raporPaud/RaporPaudKelas';
import ArsipRaporPaud from './raporPaud/ArsipRaporPaud';
import PengaturanRaporPaud from './raporPaud/PengaturanRaporPaud';
import RaporSdKelas from './raporSd/RaporSdKelas';
import PengaturanRaporSd from './raporSd/PengaturanRaporSd';

const TABS = [
  { id: 'kelas', label: 'RAPOR PER KELAS' },
  { id: 'arsip', label: 'ARSIP RAPOR' },
  { id: 'pengaturan-sd', label: 'PENGATURAN SD' },
  { id: 'pengaturan-paud', label: 'PENGATURAN PAUD' },
];

function RaporPerKelas() {
  const { tahunAjaranOptions, taAktif, rombelList: semuaRombel } = useAkademikOptions();
  const { currentUser } = useAuth();
  // Wali kelas hanya melihat kelas yg dia pegang; Admin & Kepala Sekolah semua kelas.
  const rombelList = useMemo(() => rombelUntukUser(semuaRombel, currentUser), [semuaRombel, currentUser]);
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  const formatPaud = rombel ? formatRaporTingkat(rombel.tingkat) === 'PAUD' : false;

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rapor per kelas</h3><p>{formatPaud
          ? 'Format PAUD: capaian & foto diambil dari Penilaian PAUD, wali kelas melengkapi narasi tiap elemen lalu mengajukan/menerbitkan.'
          : 'Format SD: nilai diambil otomatis dari Nilai Akademik. Wali kelas melengkapi sikap, deskripsi tiap mapel, catatan & presensi, lalu mengajukan/menerbitkan.'}</p></div>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: `${r.label}${r.wali ? ' — ' + r.wali : ''}` }))} /></Field>
        </div>
        {!rombelList.length && (
          <div className="banner-info"><span>{bolehLihatSemuaKelas(currentUser) ? 'Belum ada data kelas.' : currentUser?.guru
            ? `Akun Anda terhubung ke ${currentUser.guru}, tapi belum tercatat sebagai wali kelas mana pun di Data Kelas.`
            : 'Akun Anda belum terhubung ke data guru. Minta Admin mengisi "Terhubung ke Guru" di Manajemen User, lalu login ulang.'}</span></div>
        )}
        {rombel && formatPaud && <RaporPaudKelas key={rombel.key + ta + semester} ta={ta} semester={semester} rombel={rombel} />}
        {rombel && !formatPaud && <RaporSdKelas key={rombel.key + ta + semester} ta={ta} semester={semester} rombel={rombel} />}
      </div>
    </div>
  );
}

export default function RaporDigital() {
  const { currentUser } = useAuth();
  const akses = useTabAccess('rapor', TABS.map(t => t.id));
  const { tab, setTab } = akses;
  // Tab pengaturan hanya utk Kepala Sekolah & Admin (selain izin tab di Hak Akses).
  const bolehTab = (id) => akses.bolehTab(id) && (!id.startsWith('pengaturan') || bolehMenerbitkan(currentUser));
  return (
    <Page pageId="rapor" title="Rapor Digital" path="Akademik / Rapor Digital">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kelas' && bolehTab('kelas') && <RaporPerKelas />}
          {tab === 'arsip' && bolehTab('arsip') && <ArsipRaporPaud />}
          {tab === 'pengaturan-sd' && bolehTab('pengaturan-sd') && <PengaturanRaporSd />}
          {tab === 'pengaturan-paud' && bolehTab('pengaturan-paud') && <PengaturanRaporPaud />}
        </div>
      </div>
    </Page>
  );
}
