import { useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../components/common/Modal';
import { SISWA_HEADERS, normalizeHeaderKey } from '../../db/siswaFields';
import { bulkAddSiswaToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';

// Sejak v1.31.29+perbaikan: dulu tab tersendiri di menu Data Siswa, sekarang jadi
// MODAL yang dibuka lewat tombol "📊 Upload Excel" di tab Data Siswa (Tabel) --
// supaya semua aksi terkait tabel siswa (tambah/edit/hapus/upload) terkumpul di 1
// tempat, bukan tersebar sbg tab terpisah-pisah.
export default function ExcelUpload({ onClose, onSaved }) {
  const { toast } = useAppData();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [unmappedCols, setUnmappedCols] = useState([]);
  const [uploading, setUploading] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (raw.length === 0) { toast('File kosong atau tidak terbaca.', 'error'); return; }

        const rawHeaders = Object.keys(raw[0]);
        const mapping = {}; // rawHeader -> our field key
        const unmapped = [];
        rawHeaders.forEach(h => {
          const matched = normalizeHeaderKey(h);
          if (matched) mapping[h] = matched;
          else if (h.trim() !== '') unmapped.push(h);
        });

        const mappedRows = raw.map(r => {
          const obj = {};
          SISWA_HEADERS.forEach(h => { obj[h] = ''; });
          Object.entries(r).forEach(([rawKey, val]) => {
            const key = mapping[rawKey];
            if (key) {
              obj[key] = val instanceof Date ? val.toLocaleDateString('id-ID') : val;
            }
          });
          return obj;
        });

        setRows(mappedRows);
        setUnmappedCols(unmapped);
      } catch (err) {
        toast('Gagal membaca file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function submitAll() {
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu di atas.', 'error'); return; }
    if (rows.length === 0) return;
    setUploading(true);
    try {
      const result = await bulkAddSiswaToSheet(rows);
      toast(`${result.count} baris berhasil diunggah ke Google Sheets.`);
      setRows([]);
      setFileName('');
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  const adaBaris = rows.length > 0;

  return (
    <Modal
      title="Upload Data Siswa dari Excel"
      subtitle="Header kolom file harus sesuai format baku (lihat contoh di bawah), urutan kolom bebas."
      onClose={onClose}
      wide
      actions={
        adaBaris ? (
          <>
            <button type="button" className="btn" onClick={() => { setRows([]); setFileName(''); }} disabled={uploading}>Batalkan</button>
            <button type="button" className="btn btn-primary" onClick={submitAll} disabled={uploading}>
              {uploading ? 'Mengunggah...' : `Unggah ${rows.length} Baris ke Google Sheets`}
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={onClose}>Tutup</button>
        )
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
        Header yang dikenali: <code style={{ fontSize: 11.5 }}>{SISWA_HEADERS.filter(h => h !== 'No').join(', ')}</code>
      </p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
      {fileName && <p style={{ fontSize: 13, marginTop: 8 }}>File: <strong>{fileName}</strong> — {rows.length} baris terbaca</p>}

      {unmappedCols.length > 0 && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--gold-soft)', borderRadius: 8, fontSize: 12.5 }}>
          ⚠️ Kolom berikut di file Anda <strong>tidak dikenali</strong> dan akan diabaikan: {unmappedCols.join(', ')}
        </div>
      )}

      {adaBaris && (
        <>
          <div className="table-scroll" style={{ marginTop: 16, maxHeight: 360, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>{SISWA_HEADERS.filter(h => h !== 'No').map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>{SISWA_HEADERS.filter(h => h !== 'No').map(h => <td key={h}>{String(r[h] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Menampilkan 50 dari {rows.length} baris (semua tetap akan diunggah).</p>}
        </>
      )}
    </Modal>
  );
}
