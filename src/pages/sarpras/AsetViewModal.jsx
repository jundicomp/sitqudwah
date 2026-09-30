import { useRef } from 'react';
import Modal from '../../components/common/Modal';
import { normalizeSheetAset } from '../../db/asetFields';
import { useAppData } from '../../context/AppContext';
import { shareCardAsImage } from '../../utils/shareCardImage';
import { formatRupiah } from '../../db/helpers';

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#9aa29c', textTransform: 'uppercase', letterSpacing: .3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 1 }}>{value || '-'}</div>
    </div>
  );
}

export default function AsetViewModal({ row, onClose }) {
  const a = normalizeSheetAset(row);
  const { profilSekolah, tahunAjaranAktif } = useAppData();
  const cardRef = useRef(null);

  return (
    <Modal title="Detail Aset" onClose={onClose} actions={
      <>
        <button className="btn no-print" onClick={onClose}>Tutup</button>
        <button className="btn btn-primary no-print" onClick={() => shareCardAsImage(cardRef, `Sarpras - ${a.nama}`)}>📤 Share</button>
      </>
    }>
      <div ref={cardRef} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* Kop surat */}
        <div style={{ background: 'linear-gradient(135deg, var(--green), var(--green-dark))', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
          {profilSekolah?.logo ? (
            <img src={profilSekolah.logo} alt="Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'var(--green-dark)', flexShrink: 0 }}>
              {(profilSekolah?.nama || 'MI').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{profilSekolah?.nama || 'Nama Sekolah'}</div>
            <div style={{ fontSize: 11, opacity: .85 }}>{profilSekolah?.alamat || '-'}</div>
            <div style={{ fontSize: 10.5, opacity: .75, marginTop: 2 }}>Tahun Pelajaran: {tahunAjaranAktif?.label || '-'}</div>
          </div>
        </div>

        {/* Judul sarpras */}
        <div style={{ background: '#F6F8F5', padding: '12px 22px', borderBottom: '2px solid var(--gold)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--green-dark)' }}>{a.nama}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {a.kode && <>Kode: {a.kode} &nbsp;·&nbsp; </>}Kategori: {a.kategori || '-'}
          </div>
        </div>

        {/* Body: gambar kiri, detail kanan */}
        <div style={{ display: 'flex', gap: 20, padding: '20px 22px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 220px' }}>
            {a.gambar ? (
              <img src={a.gambar} alt={a.nama} style={{ width: '100%', height: 220, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: '100%', height: 220, borderRadius: 10, background: '#F6F8F5', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
                Belum ada foto
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, background: '#F6F8F5', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-dark)' }}>{a.baik}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase' }}>Baik</div>
              </div>
              <div style={{ flex: 1, background: '#F6F8F5', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#8a5b00' }}>{a.rusakRingan}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase' }}>RR</div>
              </div>
              <div style={{ flex: 1, background: '#F6F8F5', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{a.rusakBerat}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase' }}>RB</div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Nama Aset" value={a.nama} />
              <Field label="Kode Aset" value={a.kode} />
              <Field label="Kategori" value={a.kategori} />
              <Field label="Lokasi / Ruang" value={a.lokasi} />
              <Field label="Tahun Perolehan" value={a.tahunPerolehan} />
              <Field label="Total Unit" value={`${a.total} unit`} />
            </div>
            <Field label="Keterangan" value={a.keterangan} />

            {a.hargaEstimasi > 0 && (
              <div style={{ marginTop: 8, background: 'linear-gradient(135deg, var(--purple), var(--purple-dark))', borderRadius: 10, padding: '12px 16px', color: '#fff' }}>
                <div style={{ fontSize: 10.5, opacity: .85 }}>TOTAL NILAI ESTIMASI ({a.total} unit × {formatRupiah(a.hargaEstimasi)})</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{formatRupiah(a.nilaiTotal)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
