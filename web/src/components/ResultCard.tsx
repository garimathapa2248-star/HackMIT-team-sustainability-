type ResultCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function ResultCard({ title, value, detail }: ResultCardProps) {
  return (
    <div className="result-card">
      <p className="label">{title}</p>
      <h3>{value}</h3>
      <p>{detail}</p>
    </div>
  );
}
