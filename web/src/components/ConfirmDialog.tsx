import { useState, useCallback } from 'react';

interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
}

let confirmRef: ((opts: ConfirmOptions) => void) | null = null;

export function showConfirm(opts: ConfirmOptions) {
  if (confirmRef) confirmRef(opts);
}

export default function ConfirmDialog() {
  const [state, setState] = useState<{
    visible: boolean;
    message: string;
    title?: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    message: '',
    confirmText: 'OK',
    cancelText: 'Annulla',
    onConfirm: () => {},
  });

  confirmRef = useCallback((opts: ConfirmOptions) => {
    setState({
      visible: true,
      message: opts.message,
      title: opts.title,
      confirmText: opts.confirmText || 'OK',
      cancelText: opts.cancelText || 'Annulla',
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
    });
  }, []);

  if (!state.visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 240, right: 0, bottom: 0,
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }} onClick={() => {
      setState(s => ({ ...s, visible: false }));
      state.onCancel?.();
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 420, width: '92%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: 0,
      }} onClick={(e) => e.stopPropagation()}>
        {state.title && (
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff', borderRadius: '12px 12px 0 0', padding: '16px 20px',
            fontWeight: 700, fontSize: 16,
          }}>{state.title}</div>
        )}
        <div style={{ padding: '20px 24px', fontSize: 15, color: '#374151', lineHeight: 1.5 }}>
          {state.message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 16px' }}>
          <button onClick={() => {
            setState(s => ({ ...s, visible: false }));
            state.onCancel?.();
          }} style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151',
          }}>{state.cancelText}</button>
          <button onClick={() => {
            setState(s => ({ ...s, visible: false }));
            state.onConfirm();
          }} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff',
          }}>{state.confirmText}</button>
        </div>
      </div>
    </div>
  );
}
