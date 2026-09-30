import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SEMESTER_OPTIONS, siswaDiRombel, semesterDariTanggal, predikatNilai, badgePredikat, PREDIKAT_LABEL } from '../../db/akademikFields';
import { SIKAP_OPTIONS, STATUS_RAPOR_OPTIONS, buatLookupKkm, nilaiRaporSiswa, kehadiranSemester } from '../../db/akademikLanjutanFields';
import { todayWIB, formatTanggal } from '../../db/helpers';
import { upsertRaporToSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { printElementById } from '../../utils/exportTable';
import { APP_NAME } from '../../config/appInfo';

const TABS = [{ id: 'kelas', label: 'RAPOR PER KELAS' }];
const BADGE_STATUS = { Terbit: 'badge-green', Draft: 'badge-gold', 'Belum Diisi': 'badge-muted' };
const rata1 = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

function DokumenRapor({ id, d }) {
  const { profilSekolah } = useAppData();
  return (
    <div id={id} className="doc-print">
      <h2>LAPORAN HASIL BELAJAR PESERTA DIDIK</h2>
      <p className="doc-sub">{profilSekolah?.nama || APP_NAME}{profilSekolah?.alamat ? ` · ${profilSekolah.alamat}` : ''}</p>
      <div className="doc-meta">
        <div><b>Nama:</b> {d.siswa.nama}</div><div><b>Kelas:</b> {d.rombel.label}</div>
        <div><b>NISN:</b> {d.siswa.nisn || '-'}</div><div><b>Semester:</b> {d.semester}</div>
        <div><b>NPSN:</b> {profilSekolah?.npsn || '-'}</div><div><b>Tahun Ajaran:</b> {d.ta}</div>
      </div>
      <h3>A. Sikap</h3>
      <table><tbody>
        <tr><td style={{ width: '35%' }}>Sikap Spiritual</td><td>{d.form.sikapSpiritual || '-'}</td></tr>
        <tr><td>Sikap Sosial</td><td>{d.form.sikapSosial || '-'}</td></tr>
      </tbody></table>
      <h3>B. Pengetahuan dan Keterampilan</h3>
      {!d.nilai.length ? <p>Belum ada nilai tercatat pada semester ini.</p> : (
        <table>
          <thead><tr><th style={{ width: 30 }}>No</th><th>Mata Pelajaran</th><th>KKM</th><th>Nilai</th><th>Predikat</th><th>Keterangan</th></tr></thead>
          <tbody>
            {d.nilai.map((g, i) => (
              <tr key={g.mapel}><td>{i + 1}</td><td>{g.mapel}</td><td style={{ textAlign: 'center' }}>{g.kkm ?? '-'}</td><td style={{ textAlign: 'center' }}><b>{g.akhir}</b></td>
                <td style={{ textAlign: 'center' }}>{predikatNilai(g.akhir)}</td><td>{g.tuntas === null ? '-' : g.tuntas ? 'Tuntas' : 'Belum Tuntas'}</td></tr>
            ))}
            <tr><td colSpan={3} style={{ textAlign: 'right' }}><b>Rata-rata</b></td><td style={{ textAlign: 'center' }}><b>{d.rata ?? '-'}</b></td><td colSpan={2}>{d.peringkat ? `Peringkat ${d.peringkat} dari ${d.dariJumlah}` : ''}</td></tr>
          </tbody>
        </table>
      )}
      <h3>C. Ekstrakurikuler</h3>
      <p style={{ margin: '0 0 8px' }}>{d.form.ekskul || '-'}</p>
      <h3>D. Ketidakhadiran</h3>
      <table><tbody>
        <tr><td style={{ width: '35%' }}>Sakit</td><td>{d.form.sakit || 0} hari</td></tr>
        <tr><td>Izin</td><td>{d.form.izin || 0} hari</td></tr>
        <tr><td>Tanpa Keterangan</td><td>{d.form.alpha || 0} hari</td></tr>
      </tbody></table>
      <h3>E. Catatan Wali Kelas</h3>
      <p style={{ margin: 0, minHeight: 40 }}>{d.form.catatan || '-'}</p>
      <div className="ttd">
        <div>Orang Tua/Wali<div className="garis">&nbsp;</div></div>
        <div>{formatTanggal((d.form.tanggalTerbit || todayWIB()) + 'T00:00:00')}<br />Wali Kelas<div className="garis">{d.rombel.wali || '\u00a0'}</div></div>
      </div>
      <div className="ttd" style={{ justifyContent: 'center' }}>
        <div>Mengetahui,<br />Kepala Sekolah<div className="garis">{profilSekolah?.kepalaSekolah || '\u00a0'}</div></div>
      </div>
    </div>
  );
}

function RaporModal({ baris, ta, semester, rombel, onClose }) {
  const { refreshRapor, toast } = useAppData();
  const { currentUser } = useAuth();
  const awal = baris.rapor;
  const [form, setForm] = useState(() => ({
    sikapSpiritual: awal?.sikapSpiritual || '', sikapSosial: awal?.sikapSosial || '', ekskul: awal?.ekskul || '',
    sakit: awal?.sakit ?? baris.hadir.Sakit, izin: awal?.izin ?? baris.hadir.Izin, alpha: awal?.alpha ?? baris.hadir.Alpha,
    catatan: awal?.catatan || '', status: awal?.status || 'Draft', tanggalTerbit: awal?.tanggalTerbit || '',
  }));
  const [menyimpan, setMenyimpan] = useState(false);
  const [pratinjau, setPratinjau] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const docId = 'rapor-print-doc';

  async function simpan(statusBaru) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!baris.siswa.nisn) { toast('Siswa ini belum punya NISN, rapor tidak bisa disimpan.', 'error'); return; }
    const status = statusBaru || form.status;
    if (status === 'Terbit' && (!form.sikapSpiritual || !form.sikapSosial)) { toast('Isi sikap spiritual dan sosial sebelum menerbitkan rapor.', 'error'); return; }
    const tanggalTerbit = status === 'Terbit' ? (form.tanggalTerbit || todayWIB()) : '';
    setMenyimpan(true);
    try {
      await upsertRaporToSheet([{
        'Tahun Ajaran': ta, Semester: semester, NISN: baris.siswa.nisn, 'Nama Siswa': baris.siswa.nama, Tingkat: rombel.tingkat, Rombel: rombel.rombel,
        'Sikap Spiritual': form.sikapSpiritual, 'Sikap Sosial': form.sikapSosial, Ekstrakurikuler: form.ekskul,
        Sakit: Number(form.sakit) || 0, Izin: Number(form.izin) || 0, Alpha: Number(form.alpha) || 0,
        'Catatan Wali Kelas': form.catatan, Status: status, 'Tanggal Terbit': tanggalTerbit,
      }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: status === 'Terbit' ? 'Terbitkan Rapor' : 'Simpan Rapor', modul: 'Rapor Digital', detail: `${baris.siswa.nama}, ${ta} ${semester}` });
      await refreshRapor();
      setForm(f => ({ ...f, status, tanggalTerbit }));
      toast(status === 'Terbit' ? 'Rapor diterbitkan.' : 'Rapor tersimpan sebagai draft.');
    } catch (err) { toast(err.message, 'error'); } finally { setMenyimpan(false); }
  }

  const dok = { siswa: baris.siswa, rombel, ta, semester, nilai: baris.nilai, rata: baris.rata, peringkat: baris.peringkat, dariJumlah: baris.dariJumlah, form };

  return (
    <Modal wide title={`Rapor ${baris.siswa.nama}`} subtitle={`${rombel.label} · ${ta} · Semester ${semester}`} onClose={onClose}
      actions={pratinjau ? (
        <><button className="btn" onClick={() => setPratinjau(false)}>Kembali ke isian</button><button className="btn btn-primary" onClick={() => printElementById(docId)}>🖨️ Cetak / PDF</button></>
      ) : (
        <>
          <button className="btn" onClick={() => setPratinjau(true)}>Pratinjau</button>
          <button className="btn" onClick={() => simpan('Draft')} disabled={menyimpan}>Simpan draft</button>
          <button className="btn btn-primary" onClick={() => simpan('Terbit')} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Terbitkan'}</button>
        </>
      )}>
      {pratinjau ? <DokumenRapor id={docId} d={dok} /> : (
        <>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className={`badge ${BADGE_STATUS[form.status]}`}>{form.status}{form.tanggalTerbit ? ` · ${form.tanggalTerbit}` : ''}</span>
            <span className="badge badge-muted">{baris.nilai.length} mapel dinilai</span>
            {baris.rata !== null && <span className="badge badge-green">Rata-rata {baris.rata}</span>}
            {baris.belumTuntas > 0 && <span className="badge badge-red">{baris.belumTuntas} belum tuntas</span>}
          </div>
          {!baris.nilai.length ? <Kosong>Belum ada nilai pada semester ini. Nilai rapor diambil otomatis dari menu Nilai Akademik.</Kosong> : (
            <table style={{ marginBottom: 16 }}>
              <thead><tr><th>Mata Pelajaran</th><th>Nilai Akhir</th><th>KKM</th><th>Predikat</th><th>Ketuntasan</th></tr></thead>
              <tbody>
                {baris.nilai.map(g => {
                  const p = predikatNilai(g.akhir);
                  return (
                    <tr key={g.mapel}>
                      <td>{g.mapel} <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>({g.jumlah} penilaian)</span></td>
                      <td><b>{g.akhir}</b></td><td>{g.kkm ?? <span style={{ color: 'var(--muted)' }}>belum diatur</span>}</td>
                      <td><span className={`badge ${badgePredikat(p)}`}>{p} · {PREDIKAT_LABEL[p]}</span></td>
                      <td>{g.tuntas === null ? '—' : <span className={`badge ${g.tuntas ? 'badge-green' : 'badge-red'}`}>{g.tuntas ? 'Tuntas' : 'Belum Tuntas'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="form-grid">
            <div className="field"><label>Sikap Spiritual</label><select value={form.sikapSpiritual} onChange={e => set('sikapSpiritual', e.target.value)}><option value="">— pilih —</option>{SIKAP_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="field"><label>Sikap Sosial</label><select value={form.sikapSosial} onChange={e => set('sikapSosial', e.target.value)}><option value="">— pilih —</option>{SIKAP_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="field span2"><label>Ekstrakurikuler</label><input value={form.ekskul} placeholder="mis. Pramuka (Baik), Tahfidz (Sangat Baik)" onChange={e => set('ekskul', e.target.value)} /></div>
            <div className="field"><label>Sakit (hari)</label><input type="number" min="0" value={form.sakit} onChange={e => set('sakit', e.target.value)} /></div>
            <div className="field"><label>Izin (hari)</label><input type="number" min="0" value={form.izin} onChange={e => set('izin', e.target.value)} /></div>
            <div className="field"><label>Tanpa keterangan (hari)</label><input type="number" min="0" value={form.alpha} onChange={e => set('alpha', e.target.value)} /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={e => set('status', e.target.value)}>{STATUS_RAPOR_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="field span2"><label>Catatan Wali Kelas</label><textarea rows={3} value={form.catatan} onChange={e => set('catatan', e.target.value)} /></div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 0 }}>
            Ketidakhadiran terisi otomatis dari Presensi Siswa semester ini ({baris.hadir.Sakit} sakit, {baris.hadir.Izin} izin, {baris.hadir.Alpha} alpha) dan masih bisa dikoreksi.
          </p>
        </>
      )}
    </Modal>
  );
}

function RaporPerKelas() {
  const { siswa, nilai, presensi, kkm, rapor, tahunAjaran } = useAppData();
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');
  const [bukaNisn, setBukaNisn] = useState(null);
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);

  const rows = useMemo(() => {
    if (!rombel) return [];
    const kkmOf = buatLookupKkm(kkm);
    const taObj = tahunAjaran.find(t => t.label === ta);
    const hasil = siswaDiRombel(siswa, rombel.tingkat, rombel.rombel).map(s => {
      const nil = nilaiRaporSiswa(nilai, s.nisn, ta, semester, kkmOf, rombel.tingkat);
      const r = rapor.find(x => x.nisn === s.nisn && x.tahunAjaran === ta && x.semester === semester) || null;
      return {
        id: s.id, siswa: s, nama: s.nama, nilai: nil, rata: rata1(nil.map(g => g.akhir)),
        belumTuntas: nil.filter(g => g.tuntas === false).length, hadir: kehadiranSemester(presensi, s.nisn, taObj, semester),
        rapor: r, status: r?.status || 'Belum Diisi',
      };
    });
    const urut = hasil.filter(h => h.rata !== null).sort((a, b) => b.rata - a.rata);
    urut.forEach((h, i) => { h.peringkat = i > 0 && urut[i - 1].rata === h.rata ? urut[i - 1].peringkat : i + 1; });
    hasil.forEach(h => { h.dariJumlah = urut.length; });
    return hasil;
  }, [siswa, nilai, presensi, kkm, rapor, tahunAjaran, ta, semester, rombel]);

  const buka = rows.find(r => r.siswa.nisn === bukaNisn || r.id === bukaNisn);
  const jml = (st) => rows.filter(r => r.status === st).length;
  const columns = [
    { key: 'nama', label: 'Nama Siswa', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.siswa.nisn || 'tanpa NISN'}</div></> },
    { key: 'mapel', label: 'Mapel Dinilai', sortable: true, accessor: r => r.nilai.length },
    { key: 'rata', label: 'Rata-rata', sortable: true, accessor: r => r.rata ?? -1, render: r => r.rata ?? '—' },
    { key: 'belumTuntas', label: 'Belum Tuntas', sortable: true, render: r => r.belumTuntas ? <span className="badge badge-red">{r.belumTuntas}</span> : '0' },
    { key: 'peringkat', label: 'Peringkat', sortable: true, accessor: r => r.peringkat ?? 999, render: r => r.peringkat ?? '—' },
    { key: 'status', label: 'Status Rapor', sortable: true, render: r => <span className={`badge ${BADGE_STATUS[r.status]}`}>{r.status}</span> },
    { key: 'aksi', label: '', render: r => <button className="btn btn-sm" onClick={() => setBukaNisn(r.siswa.nisn || r.id)}>Buka rapor</button> },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rapor per kelas</h3><p>Nilai diambil otomatis dari Nilai Akademik dan dibandingkan dengan KKM. Wali kelas melengkapi sikap, ekstrakurikuler, dan catatan, lalu menerbitkan.</p></div>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: `${r.label}${r.wali ? ' — ' + r.wali : ''}` }))} /></Field>
        </div>
        <div className="ringkas-bar" style={{ marginBottom: 12 }}>
          <span className="badge badge-green">Terbit {jml('Terbit')}</span>
          <span className="badge badge-gold">Draft {jml('Draft')}</span>
          <span className="badge badge-muted">Belum diisi {jml('Belum Diisi')}</span>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
          searchFn={(r, t) => `${r.nama} ${r.siswa.nisn}`.toLowerCase().includes(t)} emptyMessage="Tidak ada siswa aktif di rombel ini." />
      </div>
      {buka && <RaporModal key={buka.id + ta + semester} baris={buka} ta={ta} semester={semester} rombel={rombel} onClose={() => setBukaNisn(null)} />}
    </div>
  );
}

export default function RaporDigital() {
  const { tab, setTab, bolehTab } = useTabAccess('rapor', TABS.map(t => t.id));
  return (
    <Page pageId="rapor" title="Rapor Digital" path="Akademik / Rapor Digital">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'kelas' && bolehTab('kelas') && <RaporPerKelas />}
        </div>
      </div>
    </Page>
  );
}
