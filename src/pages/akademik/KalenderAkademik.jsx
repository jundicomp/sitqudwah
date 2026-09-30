import { useCallback, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { AGENDA_HEADERS, KATEGORI_AGENDA_OPTIONS, CAKUPAN_AGENDA_OPTIONS, WARNA_AGENDA, buildAgendaFields, agendaPadaTanggal } from '../../db/akademikLanjutanFields';
import { todayWIB, formatTanggalAngka } from '../../db/helpers';
import { fetchAgendaFromSheet, addAgendaToSheet, updateAgendaInSheet, deleteAgendaFromSheet } from '../../services/googleSheets';

const TABS = [
  { id: 'kalender', label: 'KALENDER BULANAN' },
  { id: 'daftar', label: 'DAFTAR AGENDA' },
  { id: 'manual', label: 'TAMBAH AGENDA' },
];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function rentangTeks(a) {
  return a.mulai === a.selesai ? formatTanggalAngka(a.mulai) : `${formatTanggalAngka(a.mulai)} s.d. ${formatTanggalAngka(a.selesai)}`;
}

function cekTanggal(row) {
  const selesai = row['Tanggal Selesai'] || row['Tanggal Mulai'];
  if (selesai < row['Tanggal Mulai']) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  return { ...row, 'Tanggal Selesai': selesai };
}

function KalenderBulanan() {
  const { agenda } = useAppData();
  const hariIni = todayWIB();
  const [ym, setYm] = useState(() => ({ y: Number(hariIni.slice(0, 4)), m: Number(hariIni.slice(5, 7)) - 1 }));
  const [cakupan, setCakupan] = useState('');
  const [detail, setDetail] = useState(null);

  const tampil = useMemo(() => agenda.filter(a => !cakupan || a.cakupan === 'Semua Kelas' || a.cakupan === cakupan), [agenda, cakupan]);

  const sel = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const offset = (first.getDay() + 6) % 7; // Senin = kolom pertama
    const jmlHari = new Date(ym.y, ym.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(ym.y, ym.m, 1 - offset + i);
      cells.push({ iso: iso(d.getFullYear(), d.getMonth(), d.getDate()), tgl: d.getDate(), luar: d.getMonth() !== ym.m, minggu: d.getDay() === 0 });
    }
    return (offset + jmlHari) <= 35 ? cells.slice(0, 35) : cells;
  }, [ym]);

  const awalBulan = iso(ym.y, ym.m, 1);
  const akhirBulan = iso(ym.y, ym.m, new Date(ym.y, ym.m + 1, 0).getDate());
  const bulanIni = tampil.filter(a => a.mulai <= akhirBulan && a.selesai >= awalBulan).sort((a, b) => a.mulai.localeCompare(b.mulai));
  const geser = (n) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="card">
      <div className="card-body">
        <div className="kal-head">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={() => geser(-1)} aria-label="Bulan sebelumnya">‹</button>
            <h4>{BULAN[ym.m]} {ym.y}</h4>
            <button className="btn btn-sm" onClick={() => geser(1)} aria-label="Bulan berikutnya">›</button>
            <button className="btn btn-sm" onClick={() => setYm({ y: Number(hariIni.slice(0, 4)), m: Number(hariIni.slice(5, 7)) - 1 })}>Hari ini</button>
          </div>
          <div className="filter-bar" style={{ margin: 0 }}>
            <Field label="Tampilkan agenda untuk"><Select value={cakupan} onChange={setCakupan} placeholder="Semua agenda" options={CAKUPAN_AGENDA_OPTIONS.filter(c => c !== 'Semua Kelas')} /></Field>
          </div>
        </div>
        <div className="table-scroll">
          <div className="kal-grid" style={{ minWidth: 640 }}>
            {HARI.map(h => <div key={h} className="kal-dow">{h}</div>)}
            {sel.map(c => (
              <div key={c.iso} className={`kal-cell${c.luar ? ' luar' : ''}${c.minggu ? ' minggu' : ''}${c.iso === hariIni ? ' hari-ini' : ''}`}>
                <div className="kal-tgl">{c.tgl}</div>
                {agendaPadaTanggal(tampil, c.iso).slice(0, 3).map(a => (
                  <button key={a.id} className="kal-ev" style={{ borderLeftColor: WARNA_AGENDA[a.kategori] }} title={a.judul} onClick={() => setDetail(a)}>{a.judul}</button>
                ))}
                {agendaPadaTanggal(tampil, c.iso).length > 3 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{agendaPadaTanggal(tampil, c.iso).length - 3} lagi</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="kal-legend">{KATEGORI_AGENDA_OPTIONS.map(k => <span key={k}><i style={{ background: WARNA_AGENDA[k] }} />{k}</span>)}</div>

        <h4 style={{ margin: '20px 0 8px', color: 'var(--green-dark)' }}>Agenda bulan ini</h4>
        {!bulanIni.length ? <Kosong>Tidak ada agenda di bulan ini.</Kosong> : (
          <table>
            <thead><tr><th>Tanggal</th><th>Agenda</th><th>Kategori</th><th>Berlaku untuk</th></tr></thead>
            <tbody>
              {bulanIni.map(a => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{rentangTeks(a)}</td>
                  <td><b>{a.judul}</b>{a.keterangan && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.keterangan}</div>}</td>
                  <td><span className="badge badge-muted" style={{ borderLeft: `3px solid ${WARNA_AGENDA[a.kategori]}` }}>{a.kategori}</span></td>
                  <td>{a.cakupan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {detail && (
        <Modal title={detail.judul} subtitle={`${rentangTeks(detail)} · ${detail.kategori} · ${detail.cakupan}`} onClose={() => setDetail(null)}
          actions={<button className="btn" onClick={() => setDetail(null)}>Tutup</button>}>
          <p style={{ margin: 0 }}>{detail.keterangan || 'Tidak ada keterangan tambahan.'}</p>
        </Modal>
      )}
    </div>
  );
}

export default function KalenderAkademik() {
  const { refreshAgenda } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('kalender', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif } = useAkademikOptions();
  const fields = useMemo(() => buildAgendaFields({ tahunAjaranOptions }), [tahunAjaranOptions]);
  const emptyRow = useCallback(() => ({ Judul: '', Kategori: '', 'Tanggal Mulai': todayWIB(), 'Tanggal Selesai': '', Cakupan: 'Semua Kelas', 'Tahun Ajaran': taAktif, Keterangan: '' }), [taAktif]);
  const addFn = useCallback(async (f) => { await addAgendaToSheet(cekTanggal(f)); await refreshAgenda(); }, [refreshAgenda]);
  const updateFn = useCallback((r) => updateAgendaInSheet(cekTanggal(r)), []);

  return (
    <Page pageId="kalender" title="Kalender Akademik" path="Akademik / Kalender Akademik">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kalender' && bolehTab('kalender') && <KalenderBulanan />}
          {tab === 'daftar' && bolehTab('daftar') && (
            <GenericStoredTable
              title="Daftar agenda" subtitle="Semua agenda akademik di semua tahun ajaran."
              headers={AGENDA_HEADERS} fields={fields}
              fetchFn={fetchAgendaFromSheet} updateFn={updateFn} deleteFn={deleteAgendaFromSheet}
              moduleLabel="Kalender Akademik" labelKey="Judul" target="akademik"
              searchFn={(r, t) => `${r.Judul} ${r.Kategori} ${r.Cakupan} ${r['Tanggal Mulai']}`.toLowerCase().includes(t)}
              onChanged={refreshAgenda}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm fields={fields} emptyRow={emptyRow} addFn={addFn} target="akademik"
              title="Tambah agenda" subtitle="Kosongkan tanggal selesai untuk agenda satu hari." />
          )}
        </div>
      </div>
    </Page>
  );
}
