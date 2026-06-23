export type UsageCategory = 'social' | 'entertainment' | 'productivity' | 'health' | 'other';

export interface UsageEntry {
  id: string;
  appName: string;
  category: UsageCategory;
  minutes: number;
  loggedAt: string;
}

export interface UsageGoal {
  category: UsageCategory | 'total';
  limitMinutes: number;
}

export interface DailyUsageData {
  date: string;
  entries: UsageEntry[];
  goals: UsageGoal[];
}

const USAGE_KEY = 'bluepipe.phone.usage';

export const DEFAULT_GOALS: UsageGoal[] = [
  { category: 'total', limitMinutes: 120 },
  { category: 'social', limitMinutes: 30 },
  { category: 'entertainment', limitMinutes: 60 },
];

export const CATEGORY_LABELS: Record<UsageCategory | 'total', string> = {
  total: 'Total screen time',
  social: 'Social media',
  entertainment: 'Entertainment',
  productivity: 'Productivity',
  health: 'Health & fitness',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<UsageCategory | 'total', string> = {
  total: 'blue',
  social: 'pink',
  entertainment: 'purple',
  productivity: 'green',
  health: 'teal',
  other: 'slate',
};

export const ALL_CATEGORIES: UsageCategory[] = ['social', 'entertainment', 'productivity', 'health', 'other'];

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function readAllData(): Record<string, DailyUsageData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllData(data: Record<string, DailyUsageData>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

function carryOverGoals(all: Record<string, DailyUsageData>): UsageGoal[] {
  const keys = Object.keys(all).sort().reverse();
  return keys.length > 0 ? all[keys[0]].goals : DEFAULT_GOALS;
}

export function getTodayUsage(): DailyUsageData {
  const all = readAllData();
  const today = getTodayKey();
  if (!all[today]) {
    return { date: today, entries: [], goals: carryOverGoals(all) };
  }
  return all[today];
}

export function addUsageEntry(entry: Omit<UsageEntry, 'id' | 'loggedAt'>): DailyUsageData {
  const all = readAllData();
  const today = getTodayKey();
  const data: DailyUsageData = all[today] ?? { date: today, entries: [], goals: carryOverGoals(all) };
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `entry-${Date.now()}`;
  data.entries = [...data.entries, { ...entry, id, loggedAt: new Date().toISOString() }];
  all[today] = data;
  writeAllData(all);
  return data;
}

export function removeUsageEntry(entryId: string): DailyUsageData {
  const all = readAllData();
  const today = getTodayKey();
  if (!all[today]) return getTodayUsage();
  all[today].entries = all[today].entries.filter((e) => e.id !== entryId);
  writeAllData(all);
  return all[today];
}

export function saveGoals(goals: UsageGoal[]): DailyUsageData {
  const all = readAllData();
  const today = getTodayKey();
  const data: DailyUsageData = all[today] ?? { date: today, entries: [], goals };
  data.goals = goals;
  all[today] = data;
  writeAllData(all);
  return data;
}

export function getCategoryTotal(entries: UsageEntry[], category: UsageCategory | 'total'): number {
  if (category === 'total') return entries.reduce((sum, e) => sum + e.minutes, 0);
  return entries.filter((e) => e.category === category).reduce((sum, e) => sum + e.minutes, 0);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function generateDailyReview(data: DailyUsageData, question: string): string {
  const { entries, goals } = data;

  if (entries.length === 0) {
    return "You haven't logged any phone usage today yet. Add your first session above to start tracking!";
  }

  const totalMinutes = getCategoryTotal(entries, 'total');
  const totalGoal = goals.find((g) => g.category === 'total');

  const categoryTotals = Object.fromEntries(
    (['total', ...ALL_CATEGORIES] as (UsageCategory | 'total')[]).map((cat) => [cat, getCategoryTotal(entries, cat)]),
  ) as Record<UsageCategory | 'total', number>;

  const appTotals = entries.reduce<Record<string, { minutes: number; category: UsageCategory }>>((acc, e) => {
    if (!acc[e.appName]) acc[e.appName] = { minutes: 0, category: e.category };
    acc[e.appName].minutes += e.minutes;
    return acc;
  }, {});
  const topApps = Object.entries(appTotals).sort((a, b) => b[1].minutes - a[1].minutes).slice(0, 3);

  const wins: string[] = [];
  const struggles: string[] = [];
  for (const goal of goals) {
    const actual = categoryTotals[goal.category] ?? 0;
    const label = CATEGORY_LABELS[goal.category];
    if (actual <= goal.limitMinutes) {
      wins.push(`${label}: ${formatMinutes(actual)} of ${formatMinutes(goal.limitMinutes)} limit`);
    } else {
      struggles.push(`${label}: ${formatMinutes(actual - goal.limitMinutes)} over your ${formatMinutes(goal.limitMinutes)} limit`);
    }
  }

  const lowerQ = question.toLowerCase();

  if (lowerQ.includes('social') && !lowerQ.includes('how did')) {
    const socialMinutes = categoryTotals['social'];
    const socialGoal = goals.find((g) => g.category === 'social');
    let res = `Social media today: ${formatMinutes(socialMinutes)}`;
    if (socialGoal) {
      res += socialMinutes <= socialGoal.limitMinutes
        ? ` — under your ${formatMinutes(socialGoal.limitMinutes)} limit. Nice!`
        : ` — ${formatMinutes(socialMinutes - socialGoal.limitMinutes)} over your ${formatMinutes(socialGoal.limitMinutes)} goal.`;
    }
    const socialApps = entries.filter((e) => e.category === 'social');
    if (socialApps.length > 0) {
      const byApp = socialApps.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.appName]: (acc[e.appName] ?? 0) + e.minutes }), {});
      res += '\n\nBreakdown:\n' + Object.entries(byApp).sort((a, b) => b[1] - a[1]).map(([n, m]) => `• ${n}: ${formatMinutes(m)}`).join('\n');
    }
    return res;
  }

  if ((lowerQ.includes('entertain') || lowerQ.includes('youtube') || lowerQ.includes('netflix')) && !lowerQ.includes('how did')) {
    const entMinutes = categoryTotals['entertainment'];
    const entGoal = goals.find((g) => g.category === 'entertainment');
    let res = `Entertainment today: ${formatMinutes(entMinutes)}`;
    if (entGoal) {
      res += entMinutes <= entGoal.limitMinutes
        ? ` — within your ${formatMinutes(entGoal.limitMinutes)} limit.`
        : ` — ${formatMinutes(entMinutes - entGoal.limitMinutes)} over your ${formatMinutes(entGoal.limitMinutes)} goal.`;
    }
    return res;
  }

  if ((lowerQ.includes('total') || lowerQ.includes('screen time') || lowerQ.includes('overall')) && !lowerQ.includes('how did')) {
    let res = `Total screen time today: ${formatMinutes(totalMinutes)}`;
    if (totalGoal) {
      const pct = Math.round((totalMinutes / totalGoal.limitMinutes) * 100);
      res += ` — ${pct}% of your ${formatMinutes(totalGoal.limitMinutes)} daily goal.`;
    }
    res += `\n\n${entries.length} session${entries.length === 1 ? '' : 's'} across ${Object.keys(appTotals).length} app${Object.keys(appTotals).length === 1 ? '' : 's'}.`;
    return res;
  }

  // Default: full day review
  const pctLabel = totalGoal ? ` (${Math.round((totalMinutes / totalGoal.limitMinutes) * 100)}% of your ${formatMinutes(totalGoal.limitMinutes)} goal)` : '';
  let res = `Here's your screen time recap for today:\n\nTotal: ${formatMinutes(totalMinutes)}${pctLabel}\n\n`;

  if (topApps.length > 0) {
    res += `Top apps:\n${topApps.map(([name, { minutes }]) => `• ${name}: ${formatMinutes(minutes)}`).join('\n')}\n\n`;
  }

  if (wins.length > 0) {
    res += `Wins:\n${wins.map((w) => `• ${w}`).join('\n')}\n\n`;
  }

  if (struggles.length > 0) {
    res += `Areas to work on:\n${struggles.map((s) => `• ${s}`).join('\n')}\n\n`;
  }

  if (struggles.length === 0) {
    res += `You stayed within all your limits today — great discipline!`;
  } else if (struggles.length === 1) {
    res += `One area went over today. You're close — try trimming 10–15 minutes there tomorrow.`;
  } else {
    res += `A few categories went over. Consider setting app timers or putting your phone down during focused blocks.`;
  }

  return res;
}
