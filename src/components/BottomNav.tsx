import { Home, Receipt, PlusCircle, Target, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/transactions', icon: Receipt, label: 'Txns' },
  { path: '/budgets', icon: PlusCircle, label: 'Budget', isCenter: true },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 bg-card/95 backdrop-blur-xl border-t border-border/50">
      <div className="flex min-h-[80px] items-center justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                tab.isCenter ? '' : active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.isCenter ? (
                <div className="gradient-primary rounded-full p-2.5 -mt-4 shadow-lg glow">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 gradient-primary rounded-full"
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
