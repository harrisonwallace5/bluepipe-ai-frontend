import { ClipboardCheck, Clock3, Home, Menu, Upload } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    label: 'Home',
    description: 'Portfolio overview',
    to: '/',
    icon: Home,
  },
  {
    label: 'Upload',
    description: 'Analyze a new sheet',
    to: '/upload',
    icon: Upload,
  },
  {
    label: 'Results',
    description: 'Latest extraction',
    to: '/results',
    icon: ClipboardCheck,
  },
  {
    label: 'History',
    description: 'Past analyses',
    to: '/history',
    icon: Clock3,
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-gray-200 bg-white px-5 py-6 shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Menu className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">BluePipe AI</p>
                <h1 className="text-lg font-semibold text-slate-950">P&amp;ID Copilot</h1>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-gray-200 p-2 text-slate-500 transition hover:bg-gray-50 lg:hidden"
            onClick={onClose}
          >
            <span className="sr-only">Close sidebar</span>
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
          <p className="text-sm font-semibold text-slate-950">Contractor workflow</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload PDFs or raster sheets, review extracted tags, and track every completed analysis in one workspace.
          </p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 transition',
                    isActive
                      ? 'border-blue-100 bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:border-gray-200 hover:bg-gray-50 hover:text-slate-950',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition',
                        isActive ? 'bg-white text-blue-700 shadow-sm' : 'bg-gray-100 text-slate-500 group-hover:bg-white',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <p className="truncate text-xs text-slate-500">{item.description}</p>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Supported formats</p>
          <p className="mt-3 text-sm text-slate-700">PDF, PNG, JPG, JPEG, TIF, TIFF</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
