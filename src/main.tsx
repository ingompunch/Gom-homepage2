import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Main script starting...');
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('React render complete');
} catch (error) {
  console.error('Failed to render React app:', error);
  document.body.innerHTML = `<div style="color: white; padding: 20px;"><h1>사이트 로딩 오류</h1><p>${error}</p></div>`;
}
