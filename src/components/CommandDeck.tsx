import React from 'react';
import {
  Play,
  RotateCcw,
  Undo2,
  Eye,
  Terminal,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { GitCommandAction } from '../types/git';

interface CommandDeckProps {
  commands: GitCommandAction[];
  terminalLines: string[];
  canUndo: boolean;
  lastRunId: string | null;
  onExecute: (cmd: GitCommandAction) => void;
  onUndoHistory: () => void;
  onResetStep: () => void;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({
  commands,
  terminalLines,
  canUndo,
  lastRunId,
  onExecute,
  onUndoHistory,
  onResetStep,
}) => {
  return (
    <section
      aria-label="Interactive Git Commands"
      className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-slate-900">
            Clickable Commands
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUndoHistory}
            disabled={!canUndo}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Undo2 className="w-3 h-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={onResetStep}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Clickable 2-Column Command Buttons */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-0.5">
        {commands.map((cmd) => {
          const isLast = lastRunId === cmd.id;
          const styleMap = {
            do: {
              border: isLast
                ? 'border-sky-600 bg-sky-50/70'
                : 'border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50/30',
              typeLabel: 'Do',
              typeColor: 'text-sky-700',
              icon: <Play className="w-3 h-3 text-sky-600 shrink-0" />,
            },
            undo: {
              border: isLast
                ? 'border-rose-600 bg-rose-50/70'
                : 'border-slate-200 hover:border-rose-400 bg-white hover:bg-rose-50/30',
              typeLabel: 'Undo',
              typeColor: 'text-rose-700',
              icon: <ArrowLeft className="w-3 h-3 text-rose-600 shrink-0" />,
            },
            inspect: {
              border: isLast
                ? 'border-indigo-600 bg-indigo-50/70'
                : 'border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30',
              typeLabel: 'Inspect',
              typeColor: 'text-indigo-700',
              icon: <Eye className="w-3 h-3 text-indigo-600 shrink-0" />,
            },
          }[cmd.kind];

          return (
            <button
              key={cmd.id}
              type="button"
              onClick={() => onExecute(cmd)}
              className={`group text-left rounded-lg border px-2.5 py-2 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 cursor-pointer ${styleMap.border}`}
            >
              <div className="flex items-center justify-between gap-2 text-[10.5px] mb-0.5">
                <span className={`inline-flex items-center gap-1 font-semibold ${styleMap.typeColor}`}>
                  {styleMap.icon}
                  <span>{styleMap.typeLabel}</span>
                </span>
                <span className="text-slate-500 truncate">{cmd.routeLabel}</span>
              </div>
              <div className="font-mono text-[11px] font-semibold text-slate-900 leading-snug break-words" title={cmd.command}>
                {cmd.command}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between gap-1.5">
                <span className="truncate">{cmd.label}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Compact Live Terminal Output Strip */}
      <div className="mt-2 rounded-lg bg-[#0F172A] text-slate-100 px-3 py-2 font-mono text-[11px] leading-snug flex-1 min-h-[58px] overflow-y-auto">
        <div className="flex items-start gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0 flex-1">
            {terminalLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith('$')
                    ? 'text-sky-300 font-medium break-words'
                    : line.startsWith('+')
                    ? 'text-emerald-400'
                    : line.startsWith('-')
                    ? 'text-rose-400'
                    : 'text-slate-200'
                }
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
