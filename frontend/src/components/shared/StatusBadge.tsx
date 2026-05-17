import { cn } from '@/lib/utils';
import type { BlogStatus } from '@/types/api.types';

const statusStyles: Record<BlogStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SUBMITTED_FOR_REVIEW: 'bg-blue-100 text-blue-700',
  REVIEWED: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-teal-100 text-teal-800',
  PUBLISHED: 'bg-green-100 text-green-700',
  UNPUBLISHED: 'bg-orange-100 text-orange-800',
};

export function StatusBadge({ status }: { status: BlogStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        statusStyles[status],
      )}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
