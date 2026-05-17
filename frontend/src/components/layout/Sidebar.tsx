'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BookOpen,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Tags,
  UserCircle,
  Users,
} from 'lucide-react';
import { cn, siteName } from '@/lib/utils';

import type { Role } from '@/types/api.types';

const links: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'] },
  { href: '/dashboard/blogs', label: 'Blogs', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'] },
  { href: '/dashboard/files', label: 'Files', icon: FolderOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'] },
  { href: '/dashboard/tags', label: 'Tags', icon: Tags, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/comments', label: 'Comments', icon: MessageSquare, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/settings', label: 'API settings', icon: KeyRound, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/docs', label: 'API documentation', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'] },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-muted/40 lg:block">
      <div className="border-b border-border px-6 py-5">
        <Link href="/" className="text-lg font-semibold text-foreground">
          {siteName}
        </Link>
        <p className="text-sm text-muted-foreground">Editorial dashboard</p>
      </div>
      <nav className="space-y-1 p-4">
        {links
          .filter((link) => link.roles.includes(role))
          .map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-card/70',
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
