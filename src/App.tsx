import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import History from '@/pages/History';
import PhoneUsage from '@/pages/PhoneUsage';
import Results from '@/pages/Results';
import Upload from '@/pages/Upload';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="results" element={<Results />} />
            <Route path="results/:analysisId" element={<Results />} />
            <Route path="history" element={<History />} />
            <Route path="phone-usage" element={<PhoneUsage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
