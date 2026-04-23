import { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-green" />,
    error: <XCircle size={18} className="text-red" />,
    info: <Info size={18} className="text-blue" />,
  };

  const colors = {
    success: 'border-green',
    error: 'border-red',
    info: 'border-blue',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-cream-white border-l-4 ${colors[type]} rounded-lg shadow-lg px-4 py-3 min-w-[260px] animate-slideIn`}>
      {icons[type]}
      <span className="text-sm text-sage-dark">{message}</span>
    </div>
  );
}