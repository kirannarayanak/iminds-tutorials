import { cn } from '@/lib/utils';

type Color = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  color?: Color;
  className?: string;
}

const colors: Record<Color, string> = {
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-blue-100 text-blue-700',
  gray:   'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    paid:     { label: 'Paid', color: 'green' },
    pending:  { label: 'Pending', color: 'yellow' },
    failed:   { label: 'Failed', color: 'red' },
    refunded: { label: 'Refunded', color: 'gray' },
  };
  const s = map[status] || { label: status, color: 'gray' as Color };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, Color> = { admin: 'purple', teacher: 'blue', student: 'green' };
  return <Badge color={map[role] || 'gray'}>{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>;
}
