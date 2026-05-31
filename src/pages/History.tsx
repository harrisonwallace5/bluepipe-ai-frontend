import { useQuery } from '@tanstack/react-query';
import { AlertCircle, History as HistoryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatRelativeTime, getAnalysisHistory } from '@/lib/api';
import { cn } from '@/lib/utils';

function HistoryLoadingState() {
  return (
    <div className="surface-card p-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function History() {
  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: getAnalysisHistory,
  });

  if (historyQuery.isLoading) {
    return <HistoryLoadingState />;
  }

  if (historyQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>History unavailable</AlertTitle>
        <AlertDescription>{historyQuery.error instanceof Error ? historyQuery.error.message : 'The analysis history could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const history = historyQuery.data ?? [];

  if (!history.length) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
          <HistoryIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-950">No saved history yet</h3>
        <p className="mt-2 text-sm text-slate-600">Completed uploads are stored locally so you can revisit extracted tags after refresh.</p>
        <Link to="/upload" className={cn(buttonVariants({ size: 'lg' }), 'mt-5 inline-flex h-11 rounded-2xl px-4')}>
          Start the first analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Saved analysis history</h3>
          <p className="mt-1 text-sm text-slate-600">Review every completed upload and reopen any set of extracted findings.</p>
        </div>
        <Badge variant="secondary">{history.length} total analyses</Badge>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-4">Analysis</TableHead>
              <TableHead className="px-4">Completed</TableHead>
              <TableHead className="px-4">Findings</TableHead>
              <TableHead className="px-4">Accuracy</TableHead>
              <TableHead className="px-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((analysis) => (
              <TableRow key={analysis.id}>
                <TableCell className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-950">{analysis.fileName}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline">{analysis.sourceType}</Badge>
                      <Badge variant={analysis.status === 'completed' ? 'secondary' : 'destructive'}>{analysis.status}</Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-slate-600">
                  <p>{formatDateTime(analysis.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(analysis.createdAt)}</p>
                </TableCell>
                <TableCell className="px-4 py-3 text-slate-600">
                  <p>{analysis.tags.length} tagged assets</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {analysis.metrics.pipesFound} pipes • {analysis.metrics.valvesFound} valves • {analysis.metrics.instrumentsFound} instruments
                  </p>
                </TableCell>
                <TableCell className="px-4 py-3 font-medium text-slate-950">
                  {analysis.metrics.accuracy === null ? '--' : `${analysis.metrics.accuracy}%`}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Link
                    to={`/results/${analysis.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl px-3')}
                  >
                    Open results
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default History;
