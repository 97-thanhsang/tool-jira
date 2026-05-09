'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  FolderOpen,
  Settings,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth, getStoredUser } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/board',    label: 'My Board',  icon: LayoutDashboard },
  { href: '/issues',   label: 'My Issues', icon: ListTodo },
  { href: '/projects', label: 'Projects',  icon: FolderOpen },
  { href: '/settings', label: 'Settings',  icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getStoredUser() as {
    displayName?: string;
    emailAddress?: string;
  } | null;

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  function handleLogout() {
    clearAuth();
    router.replace('/login');
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

        {/* Nav */}
        <nav className="flex-1 py-3">
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
