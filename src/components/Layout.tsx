import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu, Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const routeCopy = [
  {
    match: '/',
    title: 'Operations dashboard',
    description: 'Track throughput, extracted assets, and the latest P&ID review activity across your estimating pipeline.',
  },
  {
    match: '/upload',
    title: 'Upload P&ID package',
    description: 'Drop a PDF or image file, monitor upload progress, and send it to BluePipe AI for extraction.',
  },
  {
    match: '/results',
    title: 'Analysis results',
    description: 'Review extracted tags, filter findings, and export a clean CSV for estimating or QA workflows.',
  },
  {
    match: '/history',
    title: 'Analysis history',
    description: 'Browse previously processed sheets and reopen any result set from your saved workspace history.',
  },
];

function resolveRouteCopy(pathname: string) {
  const exact = routeCopy.find((item) => item.match === pathname);
  if (exact) {
    return exact;
  }

  if (pathname.startsWith('/results/')) {
    return routeCopy.find((item) => item.match === '/results')!;
  }

  return routeCopy[0];
}

function compactApiLabel(url: string | undefined) {
  if (!url) {
    return 'localhost:5000';
  }

  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const copy = resolveRouteCopy(location.pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-slate-600 transition hover:bg-gray-50 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{copy.title}</h2>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI powered
                  </Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{copy.description}</p>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <Badge variant="outline" className="h-9 rounded-full px-3 text-slate-600">
                API {compactApiLabel(import.meta.env.VITE_API_URL)}
              </Badge>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-slate-500">
                <Bell className="h-4 w-4" />
              </div>
              <Link to="/upload" className={cn(buttonVariants({ size: 'lg' }), 'rounded-2xl px-4')}>
                New analysis
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
