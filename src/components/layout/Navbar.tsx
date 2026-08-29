import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Flame, Moon, Sun, LogOut, User as UserIcon, Settings, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { user, userProfile, signOutUser, updatePreferences } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const streak = userProfile?.streak?.current || 1;
  const isDark = userProfile?.preferences?.theme !== 'light';

  const toggleTheme = () => {
    updatePreferences({ theme: isDark ? 'light' : 'dark' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              id="mobile-menu-toggle-btn"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-teal-400 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Reflect<span className="text-sky-400">AI</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right side items */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reflection Streak Pill */}
            <div
              title={`${streak} consecutive reflection day${streak === 1 ? '' : 's'}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{streak}d streak</span>
            </div>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle visual theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
            </button>

            {/* User Profile Avatar / Dropdown */}
            <div className="relative">
              <button
                id="user-profile-menu-button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-full border border-slate-800 hover:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                aria-expanded={profileDropdownOpen}
                aria-label="Open user profile menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Avatar'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {(user.displayName || user.email || 'U').charAt(0)}
                  </div>
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {userProfile?.displayName || user.displayName || 'Reflective Writer'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <button
                      id="menu-settings-btn"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onSelectTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account &amp; Preferences</span>
                    </button>

                    <button
                      id="menu-signout-btn"
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await signOutUser();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline-block">Private &amp; Authenticated</span>
          </div>
        )}
      </div>
    </header>
  );
};
