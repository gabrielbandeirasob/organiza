
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CRITICAL ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#0d0d0d', color: '#ff4d4d', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>⚠️ Erro de Renderização</h1>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Ocorreu um erro inesperado que impediu o carregamento do aplicativo.</p>
          <pre style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', overflow: 'auto', border: '1px solid #333' }}>
            {this.state.error?.toString()}
          </pre>
          <p style={{ marginTop: '20px', color: '#666', fontSize: '12px' }}>
            Dica: Verifique se as variáveis de ambiente do Supabase estão configuradas no Vercel.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
