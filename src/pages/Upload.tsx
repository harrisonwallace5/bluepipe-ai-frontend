import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileImage, FileText, LoaderCircle, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeDocument, formatDateTime, getLatestAnalysis } from '@/lib/api';
import { cn } from '@/lib/utils';

const acceptedFileTypes = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tif', '.tiff'],
};

function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dropError, setDropError] = useState<string | null>(null);

  const latestAnalysisQuery = useQuery({
    queryKey: ['latest-analysis'],
    queryFn: getLatestAnalysis,
  });

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(0);
      return analyzeDocument({
        file,
        onUploadProgress: (event) => {
          if (!event.total) {
            return;
          }

          setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        },
      });
    },
    onSuccess: (analysis) => {
      setUploadProgress(100);
      queryClient.setQueryData(['latest-analysis'], analysis);
      queryClient.setQueryData(['analysis', analysis.id], analysis);
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Analysis complete. Opening results.');
      navigate(`/results/${analysis.id}`);
    },
    onError: (error) => {
      setUploadProgress(0);
      toast.error(error instanceof Error ? error.message : 'The upload failed.');
    },
  });

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxFiles: 1,
    multiple: false,
    onDrop: (acceptedFiles, fileRejections) => {
      if (fileRejections.length) {
        setSelectedFile(null);
        setDropError('Only PDF, PNG, JPG, JPEG, TIF, and TIFF files are supported.');
        return;
      }

      if (acceptedFiles.length) {
        setSelectedFile(acceptedFiles[0]);
        setDropError(null);
      }
    },
  });

  function startAnalysis() {
    if (!selectedFile) {
      toast.error('Select a file before starting analysis.');
      return;
    }

    analysisMutation.mutate(selectedFile);
  }

  const errorMessage = analysisMutation.error instanceof Error ? analysisMutation.error.message : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="surface-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">New upload</h3>
              <p className="mt-1 text-sm text-slate-600">Drop a P&amp;ID PDF or image and send it to BluePipe AI for extraction.</p>
            </div>
            <Badge variant="secondary">POST /api/analyze</Badge>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              'mt-6 rounded-[28px] border border-dashed bg-gray-50 p-8 text-center transition',
              isDragActive ? 'border-blue-500 bg-blue-50/70' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40',
            )}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h4 className="mt-5 text-lg font-semibold text-slate-950">
              {isDragActive ? 'Drop the file here' : 'Drag and drop your schematic'}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accepted formats: PDF, PNG, JPG, JPEG, TIF, TIFF. Upload one sheet package at a time.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                {selectedFile?.type === 'application/pdf' ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">{selectedFile?.name ?? 'No file selected'}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Choose a supported file to begin analysis.'}
                </p>
              </div>
            </div>

            <Separator className="my-5 bg-gray-200" />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                className="h-11 rounded-2xl px-4"
                disabled={!selectedFile || analysisMutation.isPending}
                onClick={startAnalysis}
              >
                {analysisMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {analysisMutation.isPending ? 'Analyzing...' : 'Start analysis'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 rounded-2xl px-4"
                onClick={() => {
                  setSelectedFile(null);
                  setDropError(null);
                }}
              >
                Clear selection
              </Button>
            </div>
          </div>
        </div>

        {(dropError || errorMessage) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{dropError ?? errorMessage}</AlertDescription>
          </Alert>
        )}

        {analysisMutation.isPending && (
          <div className="surface-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Processing upload</h3>
                <p className="mt-1 text-sm text-slate-600">BluePipe AI is transferring the file and preparing extraction results.</p>
              </div>
              <Badge variant="secondary">{uploadProgress}%</Badge>
            </div>
            <div className="mt-6">
              <Progress
                value={uploadProgress}
                className="[&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-track]]:rounded-full [&_[data-slot=progress-indicator]]:rounded-full"
              />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/6" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="surface-card p-6">
          <h3 className="text-lg font-semibold text-slate-950">What BluePipe extracts</h3>
          <p className="mt-1 text-sm text-slate-600">Use the results table to review every tagged asset before exporting to downstream estimating workflows.</p>

          <div className="mt-6 grid gap-4">
            {[
              {
                title: 'Pipes',
                description: 'Line tags, service types, and note fragments captured from the schematic.',
              },
              {
                title: 'Valves',
                description: 'Isolation, control, and specialty valves surfaced for review.',
              },
              {
                title: 'Instruments',
                description: 'Meters, sensors, and instrumentation details extracted from the drawing.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="text-lg font-semibold text-slate-950">Last saved analysis</h3>
          <p className="mt-1 text-sm text-slate-600">The most recent completed run stays available here even after you refresh the app.</p>

          <div className="mt-6">
            {latestAnalysisQuery.isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="mt-3 h-4 w-52" />
                <Skeleton className="mt-5 h-16 w-full rounded-2xl" />
              </div>
            ) : latestAnalysisQuery.isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>History unavailable</AlertTitle>
                <AlertDescription>
                  {latestAnalysisQuery.error instanceof Error
                    ? latestAnalysisQuery.error.message
                    : 'The last saved analysis could not be loaded.'}
                </AlertDescription>
              </Alert>
            ) : latestAnalysisQuery.data ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{latestAnalysisQuery.data.fileName}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatDateTime(latestAnalysisQuery.data.createdAt)}</p>
                  </div>
                  <Badge variant="outline">{latestAnalysisQuery.data.tags.length} findings</Badge>
                </div>
                <Separator className="my-4 bg-gray-200" />
                <p className="text-sm leading-6 text-slate-600">{latestAnalysisQuery.data.summary}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-slate-600">
                No saved analyses yet. Run the first upload to populate your history.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;
