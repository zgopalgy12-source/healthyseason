"use client";

export function ErrorState({ reset }: { reset: () => void }) {
  return <section className="card account-card">
    <h1>Ocorreu um erro</h1>
    <p>A Healthy Season não conseguiu carregar esta página.</p>
    <button className="button" onClick={reset}>Tentar novamente</button>
  </section>;
}
