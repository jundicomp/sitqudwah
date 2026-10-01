import { useCallback, useMemo } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { buildPelanggaranFields, POIN_DEFAULT_KATEGORI, AMBANG_POIN_TINGGI, labelRombel } from '../../db/akademikFields';
import { todayWIB } from '../../db/helpers';
import { fetchPelanggaranFromSheet, addPelanggaranToSheet, updatePelanggaranInSheet, deletePelanggaranFromSheet } from '../../services/googleSheets';

const TABS = [
  { id: 'tabel', label: 'DAFTAR PELANGGARAN' },
  { id: 'manual', label: 'CATAT PELANGGARAN' },
];
const TABEL_HEADERS = ['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Kategori', 'Jenis Pelanggaran', 'Poin', 'Penanganan', 'Status Tindak Lanjut', 'Guru BK'];
const BADGE_KATEGORI = { Ringan: 'badge-gold', Sedang: 'badge-purple', Berat: 'badge-red' };
const BADGE_STATUS = { 'Belum Ditangani': 'badge-red', Proses: 'badge-gold', Selesai: 'badge-green' };

// Poin kosong -> pakai poin standar kategori.
function lengkapiPoin(row) {
  const { Kelas, ...rest } = row; // eslint-disable-line no-unused-vars
  const poin = String(rest.Poin ?? '').trim();
  return { ...rest, Poin: poin === '' ? (POIN_DEFAULT_KATEGORI[rest.Kategori] ?? 0) : Number(poin) };
}

export default function Pelanggaran() {
  const { pelanggaran, perkembangan, refreshPelanggaran } = useAppData();
  const tindakLanjutPerKasus = useMemo(() => perkembangan.reduce((m, x) => { if (x.noKasus) m[x.noKasus] = (m[x.noKasus] || 0) + 1; return m; }, {}), [perkembangan]);
  const { tab, setTab, bolehTab } = useTabAccess('pelanggaran', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, siswaOptions, guruOptions, withKelasVirtual, fromSiswaVirtual } = useAkademikOptions();

  const addFields = useMemo(() => buildPelanggaranFields({ siswaOptions, tahunAjaranOptions, guruOptions }), [siswaOptions, tahunAjaranOptions, guruOptions]);
  const editFields = useMemo(() => buildPelanggaranFields({ tahunAjaranOptions, guruOptions, withSiswa: false }), [tahunAjaranOptions, guruOptions]);
  const emptyRow = useCallback(() => ({
    Siswa: '', Tanggal: todayWIB(), 'Tahun Ajaran': taAktif, Kategori: '', 'Jenis Pelanggaran': '', Poin: '',
    Penanganan: '', 'Status Tindak Lanjut': 'Belum Ditangani', 'Guru BK': '', 'Catatan Konseling': '',
  }), [taAktif]);

  const fetchFn = useCallback(async () => (await fetchPelanggaranFromSheet()).map(withKelasVirtual), [withKelasVirtual]);
  const addFn = useCallback(async (form) => { await addPelanggaranToSheet(lengkapiPoin(fromSiswaVirtual(form))); await refreshPelanggaran(); }, [fromSiswaVirtual, refreshPelanggaran]);
  const updateFn = useCallback((row) => updatePelanggaranInSheet(lengkapiPoin(row)), []);

  const { stat, perluPerhatian } = useMemo(() => {
    const taIni = pelanggaran.filter(p => p.tahunAjaran === taAktif);
    const poinPerSiswa = {};
    taIni.forEach(p => {
      const k = p.nisn || p.nama;
      poinPerSiswa[k] ||= { nama: p.nama, kelas: labelRombel(p.tingkat, p.rombel), poin: 0, kasus: 0 };
      poinPerSiswa[k].poin += p.poin; poinPerSiswa[k].kasus++;
    });
    return {
      stat: {
        taIni: taIni.length,
        belum: pelanggaran.filter(p => p.statusTL !== 'Selesai').length,
        berat: taIni.filter(p => p.kategori === 'Berat').length,
      },
      perluPerhatian: Object.values(poinPerSiswa).filter(x => x.poin >= AMBANG_POIN_TINGGI).sort((a, b) => b.poin - a.poin),
    };
  }, [pelanggaran, taAktif]);

  return (
    <Page pageId="pelanggaran" title="Pelanggaran & Konseling" path="Kesiswaan / Pelanggaran & Konseling">
      <AkademikBelumTersambung />
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={stat.taIni} label={`Kasus ${taAktif || 'tahun ini'}`} color="c-blue" />
        <InfoCard value={stat.belum} label="Belum selesai ditangani" color="c-gold" />
        <InfoCard value={stat.berat} label="Kategori berat" color="c-red" />
        <InfoCard value={perluPerhatian.length} label={`Siswa ≥ ${AMBANG_POIN_TINGGI} poin`} color="c-purple" />
      </div>

      {perluPerhatian.length > 0 && (
        <div className="card">
          <div className="card-head"><div><h3>Perlu pembinaan khusus</h3><p>Siswa dengan akumulasi poin {AMBANG_POIN_TINGGI} atau lebih pada {taAktif}.</p></div></div>
          <div className="card-body table-scroll">
            <table>
              <thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Jumlah Kasus</th><th>Total Poin</th></tr></thead>
              <tbody>
                {perluPerhatian.map(x => (
                  <tr key={x.nama + x.kelas}><td><b>{x.nama}</b></td><td>{x.kelas}</td><td>{x.kasus}</td><td><span className="badge badge-red">{x.poin} poin</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Catatan pelanggaran & konseling"
              subtitle="Ubah status tindak lanjut lewat tombol edit setelah siswa dibina."
              headers={TABEL_HEADERS}
              fields={editFields}
              fetchFn={fetchFn}
              updateFn={updateFn}
              deleteFn={deletePelanggaranFromSheet}
              moduleLabel="Pelanggaran & Konseling"
              labelKey="Jenis Pelanggaran"
              target="akademik"
              columnRenderers={{
                Kategori: r => <span className={`badge ${BADGE_KATEGORI[r.Kategori] || 'badge-muted'}`}>{r.Kategori}</span>,
                'Status Tindak Lanjut': r => (
                  <>
                    <span className={`badge ${BADGE_STATUS[r['Status Tindak Lanjut']] || 'badge-muted'}`}>{r['Status Tindak Lanjut']}</span>
                    {tindakLanjutPerKasus[String(r.No)] > 0 && <span className="badge badge-blue" style={{ marginLeft: 4 }} title="Jumlah catatan perkembangan yang menindaklanjuti kasus ini">📝 {tindakLanjutPerKasus[String(r.No)]}</span>}
                  </>
                ),
              }}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r['Jenis Pelanggaran']} ${r.Kelas} ${r['Status Tindak Lanjut']}`.toLowerCase().includes(t)}
              onChanged={refreshPelanggaran}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={addFields}
              emptyRow={emptyRow}
              addFn={addFn}
              target="akademik"
              title="Catat pelanggaran"
              subtitle="Poin dikosongkan = otomatis sesuai kategori (Ringan 5, Sedang 10, Berat 25)."
            />
          )}
        </div>
      </div>
    </Page>
  );
}
