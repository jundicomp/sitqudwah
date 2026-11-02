import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
import PenandatanganTab from './raporPaud/PenandatanganTab';

// v1.49.0: Rapor Digital dipecah jadi 2 menu (PAUD & SD) supaya hak aksesnya bisa
// diatur terpisah, mis. role "Guru TK" hanya Rapor PAUD, role "Guru SD" hanya Rapor SD.
const INFO = {
  PAUD: {
    pageId: 'rapor-paud', judul: 'Rapor Digital PAUD', jenjang: 'KB/TK',
    sub: 'Format PAUD: capaian & foto diambil dari Penilaian PAUD, wali kelas melengkapi narasi tiap elemen lalu mengajukan/menerbitkan.',
  },
  SD: {
    pageId: 'rapor-sd', judul: 'Rapor Digital SD', jenjang: 'SD',
    sub: 'Format SD: nilai diambil otomatis dari Nilai Akademik. Wali kelas melengkapi sikap, deskripsi tiap mapel, catatan & presensi, lalu mengajukan/menerbitkan.',
  },
};
const TABS = (jenis) => [
  { id: 'kelas', label: 'RAPOR PER KELAS' },
  { id: 'arsip', label: `ARSIP RAPOR ${jenis}` },
  { id: 'pengaturan', label: `PENGATURAN RAPOR ${jenis}` },
  { id: 'penandatangan', label: 'PENANDATANGAN' },
];
const cocokJenis = (tingkat, jenis) => (formatRaporTingkat(tingkat) === 'PAUD') === (jenis === 'PAUD');

function RaporPerKelas({ jenis }) {
  const { tahunAjaranOptions, taAktif, rombelList: semuaRombel } = useAkademikOptions();
  const { currentUser } = useAuth();
  // Hanya rombel jenjang yg sesuai menu; wali kelas hanya kelas yg dia pegang.
  const rombelJenis = useMemo(() => semuaRombel.filter(r => cocokJenis(r.tingkat, jenis)), [semuaRombel, jenis]);
  const rombelList = useMemo(() => rombelUntukUser(rombelJenis, currentUser), [rombelJenis, currentUser]);
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelList.some(r => r.key === rombelKey) && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  const info = INFO[jenis];

  let pesanKosong = '';
  if (!rombelList.length) {
    if (bolehLihatSemuaKelas(currentUser)) pesanKosong = `Belum ada kelas jenjang ${info.jenjang} di Data Kelas.`;
    else if (!currentUser?.guru) pesanKosong = 'Akun Anda belum terhubung ke data guru. Minta Admin mengisi "Terhubung ke Guru" di Manajemen User, lalu login ulang.';
    else if (semuaRombel.some(r => r.wali === currentUser.guru)) pesanKosong = `Kelas yang Anda pegang bukan jenjang ${info.jenjang}. Buka menu ${jenis === 'PAUD' ? 'Rapor Digital SD' : 'Rapor Digital PAUD'}.`;
    else pesanKosong = `Akun Anda terhubung ke ${currentUser.guru}, tapi belum tercatat sebagai wali kelas ${info.jenjang} mana pun di Data Kelas.`;
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Rapor per kelas</h3><p>{info.sub}</p></div></div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: `${r.label}${r.wali ? ' — ' + r.wali : ''}` }))} /></Field>
        </div>
        {pesanKosong && <div className="banner-info"><span>{pesanKosong}</span></div>}
        {rombel && jenis === 'PAUD' && <RaporPaudKelas key={rombel.key + ta + semester} ta={ta} semester={semester} rombel={rombel} />}
        {rombel && jenis === 'SD' && <RaporSdKelas key={rombel.key + ta + semester} ta={ta} semester={semester} rombel={rombel} />}
      </div>
    </div>
  );
}

export default function RaporDigital({ jenis }) {
  const info = INFO[jenis];
  const tabs = TABS(jenis);
  const { currentUser } = useAuth();
  const akses = useTabAccess(info.pageId, tabs.map(t => t.id));
  const { tab, setTab } = akses;
  // Tab pengaturan hanya utk Kepala Sekolah & Admin (selain izin tab di Hak Akses).
  const bolehTab = (id) => akses.bolehTab(id) && (!['pengaturan', 'penandatangan'].includes(id) || bolehMenerbitkan(currentUser));
  return (
    <Page pageId={info.pageId} title={info.judul} path={`Akademik / ${info.judul}`}>
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={tabs} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kelas' && bolehTab('kelas') && <RaporPerKelas jenis={jenis} />}
          {tab === 'arsip' && bolehTab('arsip') && <ArsipRaporPaud jenis={jenis} />}
          {tab === 'pengaturan' && bolehTab('pengaturan') && (jenis === 'PAUD' ? <PengaturanRaporPaud /> : <PengaturanRaporSd />)}
          {tab === 'penandatangan' && bolehTab('penandatangan') && <PenandatanganTab key={jenis} jenis={jenis} />}
        </div>
      </div>
    </Page>
  );
}

// Tautan lama #/rapor -> arahkan ke menu rapor yg boleh dibuka user.
export function RaporLamaRedirect() {
  const { canAccess } = useAuth();
  return <Navigate to={canAccess('rapor-sd') || !canAccess('rapor-paud') ? '/rapor-sd' : '/rapor-paud'} replace />;
}
