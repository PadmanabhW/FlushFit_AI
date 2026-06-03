import CabinetConfigurator from '@/components/CabinetConfigurator';

export default function Home() {
  return (
    <div className="page-wrapper">
      {/* Hero Header */}
      <header className="page-hero">
        <div className="page-hero__eyebrow">
          ⚡ Frameless Cabinet Engine
        </div>
        <h1 className="page-hero__title">
          Parametrix <span>AI</span>
        </h1>
        <p className="page-hero__sub">
          Deterministic parametric math for frameless (European-style) cabinet boxes.
          Enter your target dimensions, get a precision cut-list instantly.
        </p>
      </header>

      {/* Main Configurator */}
      <main className="page-main" id="configurator">
        <CabinetConfigurator />
      </main>

      {/* Footer */}
      <footer className="page-footer">
        <p>
          Parametrix AI · Frameless cabinet cut-list engine ·{' '}
          <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">
            API Docs ↗
          </a>
        </p>
      </footer>
    </div>
  );
}
