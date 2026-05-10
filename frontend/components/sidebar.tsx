'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  FolderOpen,
  Search,
  Settings,
  ExternalLink,
  LogOut,
  Plus,
  Bell,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth, getStoredUser } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { href: '/board', label: 'My Board', icon: LayoutDashboard },
  { href: '/issues', label: 'My Issues', icon: ListTodo },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/worklog', label: 'Worklog', icon: Clock },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/search', label: 'JQL Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

type StoredUser = { displayName?: string; emailAddress?: string; name?: string } | null;

interface Notification {
  key: string;
  summary: string;
  updated: string;
}

interface SidebarProps {
  onCreateClick: () => void;
}

export function Sidebar({ onCreateClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');

  // Read localStorage only on client — avoids SSR/client hydration mismatch
  useEffect(() => {
    setUser(getStoredUser() as StoredUser);
  }, []);

  // Load last-seen timestamp for notifications
  useEffect(() => {
    const ts = localStorage.getItem('notif_last_seen') ?? new Date(0).toISOString();
    setLastSeen(ts);
  }, []);

  // Poll for recent updates every 60 seconds
  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const { api } = await import('@/lib/api');
        const since = localStorage.getItem('notif_last_seen') ?? '-15m';
        const jql = `assignee = currentUser() AND updated >= -15m AND resolution = Unresolved`;
        const res = await api.get<{ issues: Array<{ key: string; fields: { summary: string; updated: string } }> }>(
          '/search',
          { params: { jql, maxResults: 10, fields: 'summary,updated' } }
        );
        if (mounted) {
          const items = (res.data.issues ?? []).map((i) => ({
            key: i.key,
            summary: i.fields.summary,
            updated: i.fields.updated,
          }));
          setNotifications(items);
        }
      } catch {
        // Silently fail — notifications are non-critical
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  // Count notifications newer than lastSeen
  const unreadCount = notifications.filter((n) => n.updated > lastSeen).length;

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  function handleBellClick() {
    setNotifOpen((prev) => !prev);
    // Mark as seen
    const now = new Date().toISOString();
    localStorage.setItem('notif_last_seen', now);
    setLastSeen(now);
  }

  return (
    <TooltipProvider delay={300}>
      <aside className="w-[240px] min-h-screen bg-[#0052CC] flex flex-col text-white flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
              <span className="text-[#0052CC] font-bold text-sm">J</span>
            </div>
            <span className="font-semibold text-sm">Jira Power UI</span>
          </div>
        </div>

        {/* Create button */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 w-full px-3 py-2 bg-white text-[#0052CC] text-sm font-semibold rounded-md hover:bg-blue-50 transition-colors"
            title="Create issue (C)"
          >
            <Plus size={15} />
            Create
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}

          <a
            href="https://task.ascvn.com.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors mt-1"
          >
            <ExternalLink size={16} />
            Open Jira
          </a>
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-blue-700">
          {/* Notifications */}
          <div className="relative mb-2">
            <button
              onClick={handleBellClick}
              className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors text-xs w-full"
              title="Notifications"
            >
              <div className="relative">
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              Notifications
              {notifications.length > 0 && (
                <span className="ml-auto text-[10px] text-blue-300">
                  {notifications.length} recent
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notifOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-[#DFE1E6] z-50 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs text-[#5E6C84]">
                    No recent updates
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.key}
                      href={`/issues/${notif.key}`}
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-2 px-3 py-2.5 hover:bg-[#F4F5F7] border-b border-[#DFE1E6] last:border-b-0 transition-colors"
                    >
                      <span className="text-xs text-[#0052CC] font-medium flex-shrink-0 mt-0.5">
                        {notif.key}
                      </span>
                      <span className="text-xs text-[#172B4D] truncate flex-1">
                        {notif.summary}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-white/20 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {user?.displayName ?? 'User'}
              </p>
              <p className="text-xs text-blue-200 truncate">
                {user?.emailAddress ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-blue-200 hover:text-white transition-colors"
          >
            <LogOut size={12} />
            Log out
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
