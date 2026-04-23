import { useAuth } from '../contexts/AuthContext';
import { Bell, User } from 'lucide-react';

export default function Header({ title }) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="bg-cream-white border-b border-warm-gray/20 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-playfair font-bold text-sage-dark">{title}</h2>
        <p className="text-xs text-warm-gray">{today}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Bell size={20} className="text-warm-gray cursor-pointer" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-xs rounded-full flex items-center justify-center">3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center">
            <User size={16} className="text-sage" />
          </div>
          <span className="text-sm font-medium text-sage-dark hidden sm:inline">
            {user?.first_name} {user?.last_name}
          </span>
        </div>
      </div>
    </header>
  );
}