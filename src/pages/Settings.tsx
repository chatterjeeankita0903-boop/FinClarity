import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSettings, updateSettings, UserSettings } from '@/services/settings';
import { LogOut, User, Palette, Bell } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { user, logout } = useAuth();
  const [settings, setSettingsState] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (user) getSettings(user.id).then(setSettingsState);
  }, [user]);

  const handleUpdate = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const updated = await updateSettings(user.id, updates);
    setSettingsState(updated);
    toast.success('Settings saved');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
  };

  if (!settings) return null;

  return (
    <div className="px-4 pt-6 safe-bottom">
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>

      {/* Profile */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="glass-card p-4 mb-4">
        <label className="text-xs text-muted-foreground mb-2 block">Currency</label>
        <div className="flex gap-2">
          {['INR', 'USD', 'EUR', 'GBP'].map(c => (
            <button key={c} onClick={() => handleUpdate({ currency: c })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${settings.currency === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Dark Mode</span>
          </div>
          <button onClick={() => handleUpdate({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            className={`w-10 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-primary' : 'bg-secondary'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${settings.theme === 'dark' ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Notifications</span>
          </div>
          <button onClick={() => handleUpdate({ notifications_enabled: !settings.notifications_enabled })}
            className={`w-10 h-6 rounded-full transition-colors relative ${settings.notifications_enabled ? 'bg-primary' : 'bg-secondary'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${settings.notifications_enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full glass-card p-4 flex items-center gap-3 text-destructive">
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );
};

export default Settings;
