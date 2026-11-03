// Aparece na hora ao trocar de tela, enquanto o servidor monta a página.
export default function Loading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Carregando">
      <div className="mb-5">
        <div className="h-7 w-48 rounded-lg bg-line" />
        <div className="mt-2 h-4 w-32 rounded-lg bg-line/70" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card mb-4 h-40" />
      <div className="card h-56" />
    </div>
  );
}
