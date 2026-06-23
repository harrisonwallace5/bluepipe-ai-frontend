import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Plus, Send, Settings2, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_GOALS,
  type DailyUsageData,
  type UsageCategory,
  type UsageGoal,
  addUsageEntry,
  formatMinutes,
  generateDailyReview,
  getCategoryTotal,
  getTodayUsage,
  removeUsageEntry,
  saveGoals,
} from '@/lib/phone-usage';

const CATEGORY_BADGE_CLASS: Record<UsageCategory | 'total', string> = {
  total: 'bg-blue-100 text-blue-700',
  social: 'bg-pink-100 text-pink-700',
  entertainment: 'bg-purple-100 text-purple-700',
  productivity: 'bg-green-100 text-green-700',
  health: 'bg-teal-100 text-teal-700',
  other: 'bg-slate-100 text-slate-700',
};

const PROGRESS_CLASS: Record<UsageCategory | 'total', string> = {
  total: '[&_[data-slot=progress-indicator]]:bg-blue-500',
  social: '[&_[data-slot=progress-indicator]]:bg-pink-500',
  entertainment: '[&_[data-slot=progress-indicator]]:bg-purple-500',
  productivity: '[&_[data-slot=progress-indicator]]:bg-green-500',
  health: '[&_[data-slot=progress-indicator]]:bg-teal-500',
  other: '[&_[data-slot=progress-indicator]]:bg-slate-500',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_QUESTIONS = [
  'How did I do today?',
  'How was my social media?',
  'What was my total screen time?',
  'How was my entertainment?',
];

function GoalRow({
  goal,
  onChange,
}: {
  goal: UsageGoal;
  onChange: (category: UsageGoal['category'], minutes: number) => void;
}) {
  const [raw, setRaw] = useState(String(goal.limitMinutes));

  function commit(val: string) {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n) && n > 0) onChange(goal.category, n);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-slate-700">{CATEGORY_LABELS[goal.category]}</span>
      <Input
        type="number"
        min={1}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => commit(raw)}
        className="w-24 rounded-xl text-sm"
      />
      <span className="text-sm text-slate-500">min</span>
      <span className="text-xs text-slate-400">({formatMinutes(parseInt(raw, 10) || goal.limitMinutes)})</span>
    </div>
  );
}

export default function PhoneUsage() {
  const [data, setData] = useState<DailyUsageData>(getTodayUsage);
  const [appName, setAppName] = useState('');
  const [category, setCategory] = useState<UsageCategory>('social');
  const [minutes, setMinutes] = useState(15);
  const [showGoals, setShowGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState<UsageGoal[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: "Hey! Log your phone sessions above and ask me at any time how you're doing." },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleAddEntry() {
    if (!appName.trim()) return;
    const next = addUsageEntry({ appName: appName.trim(), category, minutes });
    setData(next);
    setAppName('');
    setMinutes(15);
  }

  function handleRemoveEntry(id: string) {
    setData(removeUsageEntry(id));
  }

  function openGoals() {
    setGoalDraft(
      data.goals.length > 0
        ? data.goals
        : DEFAULT_GOALS,
    );
    setShowGoals(true);
  }

  function handleGoalChange(cat: UsageGoal['category'], limitMinutes: number) {
    setGoalDraft((prev) =>
      prev.map((g) => (g.category === cat ? { ...g, limitMinutes } : g)),
    );
  }

  function handleSaveGoals() {
    const next = saveGoals(goalDraft);
    setData(next);
    setShowGoals(false);
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    const reply = generateDailyReview(data, trimmed);
    const assistantMsg: ChatMessage = { role: 'assistant', text: reply };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput('');
  }

  const totalMinutes = getCategoryTotal(data.entries, 'total');
  const totalGoal = data.goals.find((g) => g.category === 'total');
  const goalsWithData = data.goals.filter((g) => g.category !== 'total');
  const activeGoals = data.goals;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-950">{formatMinutes(totalMinutes)}</span>
            {totalGoal && (
              <span className="text-sm text-slate-500">
                of {formatMinutes(totalGoal.limitMinutes)} goal
                {totalMinutes > totalGoal.limitMinutes && (
                  <span className="ml-1 font-semibold text-red-600">
                    (+{formatMinutes(totalMinutes - totalGoal.limitMinutes)})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openGoals}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-gray-50"
        >
          <Settings2 className="h-4 w-4" />
          Goals
        </button>
      </div>

      {/* Goals progress bars */}
      {activeGoals.length > 0 && (
        <div className="surface-card p-5 space-y-4">
          {activeGoals.map((goal) => {
            const actual = getCategoryTotal(data.entries, goal.category);
            const pct = Math.min(Math.round((actual / goal.limitMinutes) * 100), 100);
            const over = actual > goal.limitMinutes;
            return (
              <div key={goal.category}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{CATEGORY_LABELS[goal.category]}</span>
                  <span className={over ? 'font-semibold text-red-600' : 'text-slate-500'}>
                    {formatMinutes(actual)} / {formatMinutes(goal.limitMinutes)}
                  </span>
                </div>
                <Progress
                  value={pct}
                  className={`[&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-track]]:rounded-full [&_[data-slot=progress-indicator]]:rounded-full ${PROGRESS_CLASS[goal.category]} ${over ? '[&_[data-slot=progress-indicator]]:bg-red-500' : ''}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Log entry */}
      <div className="surface-card p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-950">Log a session</h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="app-name" className="text-sm text-slate-700">App name</Label>
            <Input
              id="app-name"
              placeholder="Instagram, YouTube, Gmail…"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700">Category</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    category === cat
                      ? CATEGORY_BADGE_CLASS[cat] + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="minutes" className="text-sm text-slate-700">Minutes spent</Label>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMinutes((m) => Math.max(1, m - 5))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-slate-600 transition hover:bg-gray-50 text-lg font-semibold"
              >
                −
              </button>
              <Input
                id="minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 rounded-xl text-center text-base font-semibold"
              />
              <button
                type="button"
                onClick={() => setMinutes((m) => m + 5)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-slate-600 transition hover:bg-gray-50 text-lg font-semibold"
              >
                +
              </button>
              <span className="text-sm text-slate-500">= {formatMinutes(minutes)}</span>
            </div>
          </div>

          <Button
            onClick={handleAddEntry}
            disabled={!appName.trim()}
            className="w-full rounded-2xl h-11 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        </div>
      </div>

      {/* Today's entries */}
      {data.entries.length > 0 && (
        <div className="surface-card p-5 space-y-3">
          <h3 className="text-base font-semibold text-slate-950">Today's sessions</h3>
          <div className="space-y-2">
            {[...data.entries].reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-950 truncate">{entry.appName}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE_CLASS[entry.category]}`}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{formatMinutes(entry.minutes)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily review chat */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-slate-950">Daily review</h3>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-slate-800 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask about your usage…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(chatInput)}
            className="rounded-2xl flex-1"
          />
          <Button
            onClick={() => sendMessage(chatInput)}
            disabled={!chatInput.trim()}
            size="icon"
            className="rounded-2xl h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Goals modal */}
      {showGoals && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4 pb-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-950">Daily limits</h3>
              <button
                type="button"
                onClick={() => setShowGoals(false)}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {goalDraft.map((goal) => (
                <GoalRow key={goal.category} goal={goal} onChange={handleGoalChange} />
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setShowGoals(false)} className="flex-1 rounded-2xl">
                Cancel
              </Button>
              <Button onClick={handleSaveGoals} className="flex-1 rounded-2xl">
                Save goals
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
