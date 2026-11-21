import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
} from 'lucide-react';
import { LESSONS, cloneState, runCommandEffect } from './data/lessons';
import { GitCommandAction, LanguageMode, RepoState } from './types/git';
import { StageDiagram } from './components/StageDiagram';
import { CommandDeck } from './components/CommandDeck';
import { TheoryPanel } from './components/TheoryPanel';
import { BranchLab } from './components/BranchLab';
import { FlowMatrix } from './components/FlowMatrix';
import { CheatSheet } from './components/CheatSheet';
import { downloadOfflineHtml } from './utils/offlineExporter';

type AppView = 'tutorial' | 'branch-lab' | 'flow-matrix' | 'cheat-sheet';

export default function App() {
  const [view, setView] = useState<AppView>('tutorial');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [repoState, setRepoState] = useState<RepoState>(() =>
    cloneState(LESSONS[0].initialState)
  );
  const [historyStack, setHistoryStack] = useState<RepoState[]>([]);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [downloadedFeedback, setDownloadedFeedback] = useState(false);
  const [lang, setLang] = useState<LanguageMode>('en');

  const currentLesson = LESSONS[stepIndex];

  const goToStep = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= LESSONS.length) return;
    setStepIndex(nextIndex);
    setRepoState(cloneState(LESSONS[nextIndex].initialState));
    setHistoryStack([]);
    setLastRunId(null);
  }, []);

  const handleExecuteCommand = useCallback(
    (cmd: GitCommandAction) => {
      setHistoryStack((prev) => [...prev, cloneState(repoState)]);
      setRepoState((prev) => runCommandEffect(prev, cmd.effect, cmd.command));
      setLastRunId(cmd.id);
    },
    [repoState]
  );

  const handleUndoHistory = useCallback(() => {
    setHistoryStack((prev) => {
      if (prev.length === 0) return prev;
      const nextStack = prev.slice(0, -1);
      const previousState = prev[prev.length - 1];
      setRepoState(previousState);
      setLastRunId(null);
      return nextStack;
    });
  }, []);

  const handleResetStep = useCallback(() => {
    setRepoState(cloneState(LESSONS[stepIndex].initialState));
    setHistoryStack([]);
    setLastRunId(null);
  }, [stepIndex]);

  const handleDownloadOffline = () => {
    downloadOfflineHtml();
    setDownloadedFeedback(true);
    setTimeout(() => setDownloadedFeedback(false), 2200);
  };

  // Keyboard arrow navigation in Tutorial view
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (view !== 'tutorial') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') goToStep(stepIndex + 1);
      if (e.key === 'ArrowLeft') goToStep(stepIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, stepIndex, goToStep]);

  const isTutorial = view === 'tutorial';

  return (
    <div
      className={`flex flex-col bg-[#F8FAFC] text-[#0F172A] ${
        isTutorial ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('tutorial')}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            GitFrame
          </button>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
          >
            {(
              [
                ['tutorial', 'Tutorial'],
                ['branch-lab', 'Branch Lab'],
                ['flow-matrix', 'Flow Matrix'],
                ['cheat-sheet', 'Cheat Sheet'],
              ] as [AppView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`text-sm font-medium py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  view === key
                    ? 'text-slate-900 border-slate-900'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Language Switcher (EN / বাংলা) + Download Offline HTML */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Story and theory language"
              title="Switch Story & Theory language (English / বাংলা)"
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                aria-pressed={lang === 'bn'}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadOffline}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>HTML Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download Offline HTML</span>
                  <span className="sm:hidden">Offline HTML</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        className={`flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 ${
          isTutorial
            ? 'py-3 flex flex-col min-h-0 lg:overflow-hidden'
            : 'py-6 md:py-8'
        }`}
      >
        {isTutorial && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Two-Column Split: 45% Interactive Visual + Commands | 55% Spacious Theory & Story */}
            <div className="grid grid-cols-1 lg:grid-cols-[45%_1fr] gap-4 flex-1 min-h-0 items-stretch">
              {/* LEFT 45%: 4-Stage Visual Diagram + Clickable Commands */}
              <div className="flex flex-col gap-3 min-h-0 lg:overflow-hidden">
                <StageDiagram
                  state={repoState}
                  hasCommands={currentLesson.commands.length > 0}
                />
                {currentLesson.commands.length > 0 && (
                  <CommandDeck
                    commands={currentLesson.commands}
                    terminalLines={repoState.terminalLines}
                    canUndo={historyStack.length > 0}
                    lastRunId={lastRunId}
                    onExecute={handleExecuteCommand}
                    onUndoHistory={handleUndoHistory}
                    onResetStep={handleResetStep}
                  />
                )}
              </div>

              {/* RIGHT 55%: Full-Height Scrollable Theory, Story, Vocabulary & Flags */}
              <div className="flex flex-col min-h-0 lg:overflow-hidden">
                <TheoryPanel lesson={currentLesson} lang={lang} />
              </div>
            </div>

            {/* Pinned Bottom Navigation Bar: Previous | Running Circle % + Steps + Jump | Next */}
            {(() => {
              const progressPercent = Math.round(
                (stepIndex / Math.max(1, LESSONS.length - 1)) * 100
              );
              const radius = 16;
              const circumference = 2 * Math.PI * radius;
              const dashOffset = circumference * (1 - progressPercent / 100);

              return (
                <nav
                  aria-label="Step navigation"
                  className="grad-card rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => goToStep(stepIndex - 1)}
                    disabled={stepIndex === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Running Circular Progress Indicator with Percentage in the Middle */}
                    <div
                      className="relative w-11 h-11 shrink-0 flex items-center justify-center"
                      role="progressbar"
                      aria-label="Course completion percentage"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      title={`Course progress: ${progressPercent}% (Step ${stepIndex + 1} of ${LESSONS.length})`}
                    >
                      <svg viewBox="0 0 44 44" className="w-11 h-11 overflow-visible">
                        <defs>
                          <linearGradient id="progress-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0284C7" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                          <linearGradient id="progress-orbit-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
                          </linearGradient>
                        </defs>

                        {/* Running outer orbital highlight ring */}
                        <circle
                          cx="22"
                          cy="22"
                          r="20"
                          fill="none"
                          stroke="url(#progress-orbit-grad)"
                          strokeWidth="1.6"
                          strokeDasharray="24 102"
                          strokeLinecap="round"
                          className="animate-ring-orbit"
                        />

                        {/* Base progress track */}
                        <circle
                          cx="22"
                          cy="22"
                          r={radius}
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="3.2"
                        />

                        {/* Filled progress arc */}
                        <circle
                          cx="22"
                          cy="22"
                          r={radius}
                          fill="none"
                          stroke="url(#progress-ring-grad)"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 22 22)"
                          style={{
                            transition: 'stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-900 tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      Step {stepIndex + 1} of {LESSONS.length}
                    </span>

                    <div
                      className="hidden md:flex items-center gap-1"
                      role="group"
                      aria-label="Course progress"
                    >
                      {LESSONS.map((l, idx) => (
                        <button
                          key={l.stepNumber}
                          type="button"
                          onClick={() => goToStep(idx)}
                          title={`Step ${l.stepNumber}: ${l.title}`}
                          aria-label={`Go to Step ${l.stepNumber}: ${l.title}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === stepIndex
                              ? 'w-6 bg-slate-900'
                              : idx < stepIndex
                              ? 'w-3 bg-sky-500 hover:bg-sky-600'
                              : 'w-3 bg-slate-200 hover:bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <select
                      aria-label="Jump to step"
                      value={stepIndex}
                      onChange={(e) => goToStep(Number(e.target.value))}
                      className="hidden sm:block text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-500 max-w-[230px] truncate cursor-pointer"
                    >
                      {LESSONS.map((l, idx) => (
                        <option key={l.stepNumber} value={idx}>
                          {l.stepNumber}. {l.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => goToStep(stepIndex + 1)}
                    disabled={stepIndex === LESSONS.length - 1}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              );
            })()}
          </div>
        )}

        {view === 'branch-lab' && <BranchLab />}
        {view === 'flow-matrix' && <FlowMatrix />}
        {view === 'cheat-sheet' && <CheatSheet />}
      </main>

      {/* Quiet Footer only on non-100vh reference tabs */}
      {!isTutorial && (
        <footer className="border-t border-slate-200 bg-white mt-8">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>GitFrame — Visual 4-Stage Git Learning Studio</span>
            <span>Zero external dependencies · 100% offline capable</span>
          </div>
        </footer>
      )}
    </div>
  );
}
