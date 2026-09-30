import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function useToast() {
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, type, message });
  }, []);

  return { toast, showToast };
}

export function ToastContainer({ toast }) {
  if (!toast?.show) return null;
  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .toast-anim {
          animation: toastIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className="toast-anim"
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          borderRadius: 14,
          background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          color:      toast.type === 'error' ? '#DC2626' : '#059669',
          border:     `1px solid ${toast.type === 'error' ? '#FEE2E2' : '#D1FAE5'}`,
          boxShadow: '0 12px 32px rgba(79,95,82,0.18)',
          fontSize: '0.9rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
          pointerEvents: 'none',
          maxWidth: '90vw',
        }}
      >
        {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
        <span>{toast.message}</span>
      </div>
    </>
  );
}