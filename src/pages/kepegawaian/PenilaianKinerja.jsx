import { useCallback, useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import InfoCard from '../../components/common/InfoCard';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { semesterDariTanggal } from '../../db/akademikFields';
import { ASPEK_KINERJA, KINERJA_HEADERS, buildKinerjaFields, lengkapiKinerja, predikatKinerja, badgeKinerja, pegawaiAktif } from '../../db/kepegawaianFields';
import { todayWIB, formatTanggalAngka } from '../../db/helpers';
import { fetchKinerjaFromSheet, addKinerjaToSheet, updateKinerjaInSheet, deleteKinerjaFromSheet } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'rekap', label: 'REKAP KINERJA' },
  { id: 'tabel', label: 'DATA PENILAIAN' },
  { id: 'manual', label: 'INPUT PENILAIAN' },
];
const rata1 = (a) => a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null;

function RekapKinerja() {
  const { kinerja, guru } = useAppData();
  const { tahunAjaranOptions, taAktif } = useAkademikOptions();
  const [ta, setTa] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  const periode = useMemo(() => kinerja.filter(k => k.tahunAjaran === ta && k.total !== null), [kinerja, ta]);

  const rows = useMemo(() => pegawaiAktif(guru).filter(g => (g.kategori || 'Guru') === 'Guru').map(g => {
    const milik = periode.filter(k => k.guru === g.nama).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const terakhir = milik[0];
    return { nama: g.nama, jumlah: milik.length, terakhir, perAspek: Object.fromEntries(ASPEK_KINERJA.map(a => [a, rata1(milik.map(k => k.skor[a]).filter(v => v !== null))])) };
  }), [guru, periode]);

  const dinilai = rows.filter(r => r.terakhir);
  const rataSekolah = rata1(dinilai.map(r => r.terakhir.total));
  const pembinaan = dinilai.filter(r => r.terakhir.predikat === 'Perlu Pembinaan').length;
  const aspekTerlemah = useMemo(() => {
    const avg = ASPEK_KINERJA.map(a => [a, rata1(periode.map(k => k.skor[a]).filter(v => v !== null))]).filter(x => x[1] !== null).sort((a, b) => a[1] - b[1]);
    return avg[0] || null;
  }, [periode]);

  function exportData() {
    exportToExcel(['Guru', 'Jumlah Penilaian', 'Tanggal Terakhir', ...ASPEK_KINERJA, 'Skor Terakhir', 'Predikat'], rows.map(r => ({
      Guru: r.nama, 'Jumlah Penilaian': r.jumlah, 'Tanggal Terakhir': r.terakhir?.tanggal || '', ...Object.fromEntries(ASPEK_KINERJA.map(a => [a, r.perAspek[a] ?? ''])),
      'Skor Terakhir': r.terakhir?.total ?? '', Predikat: r.terakhir?.predikat || 'Belum dinilai',
    })), `Rekap_Kinerja_${ta}`.replace(/[^\w-]+/g, '_'), `Rekap Penilaian Kinerja Guru — ${ta}`);
  }

  return (
    <>
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={`${dinilai.length}/${rows.length}`} label="Guru sudah dinilai" color="c-green" />
        <InfoCard value={rataSekolah ?? '—'} label="Rata-rata skor terakhir" color="c-blue" />
        <InfoCard value={pembinaan} label="Perlu pembinaan" color="c-red" />
        <InfoCard value={aspekTerlemah ? aspekTerlemah[0] : '—'} label={aspekTerlemah ? `Aspek terendah (${aspekTerlemah[1]})` : 'Aspek terendah'} color="c-gold" valueFontSize={20} />
      </div>
      <div className="card">
        <div className="card-head">
          <div><h3>Rekap kinerja per guru</h3><p>Skor per aspek dirata-rata dari semua penilaian di tahun ajaran terpilih; predikat mengikuti penilaian terakhir.</p></div>
          <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
        </div>
        <div className="card-body">
          <div className="filter-bar"><Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field></div>
          {!rows.length ? <Kosong>Belum ada data guru.</Kosong> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Guru</th>{ASPEK_KINERJA.map(a => <th key={a} style={{ textAlign: 'center' }}>{a}</th>)}<th style={{ textAlign: 'center' }}>Skor Terakhir</th><th>Predikat</th><th>Dinilai</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.nama}>
                      <td><b>{r.nama}</b></td>
                      {ASPEK_KINERJA.map(a => <td key={a} style={{ textAlign: 'center', color: r.perAspek[a] !== null && r.perAspek[a] < 70 ? 'var(--red)' : undefined }}>{r.perAspek[a] ?? '—'}</td>)}
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.terakhir?.total ?? '—'}</td>
                      <td>{r.terakhir ? <span className={`badge ${badgeKinerja(r.terakhir.predikat)}`}>{r.terakhir.predikat}</span> : <span className="badge badge-muted">Belum dinilai</span>}</td>
                      <td style={{ fontSize: 12.5 }}>{r.terakhir ? `${r.jumlah}× · ${formatTanggalAngka(r.terakhir.tanggal)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PenilaianKinerja() {
  const { refreshKinerja, profilSekolah } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('kinerja', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, guruOptions } = useAkademikOptions();
  const fields = useMemo(() => buildKinerjaFields({ guruOptions, tahunAjaranOptions }), [guruOptions, tahunAjaranOptions]);
  const emptyRow = useCallback(() => ({
    'Nama Guru': '', 'Tahun Ajaran': taAktif, Semester: semesterDariTanggal(), 'Tanggal Penilaian': todayWIB(), Penilai: profilSekolah?.kepalaSekolah || '',
    ...Object.fromEntries(ASPEK_KINERJA.map(a => [a, ''])), 'Catatan Supervisor': '', Rekomendasi: '',
  }), [taAktif, profilSekolah]);
  const addFn = useCallback(async (f) => { await addKinerjaToSheet(lengkapiKinerja(f)); await refreshKinerja(); }, [refreshKinerja]);
  const updateFn = useCallback((r) => updateKinerjaInSheet(lengkapiKinerja(r)), []);

  return (
    <Page pageId="kinerja" title="Penilaian Kinerja" path="Kepegawaian / Penilaian Kinerja">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'rekap' && bolehTab('rekap') && <RekapKinerja />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable title="Data penilaian kinerja" subtitle="Skor total dan predikat dihitung ulang otomatis setiap kali diedit."
              headers={KINERJA_HEADERS} fields={fields}
              fetchFn={fetchKinerjaFromSheet} updateFn={updateFn} deleteFn={deleteKinerjaFromSheet}
              moduleLabel="Penilaian Kinerja" labelKey="Nama Guru" target="akademik"
              columnRenderers={{ Predikat: r => <span className={`badge ${badgeKinerja(r.Predikat || predikatKinerja(Number(r['Skor Total'])))}`}>{r.Predikat}</span> }}
              searchFn={(r, t) => `${r['Nama Guru']} ${r['Tahun Ajaran']} ${r.Predikat}`.toLowerCase().includes(t)} onChanged={refreshKinerja} />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik"
              title="Input penilaian kinerja" subtitle="Isi skor 0–100 untuk tiap aspek. Skor total = rata-rata 5 aspek; predikat: ≥90 Amat Baik, ≥80 Baik, ≥70 Cukup, di bawahnya Perlu Pembinaan." />
          )}
        </div>
      </div>
    </Page>
  );
}
