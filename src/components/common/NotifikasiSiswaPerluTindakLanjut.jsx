import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSiswaPerluTindakLanjut from '../../hooks/useSiswaPerluTindakLanjut';
import Modal from './Modal';

const BATAS_TAMPIL = 5;

function TabelMasalah({ daftar }) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>No</th><th>Nama Siswa</th><th>NISN</th><th>Yang Perlu Dilengkapi</th></tr></thead>
        <tbody>
          {daftar.map((d, idx) => (
            <tr key={d.siswa.id}>
              <td>{idx + 1}</td>
              <td>{d.siswa.nama}</td>
              <td>{d.siswa.nisn || '-'}</td>
              <td>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {d.masalah.map((m, i) => <li key={i} style={{ fontSize: 12.5, color: 'var(--red)' }}>{m}</li>)}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NotifikasiSiswaPerluTindakLanjut() {
  const daftar = useSiswaPerluTindakLanjut();
  const navigate = useNavigate();
  // Sejak v1.31.30: hanya 5 baris pertama ditampilkan inline -- ini cuma
  // informasi, sisanya dibuka lewat modal "Lihat Semua" biar kartu tidak
  // memanjang kalau jumlah siswa bermasalah banyak (mis. 282 siswa).
  const [tampilSemua, setTampilSemua] = useState(false);

  if (daftar.length === 0) return null;

  const daftarRingkas = daftar.slice(0, BATAS_TAMPIL);
  const sisa = daftar.length - daftarRingkas.length;

  return (
    <div className="card" style={{ borderColor: 'var(--gold)' }}>
      <div className="card-head">
        <div>
          <h3>⚠️ {daftar.length} Siswa Perlu Tindak Lanjut</h3>
          <p>Siswa aktif (baru masuk / pindahan / data belum lengkap) yang butuh dilengkapi rombel dan/atau tagihan SPP susulan.</p>
        </div>
      </div>
      <div className="card-body">
        <TabelMasalah daftar={daftarRingkas} />
        {sisa > 0 && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-sm" onClick={() => setTampilSemua(true)}>Lihat Semua ({daftar.length})</button>
          </div>
        )}
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <button className="btn btn-sm" onClick={() => navigate('/siswa')}>Lengkapi Rombel di Data Siswa</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/tagihan')}>Terbitkan Tagihan Susulan</button>
        </div>
      </div>

      {tampilSemua && (
        <Modal
          title={`${daftar.length} Siswa Perlu Tindak Lanjut`}
          subtitle="Daftar lengkap siswa yang butuh dilengkapi rombel dan/atau tagihan SPP susulan."
          onClose={() => setTampilSemua(false)}
          wide
          actions={<button type="button" className="btn" onClick={() => setTampilSemua(false)}>Tutup</button>}
        >
          <TabelMasalah daftar={daftar} />
        </Modal>
      )}
    </div>
  );
}
