import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
}

function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        <span>{trend}</span>
      </div>
    </div>
  );
}

export default StatCard;
