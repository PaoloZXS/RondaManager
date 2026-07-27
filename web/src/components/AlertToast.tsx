import { useState, useCallback, useEffect } from 'react';

interface AlertOptions {
  message: string;
  type?: 'error' | 'success' | 'info';
  duration?: number;
}

let alertRef: ((opts: AlertOptions) => void) | null = null;

export function showAlert(opts: AlertOptions) {
  if (alertRef) alertRef(opts);
}

export default function AlertToast() {
  const [state, setState] = useState<{
    visible: boolean;
    message: string;
    type: 'error' | 'success' | 'info';
  }>({ visible: false, message: '', type: 'error' });

  alertRef = useCallback((opts: AlertOptions) => {
    setState({ visible: true, message: opts.message, type: opts.type || 'error' });
  }, []);

  useEffect(() => {
    if (state.visible) {
      const timer = setTimeout(() => setState(s => ({ ...s, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.visible]);

  if (!state.visible) return null;

  const colors = {
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  };
  const c = colors[state.type];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
      background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.border}`,
      borderRadius: 8, padding: '12px 16px', maxWidth: 400,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      color: c.text, fontSize: 14, fontWeight: 500,
      animation: 'slideIn 0.3s ease',
    }}>
      {state.message}
    </div>
  );
}
