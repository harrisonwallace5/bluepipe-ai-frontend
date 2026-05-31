import axios, { type AxiosProgressEvent } from 'axios';

const STORAGE_KEY = 'bluepipe.analysis.history';

export interface AnalysisTag {
  id: string;
  tag: string;
  category: string;
  type: string;
  notes: string;
}

export interface AnalysisMetrics {
  pipesFound: number;
  valvesFound: number;
  instrumentsFound: number;
  accuracy: number | null;
}

export interface AnalysisRecord {
  id: string;
  fileName: string;
  createdAt: string;
  sourceType: string;
  status: 'completed' | 'failed';
  pageCount: number;
  tags: AnalysisTag[];
  metrics: AnalysisMetrics;
  summary: string;
  processingTimeMs: number | null;
}

export interface DashboardStats {
  analysesRun: number;
  pipesFound: number;
  valvesFound: number;
  accuracy: number | null;
  instrumentsFound: number;
  recentAnalyses: number;
}

interface AnalyzeDocumentOptions {
  file: File;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
}

type AnyObject = Record<string, unknown>;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  timeout: 60_000,
});

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function round(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function isObject(value: unknown): value is AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeAccuracy(value: unknown) {
  const parsed = toNumber(value, Number.NaN);
  if (Number.isNaN(parsed)) {
    return null;
  }

  if (parsed <= 1) {
    return round(parsed * 100);
  }

  return round(parsed);
}

function categoryFromKey(key: string) {
  if (key === 'pipes') {
    return 'Pipe';
  }

  if (key === 'valves') {
    return 'Valve';
  }

  if (key === 'instruments') {
    return 'Instrument';
  }

  return 'Asset';
}

function normalizeTag(rawTag: unknown, fallbackCategory: string, index: number): AnalysisTag {
  const raw = isObject(rawTag) ? rawTag : {};
  const tag =
    toText(raw.tag, '') ||
    toText(raw.label, '') ||
    toText(raw.name, '') ||
    `${fallbackCategory.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;

  return {
    id: toText(raw.id, `${fallbackCategory.toLowerCase()}-${index + 1}`),
    tag,
    category: toText(raw.category, fallbackCategory),
    type:
      toText(raw.type, '') ||
      toText(raw.kind, '') ||
      toText(raw.material, '') ||
      toText(raw.instrumentType, '') ||
      toText(raw.valveType, '') ||
      'Detected asset',
    notes:
      toText(raw.notes, '') ||
      toText(raw.note, '') ||
      toText(raw.description, '') ||
      toText(raw.service, '') ||
      toText(raw.location, '') ||
      'No notes captured.',
  };
}

function extractTags(payload: AnyObject) {
  const standaloneTags = Array.isArray(payload.tags)
    ? payload.tags.map((tag, index) => normalizeTag(tag, 'Asset', index))
    : [];

  const groupedTags = ['pipes', 'valves', 'instruments'].flatMap((key) => {
    const items = Array.isArray(payload[key]) ? payload[key] : [];
    return items.map((item, index) => normalizeTag(item, categoryFromKey(key), index));
  });

  return [...standaloneTags, ...groupedTags];
}

function buildSummary(tags: AnalysisTag[], metrics: AnalysisMetrics) {
  const segments = [
    `${metrics.pipesFound} pipe${metrics.pipesFound === 1 ? '' : 's'}`,
    `${metrics.valvesFound} valve${metrics.valvesFound === 1 ? '' : 's'}`,
    `${metrics.instrumentsFound} instrument${metrics.instrumentsFound === 1 ? '' : 's'}`,
  ];

  if (!tags.length) {
    return 'The analysis completed, but no tags were extracted from the file.';
  }

  return `BluePipe AI extracted ${segments.join(', ')} from the uploaded schematic.`;
}

function normalizeStoredRecord(record: unknown): AnalysisRecord | null {
  if (!isObject(record)) {
    return null;
  }

  const rawTags = Array.isArray(record.tags) ? record.tags : [];
  const tags = rawTags.map((tag, index) => normalizeTag(tag, 'Asset', index));
  const rawMetrics = isObject(record.metrics) ? record.metrics : {};
  const metrics: AnalysisMetrics = {
    pipesFound: toNumber(rawMetrics.pipesFound, tags.filter((tag) => tag.category.toLowerCase() === 'pipe').length),
    valvesFound: toNumber(rawMetrics.valvesFound, tags.filter((tag) => tag.category.toLowerCase() === 'valve').length),
    instrumentsFound: toNumber(
      rawMetrics.instrumentsFound,
      tags.filter((tag) => tag.category.toLowerCase() === 'instrument').length,
    ),
    accuracy: normalizeAccuracy(rawMetrics.accuracy),
  };

  return {
    id: toText(record.id, `analysis-${Date.now()}`),
    fileName: toText(record.fileName, 'Untitled analysis'),
    createdAt: toText(record.createdAt, new Date().toISOString()),
    sourceType: toText(record.sourceType, 'FILE'),
    status: toText(record.status, 'completed') === 'failed' ? 'failed' : 'completed',
    pageCount: Math.max(1, toNumber(record.pageCount, 1)),
    tags,
    metrics,
    summary: toText(record.summary, buildSummary(tags, metrics)),
    processingTimeMs: toNumber(record.processingTimeMs, 0) || null,
  };
}

function readHistory() {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const rawValue = storage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => normalizeStoredRecord(entry))
      .filter((entry): entry is AnalysisRecord => Boolean(entry))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  } catch {
    throw new Error('Saved BluePipe analysis history could not be read.');
  }
}

function writeHistory(history: AnalysisRecord[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function persistAnalysis(record: AnalysisRecord) {
  const nextHistory = [record, ...readHistory().filter((entry) => entry.id !== record.id)];
  writeHistory(nextHistory);
  return nextHistory;
}

function normalizeAnalysisResponse(fileName: string, responsePayload: unknown): AnalysisRecord {
  const payload = isObject(responsePayload)
    ? isObject(responsePayload.analysis)
      ? responsePayload.analysis
      : isObject(responsePayload.result)
        ? responsePayload.result
        : responsePayload
    : {};
  const summary = isObject(payload.summary) ? payload.summary : {};
  const tags = extractTags(payload);
  const pipesFound = toNumber(
    summary.pipesFound,
    tags.filter((tag) => tag.category.toLowerCase() === 'pipe').length,
  );
  const valvesFound = toNumber(
    summary.valvesFound,
    tags.filter((tag) => tag.category.toLowerCase() === 'valve').length,
  );
  const instrumentsFound = toNumber(
    summary.instrumentsFound,
    tags.filter((tag) => tag.category.toLowerCase() === 'instrument').length,
  );
  const metrics: AnalysisMetrics = {
    pipesFound,
    valvesFound,
    instrumentsFound,
    accuracy:
      normalizeAccuracy(summary.accuracy) ??
      normalizeAccuracy(summary.confidence) ??
      normalizeAccuracy(payload.accuracy) ??
      normalizeAccuracy(payload.confidence),
  };

  return {
    id:
      toText(payload.id, '') ||
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `analysis-${Date.now()}`),
    fileName,
    createdAt: toText(payload.createdAt, new Date().toISOString()),
    sourceType: toText(
      payload.sourceType,
      fileName.split('.').pop()?.toUpperCase() ?? 'FILE',
    ),
    status: 'completed',
    pageCount: Math.max(1, toNumber(summary.pageCount, toNumber(payload.pageCount, 1))),
    tags,
    metrics,
    summary:
      toText(summary.notes, '') ||
      toText(payload.summaryText, '') ||
      buildSummary(tags, metrics),
    processingTimeMs: toNumber(summary.processingTimeMs, toNumber(payload.processingTimeMs, 0)) || null,
  };
}

export async function analyzeDocument({ file, onUploadProgress }: AnalyzeDocumentOptions) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  const normalized = normalizeAnalysisResponse(file.name, response.data);
  persistAnalysis(normalized);
  return normalized;
}

export async function getAnalysisHistory() {
  return readHistory();
}

export async function getLatestAnalysis() {
  return readHistory()[0] ?? null;
}

export async function getAnalysisById(analysisId: string) {
  return readHistory().find((entry) => entry.id === analysisId) ?? null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const history = readHistory();
  const analysesRun = history.length;
  const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const accuracies = history.map((entry) => entry.metrics.accuracy).filter((value): value is number => value !== null);

  return {
    analysesRun,
    pipesFound: history.reduce((sum, entry) => sum + entry.metrics.pipesFound, 0),
    valvesFound: history.reduce((sum, entry) => sum + entry.metrics.valvesFound, 0),
    instrumentsFound: history.reduce((sum, entry) => sum + entry.metrics.instrumentsFound, 0),
    accuracy: accuracies.length ? round(accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length) : null,
    recentAnalyses: history.filter((entry) => Date.parse(entry.createdAt) >= recentThreshold).length,
  };
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const diffMs = Date.now() - Date.parse(value);
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
