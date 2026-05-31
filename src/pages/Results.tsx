import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Download, Filter, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, getAnalysisById, getLatestAnalysis } from '@/lib/api';
import { cn } from '@/lib/utils';

function ResultsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="surface-card p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Results() {
  const { analysisId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const analysisQuery = useQuery({
    queryKey: ['analysis', analysisId ?? 'latest'],
    queryFn: () => (analysisId ? getAnalysisById(analysisId) : getLatestAnalysis()),
  });

  if (analysisQuery.isLoading) {
    return <ResultsLoadingState />;
  }

  if (analysisQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Results unavailable</AlertTitle>
        <AlertDescription>{analysisQuery.error instanceof Error ? analysisQuery.error.message : 'The analysis results could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const analysis = analysisQuery.data;

  if (!analysis) {
    return (
      <div className="surface-card p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-950">No results to display</h3>
        <p className="mt-2 text-sm text-slate-600">Upload a P&amp;ID file first, then return here to review extracted tags and export them.</p>
        <Link to="/upload" className={cn(buttonVariants({ size: 'lg' }), 'mt-5 inline-flex h-11 rounded-2xl px-4')}>
          Upload a file
        </Link>
      </div>
    );
  }

  const categories = ['All', ...new Set(analysis.tags.map((tag) => tag.category))];
  const filteredTags = analysis.tags.filter((tag) => {
    const categoryMatches = activeCategory === 'All' || tag.category === activeCategory;
    const searchableContent = `${tag.tag} ${tag.type} ${tag.notes}`.toLowerCase();
    const searchMatches = searchableContent.includes(searchTerm.toLowerCase());
    return categoryMatches && searchMatches;
  });

  function exportCsv() {
    if (!filteredTags.length) {
      return;
    }

    const lines = [
      ['Tag', 'Category', 'Type', 'Notes'].join(','),
      ...filteredTags.map((tag) =>
        [tag.tag, tag.category, tag.type, tag.notes]
          .map((value) => `"${value.replaceAll('"', '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${analysis.fileName.replace(/\.[^.]+$/, '') || 'bluepipe-results'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-950">{analysis.fileName}</h3>
              <Badge variant="secondary">{analysis.sourceType}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{formatDateTime(analysis.createdAt)} • {analysis.pageCount} page{analysis.pageCount === 1 ? '' : 's'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 rounded-2xl px-4')}
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <Link to="/upload" className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-2xl px-4')}>
              Analyze another file
            </Link>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">{analysis.summary}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-slate-500">Pipes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{analysis.metrics.pipesFound}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-slate-500">Valves</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{analysis.metrics.valvesFound}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-slate-500">Instruments</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{analysis.metrics.instrumentsFound}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-slate-500">Accuracy</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {analysis.metrics.accuracy === null ? '--' : `${analysis.metrics.accuracy}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Extracted tags</h3>
            <p className="mt-1 text-sm text-slate-600">Filter findings by category or search against tag, type, and notes.</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Filter className="h-3 w-3" />
            {filteredTags.length} visible
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="results-search">Search extracted findings</Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="results-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by tag, type, or notes"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition',
                    activeCategory === category
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700',
                  )}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-4">Tag</TableHead>
                <TableHead className="px-4">Category</TableHead>
                <TableHead className="px-4">Type</TableHead>
                <TableHead className="px-4">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.length ? (
                filteredTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="px-4 py-3 font-medium text-slate-950">{tag.tag}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant={tag.category === 'Valve' ? 'default' : tag.category === 'Instrument' ? 'outline' : 'secondary'}>
                        {tag.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-700">{tag.type}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal text-slate-600">{tag.notes}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No extracted tags match the current search and category filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default Results;
