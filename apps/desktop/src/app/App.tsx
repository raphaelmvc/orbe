import type { AppDependencies } from './composition';
import './App.css';

interface AppProps {
  readonly dependencies: AppDependencies;
}

export default function App({ dependencies }: AppProps) {
  void dependencies;

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-name">Orbe</span>
      </header>

      <main className="empty-state">
        <div className="orbit-illustration" aria-hidden="true">
          <span />
        </div>
        <p className="eyebrow">Seu espaço financeiro</p>
        <h1>Comece no seu ritmo.</h1>
        <p id="empty-state-description" className="empty-state-copy">
          O Orbe está pronto para organizar suas contas quando você estiver.
        </p>
        <button type="button" aria-describedby="empty-state-description">
          Configurar depois
        </button>
      </main>
    </div>
  );
}
