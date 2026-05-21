import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm', padding && 'p-6', className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, color = 'bg-primary-50 text-primary-600', subtitle }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn('p-3 rounded-xl', color)}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  );
}
