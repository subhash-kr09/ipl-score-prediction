import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Check, ChevronRight, CircleHelp,
  Clock3, Crosshair, Database, Gauge, GitBranch, Info, Layers3, MapPin, Menu,
  RefreshCw, ShieldCheck, Swords, Target, TrendingUp, Trophy, X, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  useCreatePrediction, useGetPredictionModel, useGetPredictionOptions, useHealthCheck,
  type ModelDiagnostics, type Prediction, type PredictionInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const fallbackTeams = ['CSK', 'MI', 'RCB', 'RR', 'SRH', 'KKR', 'GT', 'DC', 'PBKS', 'LSG'];
const fallbackVenues = ['Wankhede Stadium', 'M. Chinnaswamy Stadium', 'Narendra Modi Stadium', 'MA Chidambaram Stadium', 'Eden Gardens'];

type FormValues = Omit<PredictionInput, 'targetScore'> & { targetScore: string };

const initialForm: FormValues = {
  battingTeam: fallbackTeams[0],
  bowlingTeam: fallbackTeams[1],
  venue: fallbackVenues[0],
  currentScore: 142,
  oversCompleted: 16.2,
  wicketsLost: 4,
  runsLast5Overs: 48,
  wicketsLast5Overs: 2,
  targetScore: '',
};

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: health } = useHealthCheck();
  const isLive = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <div className="app-shell min-h-[100dvh] text-slate-100">
      <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r px-5 py-6 transition-transform duration-300 md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-12 flex items-center gap-3">
          <div className="brand-mark relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[#07141d]">
            <Activity size={20} strokeWidth={2.5} />
            <span className="status-pip absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#09151f]" />
          </div>
          <div>
            <div className="display-font text-[17px] font-bold tracking-[-.04em] text-slate-100">Boundary Line</div>
            <div className="mono text-[9px] uppercase tracking-[.22em] text-slate-500">IPL forecast room</div>
          </div>
        </div>
        <div className="mb-3 px-3 mono text-[10px] uppercase tracking-[.2em] text-slate-600">Workspace</div>
        <nav className="space-y-1">
          <NavLink href="/" active={location === '/'} icon={<Gauge size={17} />} onClick={() => setMenuOpen(false)}>Live prediction</NavLink>
          <NavLink href="/model" active={location === '/model'} icon={<BarChart3 size={17} />} onClick={() => setMenuOpen(false)}>Model diagnostics</NavLink>
        </nav>
        <div className="mt-auto rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">System</span>
            <span className={`flex items-center gap-1.5 mono text-[10px] ${isLive ? 'text-[#43e5b0]' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#43e5b0]' : 'bg-slate-600'}`} /> {isLive ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>
          <div className="display-font text-sm text-slate-300">{isLive ? 'Forecast room connected.' : 'Waiting for forecast service.'}</div>
          <div className="mt-2 text-[11px] leading-relaxed text-slate-500">Inputs stay on this match. No future-over information is sent.</div>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close navigation" data-testid="button-close-menu" className="fixed inset-0 z-30 bg-[#020b12]/75 md:hidden" onClick={() => setMenuOpen(false)} />}
      <main className="min-h-[100dvh] md:pl-[264px]">
        <header className="topbar sticky top-0 z-20 flex h-[72px] items-center justify-between border-b px-5 backdrop-blur-xl md:px-10">
          <div className="flex items-center gap-3">
            <button data-testid="button-open-menu" aria-label="Open navigation" className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-slate-100 md:hidden" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
            <div className="hidden mono text-[10px] uppercase tracking-[.2em] text-slate-600 sm:block">Match-day control room <span className="mx-2 text-slate-800">/</span> 2025 season</div>
            <div className="mono text-[10px] uppercase tracking-[.2em] text-slate-500 sm:hidden">IPL / LIVE</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#43e5b0]/20 bg-[#43e5b0]/[.06] px-3 py-1.5 mono text-[10px] text-[#43e5b0] sm:flex">
              <span className="status-pip h-1.5 w-1.5 rounded-full" /> FEED CONNECTED
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[.1] bg-white/[.06] mono text-xs text-[#ffca62]">AN</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, active, icon, children, onClick }: { href: string; active: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <Link href={href} data-testid={`link-${href === '/' ? 'live-prediction' : 'model-diagnostics'}`} onClick={onClick} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${active ? 'nav-active font-semibold' : 'text-slate-400 hover:bg-white/[.055] hover:text-slate-100'}`}>
      {icon}<span>{children}</span>{active && <ChevronRight size={14} className="ml-auto" />}
    </Link>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="animate-rise">
        <div className="mb-3 flex items-center gap-2 mono text-[10px] uppercase tracking-[.22em] text-[#ffca62]"><span className="h-px w-5 bg-[#ffca62]" /> {eyebrow}</div>
        <h1 className="display-font text-3xl font-bold tracking-[-.055em] text-slate-50 sm:text-[40px]">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LoadingBlock({ label = 'Loading match data' }: { label?: string }) {
  return (
    <div className="glass-card flex min-h-[160px] animate-rise items-center justify-center rounded-2xl p-6">
      <div className="w-full max-w-[260px] text-center">
        <div className="skeleton mx-auto mb-4 h-2 w-28 rounded-full" />
        <div className="skeleton mx-auto mb-2 h-2 w-44 rounded-full" />
        <div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function QueryError({ onRetry, label = 'Could not load this feed.' }: { onRetry: () => void; label?: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-[#ef8578]/30 bg-[#ef8578]/[.06] p-6">
      <div className="text-center"><AlertTriangle className="mx-auto mb-3 text-[#ef8578]" size={22} /><p className="text-sm text-slate-300">{label}</p><button data-testid="button-retry" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[.12] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#ffca62] hover:text-[#ffca62]"><RefreshCw size={13} /> Retry connection</button></div>
    </div>
  );
}

function PredictionPage() {
  const optionsQuery = useGetPredictionOptions();
  const modelQuery = useGetPredictionModel();
  const predictionMutation = useCreatePrediction();
  const options = optionsQuery.data;
  const [form, setForm] = useState<FormValues>(initialForm);
  const [formError, setFormError] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const teams = options?.teams?.length ? options.teams : fallbackTeams;
  const venues = options?.venues?.length ? options.venues : fallbackVenues;
  const maxOvers = options?.maxOvers ?? 20;

  const update = (key: keyof FormValues, value: string | number) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const values = {
      ...form,
      currentScore: Number(form.currentScore),
      oversCompleted: Number(form.oversCompleted),
      wicketsLost: Number(form.wicketsLost),
      runsLast5Overs: Number(form.runsLast5Overs),
      wicketsLast5Overs: Number(form.wicketsLast5Overs),
      targetScore: form.targetScore === '' ? null : Number(form.targetScore),
    } as PredictionInput;
    if (!values.battingTeam || !values.bowlingTeam || !values.venue) return setFormError('Select both teams and a venue.');
    if (values.battingTeam === values.bowlingTeam) return setFormError('Batting and bowling teams must be different.');
    if (!Number.isFinite(values.oversCompleted) || values.oversCompleted < 0 || values.oversCompleted > maxOvers) return setFormError(`Overs must be between 0 and ${maxOvers}.`);
    if (values.wicketsLost < 0 || values.wicketsLost > 10 || values.wicketsLast5Overs < 0 || values.wicketsLast5Overs > 5) return setFormError('Check wicket values and try again.');
    if (values.currentScore < 0 || values.runsLast5Overs < 0 || (values.targetScore !== null && values.targetScore < 0)) return setFormError('Scores cannot be negative.');
    setFormError('');
    predictionMutation.mutate({ data: values }, { onSuccess: setPrediction });
  };

  return (
    <div className="score-grid px-5 py-8 md:px-10 md:py-10">
      <PageHeading eyebrow="Live prediction" title="Read the innings ahead." description="A compact forecasting cockpit for the state of play right now. Change the inputs after an over and keep the range honest." action={<div className="flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.035] px-3 py-2 mono text-[10px] uppercase tracking-[.16em] text-slate-500"><span className="status-pip h-1.5 w-1.5 rounded-full" /> Innings {Number(form.oversCompleted) >= maxOvers ? 'complete' : 'in progress'}</div>} />
      {optionsQuery.isLoading && <LoadingBlock label="Loading supported teams & venues" />}
      {optionsQuery.isError && <div className="mb-6"><QueryError onRetry={() => optionsQuery.refetch()} label="Options feed is unavailable; local input choices are shown." /></div>}
      {options && <ModelStatus modelReady={options.modelReady} trainingRows={options.trainingRows} />}
      <MatchSnapshot form={form} maxOvers={maxOvers} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.03fr)_minmax(390px,.97fr)]">
        <form onSubmit={submit} className="glass-card animate-rise rounded-2xl p-5 sm:p-7" style={{ animationDelay: '.05s' }}>
          <div className="mb-7 flex items-start justify-between"><div><h2 className="display-font text-xl font-semibold text-slate-100">Match state</h2><p className="mt-1 text-xs text-slate-500">Only information available at this point in the innings.</p></div><div className="icon-tile rounded-lg p-2 text-[#ffca62]"><Target size={18} /></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Batting team" value={form.battingTeam} options={teams} onChange={(v) => update('battingTeam', v)} testId="select-batting-team" />
            <SelectField label="Bowling team" value={form.bowlingTeam} options={teams} onChange={(v) => update('bowlingTeam', v)} testId="select-bowling-team" />
          </div>
          <div className="mt-5"><SelectField label="Venue" value={form.venue} options={venues} onChange={(v) => update('venue', v)} testId="select-venue" /></div>
          <div className="section-rule my-7"><span className="mono text-[9px] uppercase tracking-[.2em] text-slate-600">Current innings</span></div>
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField label="Score" suffix="runs" value={form.currentScore} onChange={(v) => update('currentScore', v)} testId="input-current-score" min={0} />
            <NumberField label="Overs completed" suffix={`/ ${maxOvers}`} value={form.oversCompleted} onChange={(v) => update('oversCompleted', v)} testId="input-overs-completed" min={0} max={maxOvers} step=".1" />
            <NumberField label="Wickets lost" suffix="/ 10" value={form.wicketsLost} onChange={(v) => update('wicketsLost', v)} testId="input-wickets-lost" min={0} max={10} />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <NumberField label="Runs in last 5 overs" suffix="runs" value={form.runsLast5Overs} onChange={(v) => update('runsLast5Overs', v)} testId="input-runs-last-5" min={0} />
            <NumberField label="Wickets in last 5 overs" suffix="wickets" value={form.wicketsLast5Overs} onChange={(v) => update('wicketsLast5Overs', v)} testId="input-wickets-last-5" min={0} max={5} />
          </div>
          <div className="mt-5"><NumberField label="Target score" suffix="optional" value={form.targetScore} onChange={(v) => update('targetScore', v)} testId="input-target-score" min={0} placeholder="Leave blank for first innings" /></div>
          {formError && <div data-testid="status-form-error" className="mt-5 flex items-center gap-2 rounded-lg border border-[#ef8578]/25 bg-[#ef8578]/[.08] px-3 py-2.5 text-xs text-[#ffaaa0]"><X size={14} /> {formError}</div>}
          {predictionMutation.isError && <div data-testid="status-prediction-error" className="mt-5 flex items-center gap-2 rounded-lg border border-[#ef8578]/25 bg-[#ef8578]/[.08] px-3 py-2.5 text-xs text-[#ffaaa0]"><AlertTriangle size={14} /> Prediction failed. Check the state and retry.</div>}
          <button data-testid="button-run-prediction" type="submit" disabled={predictionMutation.isPending || optionsQuery.isLoading} className="primary-button group mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold disabled:cursor-wait disabled:opacity-60">
            {predictionMutation.isPending ? <><span className="button-loader" /> Calculating range…</> : <><Zap size={17} /> Run prediction <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center mono text-[9px] uppercase tracking-[.12em] text-slate-600"><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Leakage-safe</span><span className="text-slate-800">•</span><span>{options?.trainingRows ? `${options.trainingRows.toLocaleString()} training rows` : 'Training rows unavailable'}</span></div>
        </form>
        <PredictionResult prediction={prediction} form={form} />
      </div>
      <OverProgress form={form} maxOvers={maxOvers} />
      <DashboardAnalytics prediction={prediction} form={form} maxOvers={maxOvers} diagnostics={modelQuery.data} />
    </div>
  );
}

function ModelStatus({ modelReady, trainingRows }: { modelReady: boolean; trainingRows: number }) {
  return (
    <div className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${modelReady ? 'border-[#43e5b0]/20 bg-[#43e5b0]/[.05]' : 'border-[#ef8578]/25 bg-[#ef8578]/[.06]'}`}>
      <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-full p-1.5 ${modelReady ? 'bg-[#43e5b0]/[.12] text-[#43e5b0]' : 'bg-[#ef8578]/[.12] text-[#ef8578]'}`}><Database size={14} /></div><div><div className={`mono text-[10px] uppercase tracking-[.16em] ${modelReady ? 'text-[#43e5b0]' : 'text-[#ef8578]'}`}>{modelReady ? 'Model ready for live requests' : 'Model not ready'}</div><p className="mt-1 text-xs text-slate-500">{modelReady ? 'The forecast below will be returned by the configured API model.' : 'This is an honest input preview. The API may reject prediction requests until training is available.'}</p></div></div>
      <div className="shrink-0 mono text-[10px] uppercase tracking-[.12em] text-slate-600">{trainingRows ? `${trainingRows.toLocaleString()} training rows` : 'Training metadata unavailable'}</div>
    </div>
  );
}

function SelectField({ label, value, options, onChange, testId }: { label: string; value: string; options: string[]; onChange: (value: string) => void; testId: string }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.08em] text-slate-400">{label}</span><select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} className="field h-11 w-full appearance-none rounded-lg px-3 text-sm text-slate-100 outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function NumberField({ label, suffix, value, onChange, testId, min, max, step, placeholder }: { label: string; suffix: string; value: number | string; onChange: (value: string) => void; testId: string; min?: number; max?: number; step?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.08em] text-slate-400">{label}</span><div className="relative"><input data-testid={testId} type="number" min={min} max={max} step={step} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="field h-11 w-full rounded-lg px-3 pr-16 text-sm text-slate-100 outline-none placeholder:text-slate-700" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 mono text-[9px] uppercase tracking-[.08em] text-slate-600">{suffix}</span></div></label>;
}

function PredictionResult({ prediction, form }: { prediction: Prediction | null; form: FormValues }) {
  const currentScore = Number(form.currentScore) || 0;
  const overs = Number(form.oversCompleted) || 0;
  const previewRate = overs > 0 ? currentScore / overs : 0;
  const confidence = prediction ? (prediction.confidence <= 1 ? prediction.confidence * 100 : prediction.confidence) : null;
  return (
    <section className={`glass-card animate-rise rounded-2xl p-5 sm:p-7 ${prediction ? 'forecast-ready' : ''}`} style={{ animationDelay: '.12s' }}>
      <div className="mb-7 flex items-start justify-between"><div><div className={`mb-2 flex items-center gap-2 mono text-[10px] uppercase tracking-[.18em] ${prediction ? 'text-[#43e5b0]' : 'text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${prediction ? 'status-pip' : 'bg-slate-600'}`} /> {prediction ? 'Forecast ready' : 'Awaiting model run'}</div><h2 className="display-font text-xl font-semibold text-slate-100">Projected finish</h2></div><div className="icon-tile rounded-lg p-2 text-[#43e5b0]"><TrendingUp size={18} /></div></div>
      {prediction ? (
        <>
          <div className="rounded-xl border border-[#ffca62]/20 bg-[#07141d]/75 p-5"><div className="flex items-end justify-between gap-4"><div><div data-testid="text-predicted-final-score" className="display-font text-6xl font-bold tracking-[-.08em] text-[#ffca62]">{Math.round(prediction.predictedFinalScore)}</div><div className="mt-1 mono text-[10px] uppercase tracking-[.16em] text-slate-500">predicted final score</div></div><div className="text-right"><div className="mono text-sm font-medium text-slate-300">{Math.round(prediction.lowerBound)} — {Math.round(prediction.upperBound)}</div><div className="mt-1 text-[10px] text-slate-600">likely range</div></div></div><ConfidenceBand prediction={prediction} /></div>
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[.08] bg-white/[.08] sm:grid-cols-4"><Stat label="Current rate" value={prediction.currentRunRate.toFixed(2)} suffix="RPO" /><Stat label="To come" value={Math.round(prediction.predictedRemainingRuns).toString()} suffix="runs" /><Stat label="Confidence" value={`${Math.round(confidence ?? 0)}%`} suffix={prediction.confidenceLabel} /><Stat label="Required rate" value={prediction.requiredRunRate == null ? '—' : prediction.requiredRunRate.toFixed(2)} suffix="RPO" /></div>
          <div className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500"><Info size={14} className="mt-0.5 shrink-0 text-slate-600" /> Based on {prediction.featuresUsed.length} live features including {prediction.featuresUsed.slice(0, 2).join(' and ')}.</div>
        </>
      ) : (
        <div className="empty-forecast flex min-h-[248px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[.12] px-5 text-center"><Crosshair size={25} className="mb-4 text-[#55d8ff]" /><div className="display-font text-lg font-semibold text-slate-200">Your forecast will land here.</div><p className="mt-2 max-w-[280px] text-xs leading-relaxed text-slate-500">Run the real prediction endpoint to replace this empty state with a score range, confidence, and model metadata.</p><div className="mt-5 flex items-center gap-2 mono text-[9px] uppercase tracking-[.14em] text-slate-600"><Clock3 size={12} /> No prediction in this session</div></div>
      )}
      {!prediction && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><SmallReadout label="Live score" value={`${currentScore}/${form.wicketsLost}`} /><SmallReadout label="Current rate" value={`${previewRate.toFixed(2)} RPO`} /><SmallReadout label="Model state" value="Ready on submit" /></div>}
    </section>
  );
}

function ConfidenceBand({ prediction }: { prediction: Prediction }) {
  const spread = Math.max(1, prediction.upperBound - prediction.lowerBound);
  const certainty = Math.min(100, Math.max(12, 100 - spread * 1.2));
  return <><div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/[.08]"><div className="relative h-full rounded-full bg-gradient-to-r from-[#ffca62] via-[#43e5b0] to-[#55d8ff] transition-all duration-700" style={{ width: `${certainty}%` }}><span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#07141d] bg-[#ffca62]" /></div></div><div className="mt-2 flex justify-between mono text-[9px] uppercase tracking-[.1em] text-slate-600"><span>uncertain</span><span>model center</span><span>tighter range</span></div></>;
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return <div className="bg-[#0d1a24] px-3 py-3"><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">{label}</div><div data-testid={`text-stat-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-1 display-font text-lg font-semibold text-slate-200">{value}</div><div className="mono text-[9px] uppercase tracking-[.1em] text-[#43e5b0]">{suffix}</div></div>;
}

function SmallReadout({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/[.07] bg-white/[.025] px-3 py-3"><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">{label}</div><div className="mt-1 text-xs font-medium text-slate-300">{value}</div></div>;
}

function OverProgress({ form, maxOvers }: { form: FormValues; maxOvers: number }) {
  const overs = Number(form.oversCompleted) || 0;
  const completed = Math.min(maxOvers, Math.floor(overs));
  const progress = Math.min(100, Math.max(0, (overs / maxOvers) * 100));
  const recentRate = Number(form.runsLast5Overs) / 5 || 0;
  const phase = overs < 6 ? 'Powerplay' : overs < 15 ? 'Middle overs' : 'Death overs';
  return (
    <section className="glass-card mt-6 animate-rise rounded-2xl p-5 sm:p-7" style={{ animationDelay: '.18s' }}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="mb-2 mono text-[10px] uppercase tracking-[.18em] text-slate-500">Live innings progression</div><h2 className="display-font text-xl font-semibold">How far the innings has moved</h2></div><div className="flex items-center gap-2 rounded-full border border-[#55d8ff]/15 bg-[#55d8ff]/[.05] px-3 py-1.5 mono text-[10px] uppercase tracking-[.1em] text-[#55d8ff]"><Layers3 size={12} /> {phase}</div></div>
      <div className="relative pt-2"><div className="flex h-3 overflow-hidden rounded-full bg-white/[.07]">{Array.from({ length: Math.max(1, maxOvers) }, (_, index) => <div key={index} className={`h-full flex-1 border-r border-[#07141d] last:border-0 ${index < completed ? (index >= Math.max(0, completed - 5) ? 'bg-[#43e5b0]' : 'bg-[#ffca62]/70') : ''}`} />)}</div><div className="pointer-events-none absolute left-0 top-0 h-7 border-l-2 border-[#55d8ff] transition-[left] duration-500" style={{ left: `${progress}%` }} /><div className="mt-3 flex justify-between mono text-[9px] uppercase tracking-[.1em] text-slate-600"><span>0 overs</span><span>{overs.toFixed(1)} completed</span><span>{maxOvers} overs</span></div></div>
      <div className="mt-7 grid gap-4 border-t border-white/[.07] pt-5 sm:grid-cols-3"><div><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">Score on board</div><div className="mt-1 display-font text-2xl font-semibold text-[#ffca62]">{form.currentScore}<span className="ml-1 text-sm font-normal text-slate-600">runs</span></div></div><div><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">Recent 5-over rate</div><div className="mt-1 display-font text-2xl font-semibold text-slate-200">{recentRate.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-600">RPO</span></div></div><div><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">Overs remaining</div><div className="mt-1 display-font text-2xl font-semibold text-[#43e5b0]">{Math.max(0, maxOvers - overs).toFixed(1)}</div></div></div>
    </section>
  );
}

function MatchSnapshot({ form, maxOvers }: { form: FormValues; maxOvers: number }) {
  const overs = Number(form.oversCompleted) || 0;
  const currentScore = Number(form.currentScore) || 0;
  const currentRate = overs > 0 ? currentScore / overs : 0;
  return (
    <section className="match-snapshot glass-card mb-6 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="team-badge team-badge-a">{form.battingTeam.slice(0, 2)}</div>
          <div>
            <div className="mono text-[9px] uppercase tracking-[.18em] text-[#43e5b0]">Live innings</div>
            <div className="mt-1 flex items-center gap-2 display-font text-xl font-semibold text-slate-100">
              {form.battingTeam} <span className="text-slate-700">vs</span> {form.bowlingTeam}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={12} /> {form.venue}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div><div className="mono text-[9px] uppercase tracking-[.14em] text-slate-600">Current score</div><div className="mt-1 display-font text-3xl font-bold text-[#ffca62]">{currentScore}<span className="ml-1 text-lg text-slate-500">/ {form.wicketsLost}</span></div></div>
          <div><div className="mono text-[9px] uppercase tracking-[.14em] text-slate-600">Overs</div><div className="mt-1 display-font text-xl font-semibold text-slate-200">{overs.toFixed(1)}<span className="text-sm text-slate-500"> / {maxOvers}</span></div></div>
          <div><div className="mono text-[9px] uppercase tracking-[.14em] text-slate-600">Current run rate</div><div className="mt-1 display-font text-xl font-semibold text-[#43e5b0]">{currentRate.toFixed(2)}<span className="ml-1 text-sm text-slate-500">RPO</span></div></div>
          <div className="flex items-center gap-2 rounded-full border border-[#43e5b0]/20 bg-[#43e5b0]/[.06] px-3 py-2 mono text-[10px] uppercase tracking-[.14em] text-[#43e5b0]"><span className="status-pip h-1.5 w-1.5 rounded-full" /> Live</div>
        </div>
      </div>
    </section>
  );
}

function DashboardAnalytics({ prediction, form, maxOvers, diagnostics }: { prediction: Prediction | null; form: FormValues; maxOvers: number; diagnostics?: ModelDiagnostics }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="analytics-heading">
        <div><div className="mono text-[10px] uppercase tracking-[.18em] text-[#ffca62]">Decision layer</div><h2 className="mt-2 display-font text-2xl font-semibold text-slate-100">The innings, in context.</h2></div>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">Derived only from the current match state and the real forecast response. Historical match aggregates stay hidden until the API provides them.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <ProjectionChart prediction={prediction} form={form} maxOvers={maxOvers} />
        <RangeScenarios prediction={prediction} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <MomentumCard form={form} maxOvers={maxOvers} />
        <HistoricalContext />
        <ModelSignals diagnostics={diagnostics} />
      </div>
      <ForecastTimeline prediction={prediction} form={form} />
    </div>
  );
}

function ProjectionChart({ prediction, form, maxOvers }: { prediction: Prediction | null; form: FormValues; maxOvers: number }) {
  const data = useMemo(() => {
    if (!prediction) return [];
    const overs = Math.min(maxOvers, Math.max(0, Number(form.oversCompleted) || 0));
    const currentScore = Math.max(0, Number(form.currentScore) || 0);
    return [
      { over: 0, actual: 0, projected: 0, lower: 0, upper: 0 },
      { over: overs, actual: currentScore, projected: currentScore, lower: currentScore, upper: currentScore },
      { over: maxOvers, actual: null, projected: Math.round(prediction.predictedFinalScore), lower: Math.round(prediction.lowerBound), upper: Math.round(prediction.upperBound) },
    ];
  }, [form.currentScore, form.oversCompleted, maxOvers, prediction]);

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Forecast visualization</div><h2 className="mt-2 display-font text-xl font-semibold">Score projection</h2><p className="mt-1 text-xs text-slate-500">Actual score to the current over, then the model’s projected finish.</p></div><TrendingUp size={19} className="text-[#55d8ff]" /></div>
      {prediction ? <div className="h-[260px] w-full" data-testid="chart-score-projection">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: -16, bottom: 0 }}>
            <defs><linearGradient id="projection-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#55d8ff" stopOpacity=".2" /><stop offset="100%" stopColor="#55d8ff" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="over" tickFormatter={(value) => `${value} ov`} tick={{ fill: '#647788', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#647788', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
            <Tooltip contentStyle={{ background: '#0b1822', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: '#e9f1f5', fontSize: 12 }} labelFormatter={(label) => `Over ${label}`} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#projection-band)" fillOpacity={1} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#07141d" fillOpacity={1} />
            <Line type="monotone" dataKey="actual" name="Actual score" stroke="#ffca62" strokeWidth={3} dot={{ r: 4, fill: '#ffca62', stroke: '#07141d', strokeWidth: 2 }} connectNulls={false} />
            <Line type="monotone" dataKey="projected" name="Projected score" stroke="#55d8ff" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4, fill: '#55d8ff', stroke: '#07141d', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div> : <AnalyticsEmpty label="Run a prediction to draw the score path." />}
      <div className="mt-4 flex flex-wrap gap-4 mono text-[9px] uppercase tracking-[.1em] text-slate-600"><span className="flex items-center gap-2"><span className="legend-dot bg-[#ffca62]" /> Actual</span><span className="flex items-center gap-2"><span className="legend-line" /> Projected</span><span className="flex items-center gap-2"><span className="legend-band" /> Uncertainty</span></div>
    </section>
  );
}

function RangeScenarios({ prediction }: { prediction: Prediction | null }) {
  const values = prediction ? [Math.round(prediction.lowerBound), Math.round(prediction.predictedFinalScore), Math.round(prediction.upperBound)] : [];
  const min = values.length ? Math.min(...values) - 4 : 0;
  const max = values.length ? Math.max(...values) + 4 : 1;
  const position = (value: number) => `${((value - min) / Math.max(1, max - min)) * 100}%`;
  return <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Outcome range</div><h2 className="mt-2 display-font text-xl font-semibold">Where this innings could finish</h2></div><Target size={19} className="text-[#ffca62]" /></div>{prediction ? <><div className="relative mt-10 h-2 rounded-full bg-gradient-to-r from-[#ffca62] via-[#43e5b0] to-[#55d8ff]"><span className="absolute -top-2 h-6 w-0.5 bg-slate-100" style={{ left: position(values[0]) }} /><span className="absolute -top-3 h-8 w-1 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.6)]" style={{ left: position(values[1]) }} /><span className="absolute -top-2 h-6 w-0.5 bg-slate-100" style={{ left: position(values[2]) }} /></div><div className="mt-7 grid grid-cols-3 gap-3 text-center"><Scenario label="Low" value={values[0]} tone="text-[#ffca62]" /><Scenario label="Most likely" value={values[1]} tone="text-slate-100" /><Scenario label="High" value={values[2]} tone="text-[#55d8ff]" /></div><p className="mt-6 text-xs leading-relaxed text-slate-500">Based on current scoring rate, wickets remaining, recent scoring pattern, and the team and venue priors returned by the prediction service.</p></> : <AnalyticsEmpty label="The low / likely / high range appears after prediction." />}</section>;
}

function Scenario({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">{label}</div><div className={`mt-1 display-font text-2xl font-bold ${tone}`}>{value}</div><div className="mono text-[9px] uppercase text-slate-600">runs</div></div>;
}

function MomentumCard({ form, maxOvers }: { form: FormValues; maxOvers: number }) {
  const overs = Number(form.oversCompleted) || 0;
  const recentRate = Number(form.runsLast5Overs) / Math.max(1, Math.min(5, overs));
  const active = overs < 6 ? 'Powerplay' : overs < 15 ? 'Middle overs' : 'Death overs';
  const strength = recentRate >= 9 ? 86 : recentRate >= 7 ? 64 : 42;
  return <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Current signal</div><h2 className="mt-2 display-font text-xl font-semibold">Match momentum</h2></div><Activity size={18} className="text-[#43e5b0]" /></div><div className="space-y-4">{['Powerplay', 'Middle overs', 'Death overs'].map((phase) => { const isActive = phase === active; return <div key={phase}><div className="mb-2 flex items-center justify-between text-xs"><span className={isActive ? 'font-semibold text-slate-200' : 'text-slate-500'}>{phase}</span><span className="mono text-[9px] uppercase tracking-[.1em] text-slate-600">{isActive ? recentRate.toFixed(1) + ' RPO' : 'Not observed'}</span></div><div className="h-2 rounded-full bg-white/[.07]">{isActive && <div className="h-2 rounded-full bg-gradient-to-r from-[#ffca62] to-[#43e5b0] transition-all duration-700" style={{ width: `${strength}%` }} />}</div></div>; })}</div><div className="mt-5 border-t border-white/[.07] pt-4 text-xs leading-relaxed text-slate-500">Only the active phase is inferred from the latest five-over input ({Math.max(0, maxOvers - overs).toFixed(1)} overs remain). Earlier phase-specific signals are unavailable.</div></section>;
}

function HistoricalContext() {
  return <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Context layer</div><h2 className="mt-2 display-font text-xl font-semibold">Historical context</h2></div><Trophy size={18} className="text-[#ffca62]" /></div><div className="space-y-3">{['Team average', 'Venue average', 'Head-to-head average', 'Opponent conceded average'].map((label) => <div key={label} className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.025] px-3 py-3"><span className="text-xs text-slate-400">{label}</span><span className="mono text-[10px] uppercase tracking-[.1em] text-slate-600">Data unavailable</span></div>)}</div><p className="mt-5 text-xs leading-relaxed text-slate-500">These values stay blank until the backend exposes historical aggregates. No fabricated statistics are shown.</p></section>;
}

function ModelSignals({ diagnostics }: { diagnostics?: ModelDiagnostics }) {
  const items = diagnostics?.featureImportance?.slice(0, 4) ?? [];
  const max = Math.max(...items.map((item) => item.importance), 1);
  return <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Model signals</div><h2 className="mt-2 display-font text-xl font-semibold">What moves the forecast</h2></div><Swords size={18} className="text-[#55d8ff]" /></div>{items.length ? <div className="space-y-4">{items.map((item) => <div key={item.feature}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-300">{item.feature}</span><span className="mono text-slate-500">{Math.round(item.importance * 100)}%</span></div><div className="h-1.5 rounded-full bg-white/[.07]"><div className="h-1.5 rounded-full bg-gradient-to-r from-[#55d8ff] to-[#43e5b0]" style={{ width: `${(item.importance / max) * 100}%` }} /></div></div>)}</div> : <AnalyticsEmpty label="Feature importance is unavailable." />}<p className="mt-5 text-xs leading-relaxed text-slate-500">{diagnostics ? 'Global feature importance returned by the diagnostics endpoint; it is not a per-match causal explanation.' : 'Waiting for the diagnostics endpoint.'}</p></section>;
}

function ForecastTimeline({ prediction, form }: { prediction: Prediction | null; form: FormValues }) {
  return <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Optional history layer</div><h2 className="mt-2 display-font text-xl font-semibold">Over-by-over forecast</h2></div><Clock3 size={18} className="text-[#55d8ff]" /></div>{prediction ? <div className="grid gap-3 sm:grid-cols-3"><TimelineCell label="Current" value={`${form.oversCompleted} overs`} detail={`${form.currentScore}/${form.wicketsLost}`} /><TimelineCell label="Projected finish" value="20.0 overs" detail={`${Math.round(prediction.predictedFinalScore)} runs`} /><TimelineCell label="Confidence" value={prediction.confidenceLabel} detail={`${Math.round(prediction.confidence <= 1 ? prediction.confidence * 100 : prediction.confidence)}%`} /></div> : <AnalyticsEmpty label="Historical prediction snapshots are not stored yet. This area is ready for future forecast history." />}</section>;
}

function TimelineCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><div className="mono text-[9px] uppercase tracking-[.12em] text-slate-600">{label}</div><div className="mt-2 text-sm font-semibold text-slate-200">{detail}</div><div className="mt-1 text-xs text-slate-500">{value}</div></div>;
}

function AnalyticsEmpty({ label }: { label: string }) {
  return <div className="empty-panel flex min-h-[150px] items-center justify-center text-center text-xs leading-relaxed text-slate-500">{label}</div>;
}

function ModelPage() {
  const query = useGetPredictionModel();
  const diagnostics = query.data;
  return <div className="score-grid px-5 py-8 md:px-10 md:py-10"><PageHeading eyebrow="Model diagnostics" title="Make the forecast answerable." description="See the validation record, selected model, training timestamp, and the features that shape the output." action={<div className="flex items-center gap-2 rounded-full border border-[#43e5b0]/20 bg-[#43e5b0]/[.06] px-3 py-2 mono text-[10px] uppercase tracking-[.14em] text-[#43e5b0]"><ShieldCheck size={13} /> Accountability layer</div>} />{query.isLoading ? <LoadingBlock label="Loading model diagnostics" /> : query.isError ? <QueryError onRetry={() => query.refetch()} label="Model diagnostics are temporarily unavailable." /> : diagnostics ? <DiagnosticsContent diagnostics={diagnostics} /> : <EmptyDiagnostics />}</div>;
}

function EmptyDiagnostics() {
  return <div className="glass-card flex min-h-[300px] flex-col items-center justify-center rounded-2xl p-8 text-center"><Database size={28} className="mb-4 text-[#55d8ff]" /><h2 className="display-font text-xl font-semibold text-slate-200">No diagnostics returned</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">The API responded without a diagnostics payload. This screen intentionally avoids filling the gap with synthetic metrics.</p></div>;
}

function DiagnosticsContent({ diagnostics: d }: { diagnostics: ModelDiagnostics }) {
  const maxImportance = Math.max(...d.featureImportance.map((item) => item.importance), 1);
  const trainedDate = d.trainedAt === 'Awaiting historical CSV' ? d.trainedAt : new Date(d.trainedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const isReady = d.trainedAt !== 'Awaiting historical CSV' && d.metrics.length > 0;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
      <div className="space-y-6">
        <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><h2 className="display-font text-xl font-semibold">Validation scoreboard</h2><p className="mt-1 text-xs text-slate-500">Lower error is better. R² measures explained score variance.</p></div><BarChart3 size={20} className="text-[#ffca62]" /></div>{d.metrics.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead><tr className="border-b border-white/[.08] mono text-[9px] uppercase tracking-[.14em] text-slate-600"><th className="pb-3 font-normal">Model</th><th className="pb-3 font-normal">MAE</th><th className="pb-3 font-normal">RMSE</th><th className="pb-3 font-normal">R²</th><th className="pb-3 text-right font-normal">Status</th></tr></thead><tbody>{d.metrics.map((metric, index) => <tr key={metric.name} data-testid={`row-model-metric-${index}`} className="border-b border-white/[.06] last:border-0"><td className="py-4 text-sm font-semibold text-slate-200">{metric.name}</td><td className="py-4 mono text-sm text-slate-400">{metric.mae.toFixed(1)}</td><td className="py-4 mono text-sm text-slate-400">{metric.rmse.toFixed(1)}</td><td className="py-4 mono text-sm text-slate-400">{metric.r2.toFixed(2)}</td><td className="py-4 text-right">{metric.selected ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#43e5b0]/[.1] px-2.5 py-1 mono text-[9px] uppercase tracking-[.1em] text-[#43e5b0]"><Check size={11} /> selected</span> : <span className="mono text-[10px] text-slate-700">candidate</span>}</td></tr>)}</tbody></table></div> : <div className="empty-panel">No validation metrics returned by the API.</div>}</section>
        <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><h2 className="display-font text-xl font-semibold">What the model watches</h2><p className="mt-1 text-xs text-slate-500">Relative contribution from the API, not a promise about one match.</p></div><Crosshair size={19} className="text-[#ffca62]" /></div>{d.featureImportance.length ? <div className="space-y-4">{d.featureImportance.map((item, index) => <div key={item.feature} data-testid={`row-feature-importance-${index}`}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-300">{item.feature}</span><span className="mono text-slate-500">{Math.round(item.importance * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-[#ffca62] to-[#43e5b0] transition-all duration-700" style={{ width: `${(item.importance / maxImportance) * 100}%` }} /></div></div>)}</div> : <div className="empty-panel">No feature importance returned by the API.</div>}</section>
      </div>
      <div className="space-y-6">
        <section className={`rounded-2xl border p-5 sm:p-7 ${isReady ? 'border-[#ffca62]/25 bg-[#ffca62]/[.06]' : 'border-[#ef8578]/25 bg-[#ef8578]/[.06]'}`}><div className={`mb-6 flex items-center gap-2 mono text-[10px] uppercase tracking-[.16em] ${isReady ? 'text-[#ffca62]' : 'text-[#ef8578]'}`}><GitBranch size={14} /> {isReady ? 'Current production model' : 'Model readiness'}</div><div className="display-font text-2xl font-bold text-slate-100">{d.selectedModel}</div><div className="mt-5 grid gap-4 border-t border-white/[.1] pt-5"><Meta label="Validation" value={d.validationStrategy} /><Meta label="Trained" value={trainedDate} /><Meta label="Live features" value={`${d.featureImportance.length} inputs`} /></div></section>
        <section className="glass-card rounded-2xl p-5 sm:p-7"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={17} className="text-[#43e5b0]" /><h2 className="display-font text-lg font-semibold">Leakage prevention</h2></div><p className="text-sm leading-relaxed text-slate-400">The live request is evaluated only from the current innings state. Future overs, final totals, and post-innings summaries are not part of the input contract.</p><div className="mt-5 space-y-3">{['Time-aware validation strategy', 'No future-over features', 'Inputs frozen at prediction time'].map((text) => <div key={text} className="flex items-center gap-2 text-xs text-slate-300"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#43e5b0]/[.1] text-[#43e5b0]"><Check size={12} /></span>{text}</div>)}</div></section>
        <div className="flex items-start gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-4 text-xs leading-relaxed text-slate-500"><CircleHelp size={16} className="mt-0.5 shrink-0 text-slate-600" />Ranges widen when the innings state is unusual. That uncertainty is part of the output, not an error to hide.</div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="mono text-[10px] uppercase tracking-[.12em] text-slate-600">{label}</span><span className="text-right text-xs text-slate-300">{value}</span></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={PredictionPage} /><Route path="/model" component={ModelPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}