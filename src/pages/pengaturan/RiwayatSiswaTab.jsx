import { useMemo, useRef, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import { useAppData } from '../../context/AppContext';
import { STATUS_SISWA_OPTIONS } from '../../db/siswaFields';
import { STATUS_RIWAYAT_BADGE, riwayatSiswaUrut } from '../../db/riwayatAkademikFields';
import { exportToExcel } from '../../utils/exportTable';
import { initials, avatarColor } from '../../db/helpers';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';

const STATUS_NONAKTIF = STATUS_SISWA_OPTIONS.filter(s => s !== 'Aktif'); // ['Lulus','Pindah','Berhenti']

const STATUS_BADGE = {
  Lulus: 'badge-green',
  Pindah: 'badge-blue',
  Berhenti: 'badge-red',
};

// Timeline riwayat Kelas/Rombel/Status 1 siswa, dari Tahun Ajaran PALING AWAL yg
// tercatat sampai yg PALING BARU -- ini inti permintaan "setiap siswa punya histori
// dari kelas 1 sampai dia tamat". Datanya baru mulai terisi sejak fitur Proses
// Kenaikan Kelas Tahunan pertama kali dijalankan -- tahun2 sebelum itu tidak
// otomatis terekonstruksi (datanya memang tidak pernah ada).
function TimelineRiwayat({ siswa, riwayat }) {
  if (riwayat.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
            Belum ada riwayat akademik tercatat utk <strong>{siswa.nama}</strong>. Riwayat mulai terekam sejak menu
            <strong> Data Siswa &gt; Kenaikan Kelas</strong> pertama kali dijalankan.
          </p>
          <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Kondisi saat ini (belum tercatat sbg riwayat)</span>: <b>Kelas {siswa.kelasTingkat || '-'}</b>
            {siswa.rombel ? <> · Rombel <b>{siswa.rombel}</b></> : ''}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-body">
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
          {riwayat.map((r, idx) => (
            <div key={r.id} style={{ position: 'relative', paddingBottom: idx === riwayat.length - 1 ? 0 : 18 }}>
              <div style={{ position: 'absolute', left: -22, top: 3, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '3px solid var(--green)' }} />
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 13.5 }}>{r.tahunAjaran} — Kelas {r.kelasTingkat || '-'}{r.rombel ? ` · ${r.rombel}` : ''}</strong>
                  <span className={`badge ${STATUS_RIWAYAT_BADGE[r.status] || 'badge-muted'}`}>{r.status}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {r.waliKelas && <span>Wali kelas: <b style={{ color: 'var(--text)' }}>{r.waliKelas}</b></span>}
                  {r.tanggal && <span>Tanggal: {r.tanggal}</span>}
                  {r.keterangan && <span>Catatan: {r.keterangan}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RiwayatSiswaTab() {
  const { siswa, siswaLoading, siswaLoaded, riwayatAkademik, riwayatAkademikLoaded } = useAppData();
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [term, setTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

  const siswaNonaktif = useMemo(
    () => siswa.filter(s => STATUS_NONAKTIF.includes(s.status || 'Aktif')),
    [siswa]
  );

  const jumlahPerStatus = useMemo(() => {
    const map = {};
    STATUS_NONAKTIF.forEach(st => { map[st] = siswaNonaktif.filter(s => s.status === st).length; });
    return map;
  }, [siswaNonaktif]);

  const filtered = useMemo(() => {
    return filterStatus === 'Semua' ? siswaNonaktif : siswaNonaktif.filter(s => s.status === filterStatus);
  }, [siswaNonaktif, filterStatus]);

  const suggestions = useMemo(() => {
    if (!term.trim()) return [];
    const t = term.toLowerCase();
    return siswa.filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t)).slice(0, 6);
  }, [term, siswa]);

  const selected = siswa.find(s => s.id === selectedId);
  const riwayatTerurut = useMemo(() => (selected ? riwayatSiswaUrut(selected.nisn, riwayatAkademik) : []), [selected, riwayatAkademik]);
  const dataSiap = riwayatAkademikLoaded;

  const columns = [
    { key: 'nisn', label: 'NISN', accessor: r => r.nisn || '-' },
    { key: 'nama', label: 'Nama Lengkap', accessor: r => r.nama, sortable: true },
    { key: 'kelasTingkat', label: 'Kelas Terakhir', accessor: r => r.kelasTingkat || '-' },
    { key: 'status', label: 'Status', render: r => <span className={`badge ${STATUS_BADGE[r.status] || 'badge-muted'}`}>{r.status}</span>, sortable: true },
    { key: 'lihat', label: '', render: r => <button className="btn btn-sm" onClick={() => { setSelectedId(r.id); setTerm(r.nama); }}>Lihat Riwayat</button> },
  ];

  function exportExcelRiwayat() {
    const headers = ['NISN', 'Nama Lengkap', 'Kelas Terakhir', 'Status'];
    const rows = filtered.map(s => ({ NISN: s.nisn || '-', 'Nama Lengkap': s.nama, 'Kelas Terakhir': s.kelasTingkat || '-', Status: s.status }));
    const judul = filterStatus === 'Semua' ? 'Riwayat Siswa - Semua Status' : `Riwayat Siswa - ${filterStatus}`;
    exportToExcel(headers, rows, judul, judul);
  }

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div><h3>Cari Riwayat Akademik Siswa</h3><p>Perjalanan 1 siswa dari Kelas 1 sampai tamat/keluar — Kelas, Rombel, Wali Kelas, dan Status tiap tahun ajaran.</p></div>
        </div>
        <div className="card-body">
          <div style={{ maxWidth: 420 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={term}
              onChange={e => { setTerm(e.target.value); setSelectedId(null); }}
              style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
            />
            <SuggestionDropdown anchorRef={inputRef} visible={suggestions.length > 0 && !selected}>
              {suggestions.map(s => (
                <div key={s.id} onClick={() => { setSelectedId(s.id); setTerm(s.nama); }} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(s.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials(s.nama || '?')}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.nama}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>NISN {s.nisn || '-'} · Status {s.status || 'Aktif'}</div></div>
                </div>
              ))}
            </SuggestionDropdown>
            {/* Sejak v1.31.30: dulu kalau tidak ada siswa yg cocok, dropdown ini
                diam saja (tidak render apa-apa) -- terlihat spt fitur pencarian
                "tidak berfungsi". Sekarang kasih pesan eksplisit, sama spt di
                tab Portofolio Siswa. */}
            <SuggestionDropdown anchorRef={inputRef} visible={!!term.trim() && suggestions.length === 0 && !selected}>
              <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>
                Tidak ditemukan siswa dengan nama atau NISN mengandung "{term.trim()}". Coba kata kunci lain, atau cek ejaannya di menu Data Siswa (Tabel).
              </div>
            </SuggestionDropdown>
          </div>

          {selected && (
            <div style={{ marginTop: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: avatarColor(selected.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>{initials(selected.nama)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.nama}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>NISN {selected.nisn || '-'} · Status saat ini: {selected.status || 'Aktif'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && dataSiap && <TimelineRiwayat siswa={selected} riwayat={riwayatTerurut} />}
      {selected && !dataSiap && <div className="card"><div className="card-body" style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat riwayat akademik...</div></div>}

      <div className="card">
        <div className="card-head">
          <div><h3>Daftar Siswa Nonaktif</h3><p>Siswa yang sudah Lulus, Pindah, atau Berhenti — datanya tetap tersimpan untuk riwayat/audit, tidak ikut dihitung atau ditagih lagi.</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
              <option value="Semua">Semua Status</option>
              {STATUS_NONAKTIF.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            <button className="btn btn-sm" onClick={exportExcelRiwayat} disabled={filtered.length === 0}>📊 Excel</button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {STATUS_NONAKTIF.map(st => (
              <div key={st} style={{ padding: '8px 16px', background: '#F6F8F5', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                {st}: <strong>{jumlahPerStatus[st] || 0}</strong>
              </div>
            ))}
          </div>

          {siswaLoading && !siswaLoaded && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat data...</p>}
          {siswaLoaded && filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Belum ada siswa dengan status ini.</p>}
          {siswaLoaded && filtered.length > 0 && (
            <DataTable
              columns={columns}
              data={filtered}
              searchFn={(r, t) => (r.nama || '').toLowerCase().includes(t) || (r.nisn || '').includes(t)}
              emptyMessage="Tidak ada siswa yang cocok dengan pencarian ini."
              rowKey={r => r.id}
            />
          )}
        </div>
      </div>
    </>
  );
}
