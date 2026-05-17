import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatRelativeDate(value?: string) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'My Blog';
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
