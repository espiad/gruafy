'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function NavLinks({
  items,
  className,
  variant = 'side',
}: {
  items: NavItem[];
  className?: string;
  variant?: 'side' | 'bottom';
}) {
  const pathname = usePathname();
  return (
    <div className={className}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        if (variant === 'bottom') {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'focus-ring flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[11px] font-medium',
                active ? 'text-brand-orange' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-orange/15 text-brand-green'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
