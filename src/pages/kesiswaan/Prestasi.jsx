import { useCallback, useMemo } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { buildPrestasiFields } from '../../db/akademikFields';
import { todayWIB } from '../../db/helpers';
import { fetchPrestasiFromSheet, addPrestasiToSheet, updatePrestasiInSheet, deletePrestasiFromSheet } from '../../services/googleSheets';

const TABS = [
  { id: 'tabel', label: 'DAFTAR PRESTASI' },
  { id: 'manual', label: 'CATAT PRESTASI' },
];
const TABEL_HEADERS = ['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Jenis Prestasi', 'Nama Kegiatan', 'Tingkat Lomba', 'Hasil', 'Penyelenggara', 'Tahun Ajaran'];
const LUAR_SEKOLAH = ['Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Nasional', 'Internasional'];

const buangKelas = ({ Kelas, ...rest }) => rest; // eslint-disable-line no-unused-vars

export default function Prestasi() {
  const { prestasi, refreshPrestasi } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('prestasi', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, siswaOptions, withKelasVirtual, fromSiswaVirtual } = useAkademikOptions();

  const addFields = useMemo(() => buildPrestasiFields({ siswaOptions, tahunAjaranOptions }), [siswaOptions, tahunAjaranOptions]);
  const editFields = useMemo(() => buildPrestasiFields({ tahunAjaranOptions, withSiswa: false }), [tahunAjaranOptions]);
  const emptyRow = useCallback(() => ({
    Siswa: '', Tanggal: todayWIB(), 'Tahun Ajaran': taAktif, 'Jenis Prestasi': '', 'Nama Kegiatan': '',
    'Tingkat Lomba': '', Hasil: '', Penyelenggara: '', 'No Sertifikat': '', Keterangan: '',
  }), [taAktif]);

  const fetchFn = useCallback(async () => (await fetchPrestasiFromSheet()).map(withKelasVirtual), [withKelasVirtual]);
  const addFn = useCallback(async (form) => { await addPrestasiToSheet(fromSiswaVirtual(form)); await refreshPrestasi(); }, [fromSiswaVirtual, refreshPrestasi]);
  const updateFn = useCallback((row) => updatePrestasiInSheet(buangKelas(row)), []);

  const stat = useMemo(() => {
    const taIni = prestasi.filter(p => p.tahunAjaran === taAktif);
    return {
      total: prestasi.length,
      taIni: taIni.length,
      luar: taIni.filter(p => LUAR_SEKOLAH.includes(p.tingkatLomba)).length,
      juara1: taIni.filter(p => p.hasil === 'Juara 1').length,
    };
  }, [prestasi, taAktif]);

  return (
    <Page pageId="prestasi" title="Prestasi & Penghargaan" path="Kesiswaan / Prestasi & Penghargaan">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.taIni} label={`Prestasi ${taAktif || 'tahun ini'}`} color="c-green" />
        <InfoCard value={stat.luar} label="Tingkat kecamatan ke atas" color="c-blue" />
        <InfoCard value={stat.juara1} label="Juara 1" color="c-gold" />
        <InfoCard value={stat.total} label="Total sepanjang waktu" color="c-purple" />
      </div>
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Daftar prestasi siswa"
              subtitle="Kelas yang tercatat adalah kelas siswa saat prestasi diraih."
              headers={TABEL_HEADERS}
              fields={editFields}
              fetchFn={fetchFn}
              updateFn={updateFn}
              deleteFn={deletePrestasiFromSheet}
              moduleLabel="Prestasi"
              labelKey="Nama Kegiatan"
              target="akademik"
              columnRenderers={{ Hasil: r => <span className={`badge ${String(r.Hasil).startsWith('Juara') ? 'badge-gold' : 'badge-muted'}`}>{r.Hasil}</span> }}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r['Nama Kegiatan']} ${r.Kelas} ${r['Jenis Prestasi']}`.toLowerCase().includes(t)}
              onChanged={refreshPrestasi}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={addFields}
              emptyRow={emptyRow}
              addFn={addFn}
              target="akademik"
              title="Catat prestasi"
              subtitle="Pilih siswa aktif; NISN dan kelasnya tersimpan otomatis."
            />
          )}
        </div>
      </div>
    </Page>
  );
}
