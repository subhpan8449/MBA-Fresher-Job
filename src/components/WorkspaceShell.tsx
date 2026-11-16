import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Briefcase,
  CheckSquare,
  Database,
  FileSearch,
  ImageUp,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import type { AppPage } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface WorkspaceShellProps {
  currentPage: AppPage;
  userEmail: string;
  userName: string;
  isOwner: boolean;
  isSignedIn: boolean;
  isDark: boolean;
  unreadNotifications: number;
  onToggleTheme: () => void;
  onNavigate: (page: AppPage) => void;
  onOpenOcr: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  currentPage,
  userName,
  isOwner,
  isSignedIn,
  isDark,
  unreadNotifications,
  onToggleTheme,
  onNavigate,
  onOpenOcr,
  onSignIn,
  onSignOut,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: Array<{
    heading: string;
    items: Array<{ id: AppPage; label: string; icon: React.ReactNode; badge?: number }>;
  }> = [
    {
      heading: 'Primary Job Categories',
      items: [
        { id: 'finance', label: 'Finance Jobs (Priority)', icon: <TrendingUp className="h-4 w-4" /> },
        { id: 'sap-fico', label: 'SAP FICO Jobs', icon: <Database className="h-4 w-4" /> },
        { id: 'analytics', label: 'Business Analytics Jobs', icon: <BarChart3 className="h-4 w-4" /> },
        { id: 'marketing', label: 'Marketing Jobs', icon: <Megaphone className="h-4 w-4" /> },
      ],
    },
    {
      heading: 'Discovery & Overview',
      items: [
        { id: 'dashboard', label: 'Candidate Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'jobs', label: 'All India & Global Feed', icon: <Briefcase className="h-4 w-4" /> },
      ],
    },
    {
      heading: 'Career Assistant',
      items: [
        { id: 'resume', label: 'Resume Analyzer', icon: <FileSearch className="h-4 w-4" /> },
        { id: 'saved', label: 'Saved Jobs', icon: <Bookmark className="h-4 w-4" /> },
        { id: 'applications', label: 'Applications & Interviews', icon: <CheckSquare className="h-4 w-4" /> },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell className="h-4 w-4" />,
          badge: unreadNotifications,
        },
        { id: 'profile', label: 'Candidate Profile', icon: <User className="h-4 w-4" /> },
        { id: 'settings', label: 'Settings & Theme', icon: <Settings className="h-4 w-4" /> },
      ],
    },
  ];

  if (isOwner) {
    navGroups.push({
      heading: 'Owner Administration',
      items: [
        { id: 'owner', label: 'Owner Dashboard', icon: <Shield className="h-4 w-4" /> },
        { id: 'ai-control', label: 'AI Control Center', icon: <Bot className="h-4 w-4" /> },
        { id: 'sources', label: 'Data Sources', icon: <Database className="h-4 w-4" /> },
      ],
    });
  }

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#0B192C] px-4 py-5 text-slate-200">
      <div className="space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="text-left font-display text-base font-bold tracking-tight text-white"
          >
            MBA Fresher Blessing AI
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-slate-300 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {navGroups.map((group) => (
          <div key={group.heading}>
            <p className="px-2 text-[11px] font-semibold tracking-wide text-slate-400">
              {group.heading}
            </p>
            <nav className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="font-mono tabular-nums text-[11px] font-semibold text-blue-200">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onOpenOcr}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-950/50 px-3 py-2 text-xs font-medium text-blue-100 hover:bg-blue-900/60"
        >
          <ImageUp className="h-3.5 w-3.5" />
          <span>Upload Job Screenshot</span>
        </button>

        <div className="flex items-center justify-between px-1 text-xs">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="font-medium text-blue-300 hover:text-white"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070E1A] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 max-w-[85vw]">{renderSidebarContent()}</div>
          <div
            className="flex-1 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 lg:hidden dark:border-slate-700 dark:text-slate-200"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Workspace /{' '}
              <span className="capitalize text-slate-900 dark:text-white">
                {currentPage.replace('-', ' ')}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton compact />
            {isSignedIn ? (
              <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-300">
                {userName} {isOwner ? '(Owner)' : ''}
              </span>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};
