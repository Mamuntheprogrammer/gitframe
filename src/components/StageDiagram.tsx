import React, { useState } from 'react';
import {
  Camera,
  CameraOff,
  FolderOpen,
  Folder,
  Layers,
  HardDrive,
  Cloud,
  FileText,
  FilePlus2,
  FilePenLine,
  FileX2,
  EyeOff,
  GitCommitHorizontal,
  GitBranch,
  Archive,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FileEntry, RepoState, StageId } from '../types/git';

interface StageDiagramProps {
  state: RepoState;
}

// X coordinates aligned with the 4 side-by-side columns:
// Group 1 (my-project/ = 3fr): Workspace (76), Staging (218), Local Repo (360)
// Bridge (18px) + Group 2 (GitHub = 1fr): Remote Repo (530)
const STAGE_X: Record<StageId, number> = {
  workspace: 76,
  staging: 218,
  local: 360,
  remote: 530,
};

function FileStatusRow({ file }: { file: FileEntry }) {
  const meta: Record<
    FileEntry['status'],
    { icon: React.ReactNode; label: string; colorClass: string }
  > = {
    untracked: {
      icon: <FilePlus2 className="w-3 h-3 shrink-0 text-amber-600" />,
      label: 'Untracked',
      colorClass: 'text-amber-700',
    },
    modified: {
      icon: <FilePenLine className="w-3 h-3 shrink-0 text-orange-600" />,
      label: 'Modified',
      colorClass: 'text-orange-700',
    },
    staged: {
      icon: <FileText className="w-3 h-3 shrink-0 text-sky-600" />,
      label: 'Staged',
      colorClass: 'text-sky-700',
    },
    clean: {
      icon: <FileText className="w-3 h-3 shrink-0 text-emerald-600" />,
      label: 'Clean',
      colorClass: 'text-emerald-700',
    },
    deleted: {
      icon: <FileX2 className="w-3 h-3 shrink-0 text-rose-600" />,
      label: 'Deleted',
      colorClass: 'text-rose-700',
    },
    ignored: {
      icon: <EyeOff className="w-3 h-3 shrink-0 text-slate-400" />,
      label: 'Ignored',
      colorClass: 'text-slate-500',
    },
    renamed: {
      icon: <FilePenLine className="w-3 h-3 shrink-0 text-indigo-600" />,
      label: 'Renamed',
      colorClass: 'text-indigo-700',
    },
  };

  const info = meta[file.status];

  return (
    <div
      className="animate-item-arrive py-1 border-b border-slate-100 last:border-b-0"
      title={file.detail ? `${file.name} — ${file.detail}` : file.name}
    >
      <div className="flex items-center gap-1 min-w-0">
        {info.icon}
        <span className="font-mono text-[10.5px] font-semibold text-slate-800 truncate">
          {file.name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 pl-4 mt-0.5">
        <span className={`text-[9.5px] font-semibold leading-none ${info.colorClass}`}>
          {info.label}
        </span>
      </div>
    </div>
  );
}

export const StageDiagram: React.FC<StageDiagramProps> = ({ state }) => {
  const [inspectDotGit, setInspectDotGit] = useState(false);

  const flow = state.activeFlow;
  const isFlowActive = Boolean(flow && flow.from !== flow.to);
  const startX = flow ? STAGE_X[flow.from] : 76;
  const endX = flow ? STAGE_X[flow.to] : 218;
  const midX = (startX + endX) / 2;
  const isBackward = flow?.direction === 'backward';
  const strokeColor =
    flow?.direction === 'backward'
      ? '#DC2626'
      : flow?.direction === 'inspect'
      ? '#4F46E5'
      : '#0284C7';

  const stageBorder = (id: StageId, defaultBorder: string) =>
    state.highlightStage === id
      ? 'border-slate-900 ring-2 ring-slate-900/10'
      : defaultBorder;

  return (
    <section
      aria-label="Four Stage Git Architecture Diagram"
      className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col shrink-0"
    >
      {/* Top Animated Flow Arc Aligned Directly Over the 4 Side-by-Side Stages */}
      <div className="mb-1">
        <svg
          viewBox="0 0 600 40"
          className="w-full h-10 overflow-visible"
          role="img"
          aria-label={
            flow
              ? `Active Git flow from ${flow.from} to ${flow.to}: ${flow.label}`
              : 'Four Git stages pipeline'
          }
        >
          <defs>
            <marker
              id="arrow-forward"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
            </marker>
            <marker
              id="arrow-backward"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
            </marker>
            <marker
              id="arrow-inspect"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#4F46E5" />
            </marker>
          </defs>

          {/* Subtle horizontal guide line linking the 4 column centers */}
          <line
            x1="76"
            y1="35"
            x2="530"
            y2="35"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {(['workspace', 'staging', 'local', 'remote'] as StageId[]).map((id) => {
            const x = STAGE_X[id];
            const active =
              state.highlightStage === id ||
              flow?.from === id ||
              flow?.to === id;
            const nodeColor =
              id === 'workspace'
                ? '#D97706'
                : id === 'staging'
                ? '#0284C7'
                : id === 'local'
                ? '#059669'
                : '#4F46E5';
            return (
              <circle
                key={id}
                cx={x}
                cy="35"
                r={active ? 4.5 : 3}
                fill={active ? nodeColor : '#CBD5E1'}
              />
            );
          })}

          {isFlowActive && flow ? (
            <g>
              <path
                d={`M ${startX} 35 Q ${midX} 4 ${endX} 35`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.4"
                className={
                  isBackward ? 'animate-flow-backward' : 'animate-flow-forward'
                }
                markerEnd={
                  flow.direction === 'backward'
                    ? 'url(#arrow-backward)'
                    : flow.direction === 'inspect'
                    ? 'url(#arrow-inspect)'
                    : 'url(#arrow-forward)'
                }
              />
              <rect
                x={Math.max(8, Math.min(352, midX - 120))}
                y="0"
                width="240"
                height="19"
                rx="4"
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth="1"
              />
              <text
                x={Math.max(128, Math.min(472, midX))}
                y="13"
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={strokeColor}
              >
                {isBackward ? '← ' : '→ '}
                {flow.label}
              </text>
            </g>
          ) : (
            <text
              x="300"
              y="16"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="500"
              fill={flow ? '#0F172A' : '#64748B'}
            >
              {flow
                ? flow.label
                : 'Click any command below to watch changes flow across all 4 stages'}
            </text>
          )}
        </svg>
      </div>

      {/* Side-by-Side Grouped Architecture:
          Group 1: Local Project Folder (Workspace + Staging + Local Repo inside ONE folder)
          Bridge: Push / Pull network link
          Group 2: Remote Cloud Server (GitHub) */}
      <div className="overflow-x-auto pb-0.5">
        <div className="grid grid-cols-[minmax(0,3fr)_18px_minmax(0,1fr)] gap-1.5 items-stretch min-w-[490px]">
          {/* GROUP 1: SAME LOCAL PROJECT FOLDER (my-project/) */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/75 p-1.5 flex flex-col">
            <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Folder className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span className="font-mono text-[10.5px] font-bold text-slate-800 truncate">
                  my-project/
                </span>
                <span className="text-[10px] font-medium text-slate-500 truncate hidden sm:inline">
                  Same Local Folder (contains .git/)
                </span>
              </div>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap shrink-0">
                Your PC
              </span>
            </div>

            {/* 3 Side-by-Side Local Cards inside the same folder */}
            <div className="grid grid-cols-3 gap-1.5 flex-1 items-stretch">
              {/* STAGE 1: WORKSPACE */}
              <div
                className={`flex flex-col rounded-md border bg-[#FFFDF9] p-2 min-w-0 transition-all duration-200 ${stageBorder(
                  'workspace',
                  'border-amber-200'
                )}`}
              >
                <div className="pb-1 border-b border-amber-200/60">
                  <div className="flex items-center gap-1 min-w-0">
                    <FolderOpen className="w-3 h-3 text-amber-600 shrink-0" />
                    <h2 className="text-[11px] font-bold text-slate-900 truncate">
                      Workspace
                    </h2>
                  </div>
                  <div className="text-[9.5px] font-medium text-amber-800 truncate">
                    Your Room
                  </div>
                </div>

                <div className="flex-1 mt-1 min-h-[118px] max-h-[150px] overflow-y-auto pr-0.5">
                  {state.workspace.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 text-center py-4">
                      No files
                    </div>
                  ) : (
                    <div>
                      {state.workspace.map((f) => (
                        <FileStatusRow key={f.name} file={f} />
                      ))}
                    </div>
                  )}
                </div>

                {state.stash.length > 0 && (
                  <div
                    className="mt-1 pt-1 border-t border-amber-200/70 flex items-center gap-1 text-[9.5px] font-semibold text-amber-800"
                    title={state.stash[0]}
                  >
                    <Archive className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">Stash (1)</span>
                  </div>
                )}

                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                  <span>Files</span>
                  <span className="tabular-nums font-medium">{state.workspace.length}</span>
                </div>
              </div>

              {/* STAGE 2: STAGING AREA */}
              <div
                className={`flex flex-col rounded-md border bg-[#F9FCFF] p-2 min-w-0 transition-all duration-200 ${stageBorder(
                  'staging',
                  'border-sky-200'
                )}`}
              >
                <div className="pb-1 border-b border-sky-200/60">
                  <div className="flex items-center gap-1 min-w-0">
                    <Layers className="w-3 h-3 text-sky-600 shrink-0" />
                    <h2 className="text-[11px] font-bold text-slate-900 truncate">
                      Staging
                    </h2>
                  </div>
                  <div className="text-[9.5px] font-medium text-sky-800 truncate">
                    .git/index
                  </div>
                </div>

                <div className="flex-1 mt-1 min-h-[118px] max-h-[150px] overflow-y-auto pr-0.5">
                  {state.staging.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-4 px-1">
                      <span className="text-[10px] text-slate-500">Empty</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        git add
                      </span>
                    </div>
                  ) : (
                    <div>
                      {state.staging.map((f) => (
                        <FileStatusRow key={f.name} file={f} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                  <span>Staged</span>
                  <span className="tabular-nums font-medium">{state.staging.length}</span>
                </div>
              </div>

              {/* STAGE 3: LOCAL REPO */}
              <div
                className={`flex flex-col rounded-md border bg-[#F8FDFB] p-2 min-w-0 transition-all duration-200 ${stageBorder(
                  'local',
                  'border-emerald-200'
                )}`}
              >
                <div className="pb-1 border-b border-emerald-200/60 flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <HardDrive className="w-3 h-3 text-emerald-600 shrink-0" />
                      <h2 className="text-[11px] font-bold text-slate-900 truncate">
                        Local Repo
                      </h2>
                    </div>
                    <div className="text-[9.5px] font-medium text-emerald-800 truncate">
                      .git/objects
                    </div>
                  </div>
                  {state.initialized && (
                    <button
                      type="button"
                      onClick={() => setInspectDotGit((v) => !v)}
                      title="Inspect hidden .git internals"
                      className="inline-flex items-center text-[9.5px] font-mono font-semibold text-emerald-700 hover:text-emerald-950 shrink-0 cursor-pointer"
                    >
                      {inspectDotGit ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-1 pb-1 border-b border-emerald-100 flex items-center gap-1 text-[9.5px] min-w-0">
                  {state.initialized ? (
                    <>
                      <Camera className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span className="font-mono font-semibold text-emerald-800 truncate">
                        {state.headDetachedAt ? `@${state.headDetachedAt}` : state.currentBranch}
                      </span>
                    </>
                  ) : (
                    <>
                      <CameraOff className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-500 truncate">No .git</span>
                    </>
                  )}
                </div>

                {state.initialized && inspectDotGit && (
                  <div className="mt-1 pb-1 border-b border-emerald-100 text-[9px] font-mono text-slate-600 space-y-0.5">
                    <div className="truncate">user: {state.config.name || '(unset)'}</div>
                    <div className="truncate">refs: {state.branches.join(', ')}</div>
                  </div>
                )}

                <div className="flex-1 mt-1 min-h-[96px] max-h-[128px] overflow-y-auto pr-0.5">
                  {!state.initialized ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-3">
                      <span className="text-[10px] text-slate-500">Camera off</span>
                      <span className="text-[9.5px] font-mono text-emerald-700">
                        git init
                      </span>
                    </div>
                  ) : state.localCommits.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-3">
                      <span className="text-[10px] text-slate-500">0 commits</span>
                      <span className="text-[9.5px] text-slate-400 truncate max-w-full">
                        {state.config.name || 'Ready'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {state.localCommits.map((c, idx) => (
                        <div
                          key={c.id + idx}
                          className="animate-item-arrive py-0.5 border-b border-emerald-100/80 last:border-b-0"
                          title={`${c.id}: ${c.message}`}
                        >
                          <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800">
                            <GitCommitHorizontal className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{c.id}</span>
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight line-clamp-2">
                            {c.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                  <span className="inline-flex items-center gap-0.5 truncate">
                    <GitBranch className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span>{state.branches.length}</span>
                  </span>
                  <span className="tabular-nums font-medium">{state.localCommits.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NETWORK BRIDGE: LOCAL FOLDER <-> CLOUD GITHUB */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center justify-center text-slate-400 select-none gap-1"
          >
            <span className="text-[8.5px] font-mono font-semibold text-sky-600">push</span>
            <span className="text-xs leading-none text-sky-600">→</span>
            <span className="text-xs leading-none text-indigo-600">←</span>
            <span className="text-[8.5px] font-mono font-semibold text-indigo-600">pull</span>
          </div>

          {/* GROUP 2: REMOTE CLOUD SERVER (GITHUB) */}
          <div className="rounded-lg border border-indigo-200/90 bg-indigo-50/45 p-1.5 flex flex-col">
            <div className="flex items-center justify-between gap-1 px-1 pb-1.5">
              <div className="flex items-center gap-1 min-w-0">
                <Cloud className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10.5px] font-bold text-indigo-950 truncate">
                  GitHub
                </span>
              </div>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-indigo-600 whitespace-nowrap shrink-0">
                Cloud
              </span>
            </div>

            {/* STAGE 4: REMOTE REPO */}
            <div
              className={`flex flex-col flex-1 rounded-md border bg-[#FAFAFF] p-2 min-w-0 transition-all duration-200 ${stageBorder(
                'remote',
                'border-indigo-200'
              )}`}
            >
              <div className="pb-1 border-b border-indigo-200/60">
                <h2 className="text-[11px] font-bold text-slate-900 truncate">
                  Remote Repo
                </h2>
                <div className="text-[9.5px] font-medium text-indigo-700 truncate">
                  {state.remoteConnected ? 'origin linked' : 'offline'}
                </div>
              </div>

              {state.sshReady && (
                <div className="mt-1 pb-1 border-b border-indigo-100 flex items-center gap-1 text-[9.5px] text-indigo-700 font-medium">
                  <KeyRound className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">SSH Ready</span>
                </div>
              )}

              <div className="flex-1 mt-1 min-h-[118px] max-h-[150px] overflow-y-auto pr-0.5">
                {!state.remoteConnected && state.remoteCommits.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-4">
                    <span className="text-[10px] text-slate-500">Not linked</span>
                    <span className="text-[9.5px] font-mono text-indigo-600">
                      remote add
                    </span>
                  </div>
                ) : state.remoteCommits.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-4">
                    <span className="text-[10px] text-indigo-800 font-medium">Linked</span>
                    <span className="text-[9.5px] font-mono text-slate-500">
                      git push
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {state.remoteCommits.map((c, idx) => (
                      <div
                        key={c.id + idx}
                        className="animate-item-arrive py-0.5 border-b border-indigo-100/80 last:border-b-0"
                        title={`${c.id}: ${c.message}`}
                      >
                        <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-indigo-800">
                          <GitCommitHorizontal className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{c.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-700 leading-tight line-clamp-2">
                          {c.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
                <span>Vault</span>
                <span className="tabular-nums font-medium">{state.remoteCommits.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
