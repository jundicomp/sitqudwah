// Kartu ringkasan statistik dgn ikon satu warna -- pengganti pola `.info-card`
// mentah yg sebelumnya diulang-ulang manual di 9 halaman berbeda. Dipakai ulang
// supaya konsisten & gampang diaudit dari 1 tempat.
export default function InfoCard({ icon: Icon, value, label, color = 'c-green', valueFontSize, style }) {
  return (
    <div className={`info-card ${color}`} style={style}>
      {Icon && <Icon className="info-card-icon" width={22} height={22} />}
      <div className="info-value" style={valueFontSize ? { fontSize: valueFontSize } : undefined}>{value}</div>
      <div className="info-label">{label}</div>
    </div>
  );
}
