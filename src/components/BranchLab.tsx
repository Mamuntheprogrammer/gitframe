import React, { useState } from 'react';
import {
  GitBranch,
  GitMerge,
  GitCommitHorizontal,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';

type MergeDemoMode = 'fast-forward' | 'three-way' | 'rebase' | 'cherry-pick';

interface GraphCommit {
  id: string;
  label: string;
  lane: 0 | 1; // 0 = main, 1 = feature
  col: number;
  parents: string[];
  isMerge?: boolean;
  isRebased?: boolean;
  isCherry?: boolean;
}

const MERGE_SCENARIOS: Record<
  MergeDemoMode,
  {
    title: string;
    command: string;
    whenItHappens: string;
    result: string;
    beforeCommits: GraphCommit[];
    afterCommits: GraphCommit[];
    beforeHeads: { main: string; feature: string };
    afterHeads: { main: string; feature: string };
  }
> = {
  'fast-forward': {
    title: 'Fast-Forward Merge',
    command: 'git checkout main && git merge feature',
    whenItHappens:
      'No new commits were added to main after you created the feature branch.',
    result:
      'Git simply slides the main pointer straight forward to match feature. Zero extra merge commits, completely linear history.',
    beforeCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Layout', lane: 0, col: 1, parents: ['c1'] },
      { id: 'f1', label: 'f1 Nav', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Auth', lane: 1, col: 3, parents: ['f1'] },
    ],
    afterCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Layout', lane: 0, col: 1, parents: ['c1'] },
      { id: 'f1', label: 'f1 Nav', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Auth', lane: 0, col: 3, parents: ['f1'] },
    ],
    beforeHeads: { main: 'c2', feature: 'f2' },
    afterHeads: { main: 'f2', feature: 'f2' },
  },
  'three-way': {
    title: '3-Way Merge Commit',
    command: 'git checkout main && git merge feature',
    whenItHappens:
      'Both main AND feature received new commits after diverging from their common ancestor (c2).',
    result:
      'Git creates a brand-new Merge Commit (m1) with TWO parents (c3 and f2), preserving exact branch history.',
    beforeCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1', label: 'f1 Cart', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Pay', lane: 1, col: 3, parents: ['f1'] },
    ],
    afterCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1', label: 'f1 Cart', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Pay', lane: 1, col: 3, parents: ['f1'] },
      { id: 'm1', label: 'm1 Merge', lane: 0, col: 4, parents: ['c3', 'f2'], isMerge: true },
    ],
    beforeHeads: { main: 'c3', feature: 'f2' },
    afterHeads: { main: 'm1', feature: 'f2' },
  },
  rebase: {
    title: 'Rebase (Linear Replay)',
    command: 'git checkout feature && git rebase main',
    whenItHappens:
      'You want to replay your unpushed feature commits cleanly on top of the latest main without a merge bubble.',
    result:
      'Git replays f1 and f2 as brand-new commits (f1′, f2′) directly ahead of c3. Never rebase shared/pushed branches!',
    beforeCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1', label: 'f1 UI', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Test', lane: 1, col: 3, parents: ['f1'] },
    ],
    afterCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Hotfix', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1p', label: "f1' UI", lane: 0, col: 3, parents: ['c3'], isRebased: true },
      { id: 'f2p', label: "f2' Test", lane: 0, col: 4, parents: ['f1p'], isRebased: true },
    ],
    beforeHeads: { main: 'c3', feature: 'f2' },
    afterHeads: { main: 'c3', feature: 'f2p' },
  },
  'cherry-pick': {
    title: 'Cherry-Pick Single Commit',
    command: 'git checkout main && git cherry-pick f2',
    whenItHappens:
      'You only need ONE bug-fix commit (f2) from an unfinished feature branch — without merging the rest of feature.',
    result:
      'Git copies only commit f2 and applies it onto main as a new snapshot (f2′), leaving f1 behind on feature.',
    beforeCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Docs', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1', label: 'f1 WIP', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Fix', lane: 1, col: 3, parents: ['f1'] },
    ],
    afterCommits: [
      { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
      { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
      { id: 'c3', label: 'c3 Docs', lane: 0, col: 2, parents: ['c2'] },
      { id: 'f1', label: 'f1 WIP', lane: 1, col: 2, parents: ['c2'] },
      { id: 'f2', label: 'f2 Fix', lane: 1, col: 3, parents: ['f1'] },
      { id: 'cp', label: "f2' Pick", lane: 0, col: 4, parents: ['c3'], isCherry: true },
    ],
    beforeHeads: { main: 'c3', feature: 'f2' },
    afterHeads: { main: 'cp', feature: 'f2' },
  },
};

function CommitGraphSvg({
  commits,
  heads,
  activeBranch,
}: {
  commits: GraphCommit[];
  heads: { main: string; feature?: string };
  activeBranch?: 'main' | 'feature';
}) {
  const colSpacing = 148;
  const startX = 76;
  const laneY = (lane: 0 | 1) => (lane === 0 ? 74 : 158);
  const posById = new Map<string, { x: number; y: number }>();
  commits.forEach((c) => {
    posById.set(c.id, { x: startX + c.col * colSpacing, y: laneY(c.lane) });
  });

  const maxCol = Math.max(4, ...commits.map((c) => c.col));
  const width = Math.max(760, startX * 2 + maxCol * colSpacing);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} 225`}
        className="w-full min-w-[640px] h-[220px]"
        role="img"
        aria-label="Interactive Git commit and branch DAG visualization"
      >
        {/* Lane guide rails */}
        <line x1="28" y1="74" x2={width - 28} y2="74" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="28" y1="158" x2={width - 28} y2="158" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />

        <text x="16" y="42" fontSize="11" fontWeight="600" fill="#059669">
          main lane
        </text>
        <text x="16" y="196" fontSize="11" fontWeight="600" fill="#0284C7">
          feature lane
        </text>

        {/* Edges */}
        {commits.map((c) => {
          const to = posById.get(c.id)!;
          return c.parents.map((pid) => {
            const from = posById.get(pid);
            if (!from) return null;
            const isCrossLane = from.y !== to.y;
            const midX = (from.x + to.x) / 2;
            const pathD = isCrossLane
              ? `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
              : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
            return (
              <path
                key={`${pid}-${c.id}`}
                d={pathD}
                fill="none"
                stroke={c.isMerge ? '#4F46E5' : c.lane === 1 ? '#0284C7' : '#059669'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          });
        })}

        {/* Commit Nodes */}
        {commits.map((c) => {
          const pos = posById.get(c.id)!;
          const isMainHead = heads.main === c.id;
          const isFeatHead = heads.feature === c.id;
          const fill = c.isMerge
            ? '#4F46E5'
            : c.isCherry
            ? '#D97706'
            : c.isRebased
            ? '#0284C7'
            : c.lane === 1
            ? '#0284C7'
            : '#059669';

          return (
            <g key={c.id} className="transition-all duration-200">
              <circle
                cx={pos.x}
                cy={pos.y}
                r="17"
                fill="#FFFFFF"
                stroke={fill}
                strokeWidth="3"
              />
              <circle cx={pos.x} cy={pos.y} r="6" fill={fill} />

              {/* Node Label */}
              <text
                x={pos.x}
                y={pos.y + 34}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#0F172A"
                fontFamily="var(--font-mono)"
              >
                {c.label}
              </text>

              {/* Branch Pointer Tags */}
              {isMainHead && (
                <g transform={`translate(${pos.x}, ${pos.y - 42})`}>
                  <rect
                    x="-34"
                    y="-12"
                    width="68"
                    height="22"
                    rx="4"
                    fill={activeBranch === 'main' ? '#0F172A' : '#059669'}
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#FFFFFF"
                    fontFamily="var(--font-mono)"
                  >
                    {activeBranch === 'main' ? 'HEAD:main' : 'main'}
                  </text>
                </g>
              )}

              {isFeatHead && (
                <g
                  transform={`translate(${pos.x}, ${
                    isMainHead ? pos.y - 68 : pos.y - 42
                  })`}
                >
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="22"
                    rx="4"
                    fill={activeBranch === 'feature' ? '#0F172A' : '#0284C7'}
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#FFFFFF"
                    fontFamily="var(--font-mono)"
                  >
                    {activeBranch === 'feature' ? 'HEAD:feat' : 'feature'}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const BranchLab: React.FC = () => {
  // Section 1: Merge Types Visual Comparison
  const [mergeMode, setMergeMode] = useState<MergeDemoMode>('fast-forward');
  const [applied, setApplied] = useState(false);

  const scenario = MERGE_SCENARIOS[mergeMode];

  // Section 2: Interactive Live Branch Playground
  const initialSandbox: GraphCommit[] = [
    { id: 'c1', label: 'c1 Init', lane: 0, col: 0, parents: [] },
    { id: 'c2', label: 'c2 Base', lane: 0, col: 1, parents: ['c1'] },
  ];
  const [sandboxCommits, setSandboxCommits] = useState<GraphCommit[]>(initialSandbox);
  const [sandboxHeads, setSandboxHeads] = useState<{ main: string; feature?: string }>({
    main: 'c2',
  });
  const [activeBranch, setActiveBranch] = useState<'main' | 'feature'>('main');
  const [sandboxLog, setSandboxLog] = useState<string>(
    'Ready — create a feature branch, add commits, switch branches, or merge!'
  );

  const nextCol = () => Math.max(...sandboxCommits.map((c) => c.col)) + 1;

  const handleCreateBranch = () => {
    if (sandboxHeads.feature) {
      setSandboxLog('Branch "feature" already exists. Switch to it or commit on it!');
      return;
    }
    setSandboxHeads((h) => ({ ...h, feature: h.main }));
    setActiveBranch('feature');
    setSandboxLog('$ git checkout -b feature — Created and switched to feature branch.');
  };

  const handleSwitchBranch = () => {
    if (!sandboxHeads.feature) {
      setSandboxLog('Create the "feature" branch first before switching.');
      return;
    }
    const next = activeBranch === 'main' ? 'feature' : 'main';
    setActiveBranch(next);
    setSandboxLog(`$ git checkout ${next} — Moved HEAD to ${next}.`);
  };

  const handleAddCommit = () => {
    const count = sandboxCommits.length + 1;
    if (count > 7) {
      setSandboxLog('Graph reached sandbox display capacity (7 commits). Click Reset Graph to experiment again.');
      return;
    }
    const parentId = activeBranch === 'main' ? sandboxHeads.main : sandboxHeads.feature!;
    const newId = `${activeBranch === 'main' ? 'c' : 'f'}${count}`;
    const newNode: GraphCommit = {
      id: newId,
      label: `${newId} ${activeBranch === 'main' ? 'Main' : 'Feat'}`,
      lane: activeBranch === 'main' ? 0 : 1,
      col: nextCol(),
      parents: [parentId],
    };
    setSandboxCommits((prev) => [...prev, newNode]);
    setSandboxHeads((h) =>
      activeBranch === 'main' ? { ...h, main: newId } : { ...h, feature: newId }
    );
    setSandboxLog(`$ git commit -m "${newNode.label}" — Recorded snapshot on ${activeBranch}.`);
  };

  const handleMergeIntoMain = () => {
    if (!sandboxHeads.feature) {
      setSandboxLog('No feature branch exists yet to merge.');
      return;
    }
    if (sandboxHeads.main === sandboxHeads.feature) {
      setSandboxLog('Already up to date — main and feature point to the same commit.');
      return;
    }
    const mainCommit = sandboxCommits.find((c) => c.id === sandboxHeads.main);
    const featCommit = sandboxCommits.find((c) => c.id === sandboxHeads.feature);
    if (!mainCommit || !featCommit) return;

    // Check if mainCommit is an ancestor of featCommit (Fast-Forward)
    const isAncestor = (targetId: string, startId: string): boolean => {
      const visited = new Set<string>();
      const queue = [startId];
      while (queue.length) {
        const cur = queue.shift()!;
        if (cur === targetId) return true;
        if (visited.has(cur)) continue;
        visited.add(cur);
        const node = sandboxCommits.find((n) => n.id === cur);
        if (node) queue.push(...node.parents);
      }
      return false;
    };

    setActiveBranch('main');
    if (isAncestor(sandboxHeads.main, sandboxHeads.feature)) {
      setSandboxHeads((h) => ({ ...h, main: h.feature! }));
      setSandboxLog('$ git merge feature — Fast-Forward! Slid main pointer forward linearly.');
    } else {
      const mId = `m${sandboxCommits.length + 1}`;
      const mergeNode: GraphCommit = {
        id: mId,
        label: `${mId} Merge`,
        lane: 0,
        col: nextCol(),
        parents: [sandboxHeads.main, sandboxHeads.feature],
        isMerge: true,
      };
      setSandboxCommits((prev) => [...prev, mergeNode]);
      setSandboxHeads((h) => ({ ...h, main: mId }));
      setSandboxLog(`$ git merge feature — Created 3-Way Merge Commit (${mId}) joining main & feature.`);
    }
  };

  const handleDeleteFeature = () => {
    if (!sandboxHeads.feature) {
      setSandboxLog('No feature branch to delete.');
      return;
    }
    if (activeBranch === 'feature') {
      setSandboxLog('Switch to "main" before deleting "feature"!');
      return;
    }
    setSandboxHeads((h) => ({ main: h.main }));
    setSandboxLog('$ git branch -d feature — Deleted feature pointer (commits remain safely in graph).');
  };

  const handleResetSandbox = () => {
    setSandboxCommits(initialSandbox);
    setSandboxHeads({ main: 'c2' });
    setActiveBranch('main');
    setSandboxLog('Sandbox reset to initial 2-commit main history.');
  };

  return (
    <div className="space-y-6">
      {/* Part 1: Merge Types Visual Explainer */}
      <section className="grad-card rounded-xl p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Different Types of Merge & Branch Integration
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Compare Fast-Forward, 3-Way Merge, Rebase, and Cherry-Pick side-by-side in an interactive SVG graph.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
            {(
              [
                ['fast-forward', 'Fast-Forward'],
                ['three-way', '3-Way Merge'],
                ['rebase', 'Rebase'],
                ['cherry-pick', 'Cherry-Pick'],
              ] as [MergeDemoMode, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMergeMode(key);
                  setApplied(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mergeMode === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <CommitGraphSvg
            commits={applied ? scenario.afterCommits : scenario.beforeCommits}
            heads={applied ? scenario.afterHeads : scenario.beforeHeads}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {scenario.title}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <code className="font-mono text-xs text-sky-800">
                {scenario.command}
              </code>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">When:</strong> {scenario.whenItHappens}{' '}
              <strong className="text-slate-800">Result:</strong> {scenario.result}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setApplied((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              applied
                ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>{applied ? 'Show Before State' : `Simulate ${scenario.title}`}</span>
          </button>
        </div>
      </section>

      {/* Part 2: Free Interactive Branching Sandbox */}
      <section className="grad-card rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Live Branching Playground
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Build your own commit history: branch out, switch HEAD, commit on either lane, merge, and delete branches.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetSandbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Graph</span>
          </button>
        </div>

        <div className="mt-4">
          <CommitGraphSvg
            commits={sandboxCommits}
            heads={sandboxHeads}
            activeBranch={activeBranch}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleCreateBranch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>git checkout -b feature</span>
          </button>
          <button
            type="button"
            onClick={handleAddCommit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GitCommitHorizontal className="w-3.5 h-3.5" />
            <span>git commit (on {activeBranch})</span>
          </button>
          <button
            type="button"
            onClick={handleSwitchBranch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Switch to {activeBranch === 'main' ? 'feature' : 'main'}</span>
          </button>
          <button
            type="button"
            onClick={handleMergeIntoMain}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>git merge feature → main</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteFeature}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>git branch -d feature</span>
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-[#0F172A] text-sky-300 font-mono text-xs px-4 py-2.5">
          {sandboxLog}
        </div>
      </section>
    </div>
  );
};
