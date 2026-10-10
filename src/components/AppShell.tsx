import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  Home,
  Bot,
  MessageSquare,
  Target,
  UserCircle,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 5 Concise Nav Links | Zone 3 Primary Action */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <Link
          to="/home"
          className="text-lg font-bold tracking-tight text-blue-700 font-display whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
          PeerConnect AI
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link
            to="/home"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            to="/ai-agent"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4" />
            AI Agent
          </Link>
          <Link
            to="/chats"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            Chats & Video
          </Link>
          <Link
            to="/role-dashboard"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Target className="w-4 h-4" />
            Role Dashboard
          </Link>
          <Link
            to="/profile"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-blue-700"
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
              <span className="max-w-[120px] truncate">{user.username || user.name}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <Link
          to="/home"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          Home
        </Link>
        <Link
          to="/ai-agent"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          AI Agent
        </Link>
        <Link
          to="/chats"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          Chats & Video
        </Link>
        <Link
          to="/role-dashboard"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          Role Dashboard
        </Link>
        <Link
          to="/profile"
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          Profile
        </Link>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
