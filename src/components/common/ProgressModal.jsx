export default function ProgressModal({ title, current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(18,61,34,.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '32px 36px', width: 380, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--green-dark)' }}>{title}</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 18px' }}>Mohon tunggu, jangan tutup atau muat ulang halaman ini.</p>
        <div style={{ height: 12, background: '#EEF2EC', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', transition: 'width .25s ease', borderRadius: 8 }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)' }}>{pct}%</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{current} dari {total} siswa</div>
      </div>
    </div>
  );
}
