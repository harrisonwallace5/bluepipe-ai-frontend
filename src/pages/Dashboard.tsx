import { useQuery } from '@tanstack/react-query';
import { Activity, CircleGauge, FileChartColumnIncreasing, GitBranch, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/StatCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatRelativeTime, getAnalysisHistory, getDashboardStats } from '@/lib/api';
import { cn } from '@/lib/utils';

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-10 w-24" />
            <Skeleton className="mt-6 h-4 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-card p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-2 h-4 w-44" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: getAnalysisHistory,
  });
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  if (historyQuery.isLoading || statsQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  if (historyQuery.isError || statsQuery.isError) {
    const error = historyQuery.error ?? statsQuery.error;
    return (
      <Alert variant="destructive">
        <Activity className="h-4 w-4" />
        <AlertTitle>Dashboard unavailable</AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : 'The dashboard could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const history = historyQuery.data ?? [];
  const stats = statsQuery.data;
  const totalFindings = stats.pipesFound + stats.valvesFound + stats.instrumentsFound;
  const detectionMix = [
    { label: 'Pipes', value: stats.pipesFound },
    { label: 'Valves', value: stats.valvesFound },
    { label: 'Instruments', value: stats.instrumentsFound },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Analyses run"
          value={String(stats.analysesRun)}
          trend={`${stats.recentAnalyses} completed in the last 7 days`}
          icon={FileChartColumnIncreasing}
        />
        <StatCard
          label="Pipes found"
          value={String(stats.pipesFound)}
          trend={stats.analysesRun ? `${Math.round(stats.pipesFound / stats.analysesRun)} avg per analysis` : 'Available after first upload'}
          icon={GitBranch}
        />
        <StatCard
          label="Valves found"
          value={String(stats.valvesFound)}
          trend={stats.analysesRun ? `${Math.round(stats.valvesFound / stats.analysesRun)} avg per analysis` : 'Available after first upload'}
          icon={Waves}
        />
        <StatCard
          label="Accuracy"
          value={stats.accuracy === null ? '--' : `${stats.accuracy}%`}
          trend={stats.accuracy === null ? 'Waiting for model confidence data' : 'Average confidence across completed runs'}
          icon={CircleGauge}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Recent analyses</h3>
              <p className="mt-1 text-sm text-slate-600">Reopen a processed sheet or review the latest extraction totals.</p>
            </div>
            <Link to="/history" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 rounded-2xl px-4')}>
              View all history
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {history.length ? (
              history.slice(0, 3).map((analysis) => (
                <div key={analysis.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-950">{analysis.fileName}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(analysis.createdAt)} • {analysis.pageCount} page{analysis.pageCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{analysis.sourceType}</Badge>
                      <Badge variant="secondary">{analysis.tags.length} findings</Badge>
                    </div>
                  </div>

                  <Separator className="my-4 bg-gray-200" />

                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="font-medium text-slate-950">{analysis.metrics.pipesFound}</p>
                      <p>Pipes detected</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{analysis.metrics.valvesFound}</p>
                      <p>Valves detected</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{analysis.metrics.accuracy === null ? '--' : `${analysis.metrics.accuracy}%`}</p>
                      <p>Model confidence</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{formatRelativeTime(analysis.createdAt)}</p>
                    <Link
                      to={`/results/${analysis.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl px-3')}
                    >
                      Open results
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <h4 className="text-base font-semibold text-slate-950">No analyses yet</h4>
                <p className="mt-2 text-sm text-slate-600">Start by uploading a P&amp;ID sheet to generate your first set of extracted tags.</p>
                <Link to="/upload" className={cn(buttonVariants({ size: 'lg' }), 'mt-5 inline-flex h-11 rounded-2xl px-4')}>
                  Upload a schematic
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <h3 className="text-lg font-semibold text-slate-950">Detection mix</h3>
            <p className="mt-1 text-sm text-slate-600">Category coverage across every saved analysis in this workspace.</p>

            <div className="mt-6 space-y-5">
              {detectionMix.map((item) => {
                const share = totalFindings ? Math.round((item.value / totalFindings) * 100) : 0;

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{item.value}</span>
                    </div>
                    <Progress value={share} className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:rounded-full [&_[data-slot=progress-indicator]]:rounded-full" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="surface-card p-6">
            <h3 className="text-lg font-semibold text-slate-950">Estimator snapshot</h3>
            <p className="mt-1 text-sm text-slate-600">Use this workspace to keep takeoff reviews moving without losing auditability.</p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-700">Upload queue</p>
                <p className="mt-1 text-sm text-slate-700">Ready for PDFs and raster sheets up to one file per run.</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Latest summary</p>
                <p className="mt-1 text-sm text-slate-600">
                  {history[0]?.summary ?? 'No analysis summary available yet. Upload a file to populate this feed.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
