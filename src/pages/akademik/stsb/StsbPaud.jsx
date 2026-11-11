import { useEffect, useMemo, useState } from 'react';
import Page from '../../../components/layout/Page';
import useTabAccess from '../../../hooks/useTabAccess';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import { TabBar, Field, Select } from '../../../components/akademik/shared';
import { useAuth } from '../../../context/AuthContext';
import { useAppData } from '../../../context/AppContext';
import { formatRaporTingkat } from '../../../config/jenjang';
import { rombelUntukUser, bolehMenerbitkan, bolehLihatSemuaKelas } from '../../../db/akses';
import { dataStsbDariRows } from '../../../db/stsbFields';
import StsbKelas from './StsbKelas';
import PengaturanStsb from './PengaturanStsb';

// v1.68.0: Surat Tanda Serta Belajar (STSB) untuk anak PAUD yang menyelesaikan program.
const TABS = [
  { id: 'daftar', label: 'DAFTAR & CETAK STSB' },
  { id: 'pengaturan', label: 'PENGATURAN STSB' },
];

function DaftarStsb() {
  const { tahunAjaranOptions, taAktif, rombelList: semuaRombel } = useAkademikOptions();
  const { currentUser } = useAuth();
  const { sistemRows } = useAppData();
  const rombelPaud = useMemo(() => semuaRombel.filter(r => formatRaporTingkat(r.tingkat) === 'PAUD'), [semuaRombel]);
  const rombelList = useMemo(() => rombelUntukUser(rombelPaud, currentUser), [rombelPaud, currentUser]);
  const [ta, setTa] = useState('');
  const [rombelKey, setRombelKey] = useState('');
  const [tampilSemua, setTampilSemua] = useState(false);
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelList.some(r => r.key === rombelKey) && rombelList.length) setRombelKey(rombelList[rombelList.length - 1].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  const data = useMemo(() => dataStsbDariRows(sistemRows, ta), [sistemRows, ta]);

  let pesan = '';
  if (!rombelList.length) {
    if (bolehLihatSemuaKelas(currentUser)) pesan = 'Belum ada kelas jenjang PAUD (KB/TK) di Data Kelas.';
    else if (!currentUser?.guru) pesan = 'Akun Anda belum terhubung ke data guru. Minta Admin mengisi "Terhubung ke Guru" di Manajemen User.';
    else pesan = 'Anda belum tercatat sebagai wali kelas PAUD di Data Kelas.';
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Surat Tanda Serta Belajar (STSB)</h3><p>Untuk anak PAUD yang menyelesaikan program. Identitas anak diambil dari Data Siswa, kepala sekolah dari Penandatangan Rapor PAUD. Isi nilai tiap aspek, simpan, lalu cetak.</p></div></div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: `${r.label}${r.wali ? ' — ' + r.wali : ''}` }))} /></Field>
          <label className="stsb-cek" style={{ alignSelf: 'flex-end', marginBottom: 8 }}><input type="checkbox" checked={tampilSemua} onChange={e => setTampilSemua(e.target.checked)} /> Tampilkan juga siswa yang sudah lulus / tidak aktif</label>
        </div>
        {pesan && <div className="banner-info"><span>{pesan}</span></div>}
        {rombel && ta && <StsbKelas key={`${ta}|${rombel.key}|${tampilSemua}`} ta={ta} rombel={rombel} data={data} tampilSemua={tampilSemua} />}
      </div>
    </div>
  );
}

export default function StsbPaud() {
  const { currentUser } = useAuth();
  const akses = useTabAccess('stsb-paud', TABS.map(t => t.id));
  const { tab, setTab } = akses;
  const bolehTab = (id) => akses.bolehTab(id) && (id !== 'pengaturan' || bolehMenerbitkan(currentUser));
  return (
    <Page pageId="stsb-paud" title="STSB PAUD" path="Akademik / STSB PAUD">
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'daftar' && bolehTab('daftar') && <DaftarStsb />}
          {tab === 'pengaturan' && bolehTab('pengaturan') && <PengaturanStsb />}
        </div>
      </div>
    </Page>
  );
}
