import { Link, useLocation } from 'react-router-dom';
import { Package, Settings, BarChart3, ShoppingBag, Calendar, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [dressingName, setDressingName] = useState<string>('Mon Dressing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDressingName();
    }
  }, [user]);

  async function loadDressingName() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('dressing_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.dressing_name) {
        setDressingName(data.dressing_name);
      }
    } catch (error) {
      console.error('Error loading dressing name:', error);
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo = retour à la page d’accueil */}
              <Link to="/" className="flex items-center gap-2">
                <Package className="w-6 h-6 text-emerald-600" />
                <span className="text-xl font-bold text-gray-900">EasyVinted</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                  {dressingName}
                </span>
              </Link>

              {/* Menu desktop */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/stock"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/stock')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Mon Stock
                </Link>
                <Link
                  to="/sales"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/sales')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Mes Ventes
                </Link>
                <Link
                  to="/planner"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/planner')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Planificateur
                </Link>
                <Link
                  to="/analytics"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/analytics')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Statistiques
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="hidden sm:block p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Paramètres"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <Link
                to="/profile"
                className="hidden sm:flex w-10 h-10 rounded-full bg-emerald-600 items-center justify-center hover:bg-emerald-700 transition-colors"
                title="Mon profil"
              >
                <span className="text-sm font-semibold text-white">
                  {user?.email ? getInitials(user.email) : 'U'}
                </span>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        <div
          className={`md:hidden border-t border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <Link
              to="/stock"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              } ${
                isActive('/stock')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{ transitionDelay: mobileMenuOpen ? '50ms' : '0ms' }}
            >
              <Package className="w-5 h-5" />
              Mon Stock
            </Link>
            <Link
              to="/sales"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              } ${
                isActive('/sales')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{ transitionDelay: mobileMenuOpen ? '100ms' : '0ms' }}
            >
              <ShoppingBag className="w-5 h-5" />
              Mes Ventes
            </Link>
            <Link
              to="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              } ${
                isActive('/planner')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{ transitionDelay: mobileMenuOpen ? '150ms' : '0ms' }}
            >
              <Calendar className="w-5 h-5" />
              Planificateur
            </Link>
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              } ${
                isActive('/analytics')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{ transitionDelay: mobileMenuOpen ? '200ms' : '0ms' }}
            >
              <BarChart3 className="w-5 h-5" />
              Statistiques
            </Link>

            <div className="border-t border-gray-200 my-2 pt-2">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                  mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                } text-gray-700 hover:bg-gray-50`}
                style={{ transitionDelay: mobileMenuOpen ? '250ms' : '0ms' }}
              >
                <Settings className="w-5 h-5" />
                Paramètres
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 transform ${
                  mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                } text-gray-700 hover:bg-gray-50`}
                style={{ transitionDelay: mobileMenuOpen ? '300ms' : '0ms' }}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {user?.email ? getInitials(user.email) : 'U'}
                  </span>
                </div>
                Mon Profil
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
