import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { STAGE_FLOW_ROWS } from '../data/cheatSheet';
import { StageFlowRow, StageId } from '../types/git';

const BOX_CENTERS: Record<StageId, number> = {
  workspace: 125,
  staging: 365,
  local: 605,
  remote: 865,
};

export const FlowMatrix: React.FC = () => {
  const [selected, setSelected] = useState<StageFlowRow>(STAGE_FLOW_ROWS[0]);

  const forwardRows = STAGE_FLOW_ROWS.filter((r) => r.direction === 'forward');
  const backwardRows = STAGE_FLOW_ROWS.filter((r) => r.direction === 'backward');

  const x1 = BOX_CENTERS[selected.from];
  const x2 = BOX_CENTERS[selected.to];
  const midX = (x1 + x2) / 2;
  const isForward = selected.direction === 'forward';
  const arcY = isForward ? 26 : 214;
  const anchorY = isForward ? 84 : 156;
  const activeColor = isForward ? '#0284C7' : '#DC2626';

  return (
    <div className="space-y-6">
      {/* Interactive SVG 4-Stage Forward & Backward Infographic */}
      <section className="grad-card rounded-xl p-5 md:p-6">
        <div className="pb-4 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-900">
            4-Stage Forward & Backward Flow Map
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Click any command row below to illuminate its exact route between Workspace, Staging Area, Local Repo, and Remote Repo.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox="0 0 990 245"
            className="w-full min-w-[700px] h-[240px]"
            role="img"
            aria-label="Four-stage Git forward and backward flow diagram"
          >
            <defs>
              <marker
                id="fm-arrow-fwd"
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
                id="fm-arrow-bwd"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
              </marker>
              <linearGradient id="fm-grad-workspace" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FB7185" />
              </linearGradient>
              <linearGradient id="fm-grad-staging" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
              <linearGradient id="fm-grad-local" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
              <linearGradient id="fm-grad-remote" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>

            {/* Stage Boxes */}
            {(
              [
                { id: 'workspace', title: 'Workspace', sub: 'Working Directory', x: 45, fill: '#FFFDF9', stroke: 'url(#fm-grad-workspace)', text: '#92400E' },
                { id: 'staging', title: 'Staging Area', sub: 'Git Index', x: 285, fill: '#F9FCFF', stroke: 'url(#fm-grad-staging)', text: '#075985' },
                { id: 'local', title: 'Local Repo', sub: '.git History', x: 525, fill: '#F8FDFB', stroke: 'url(#fm-grad-local)', text: '#065F46' },
                { id: 'remote', title: 'Remote Repo', sub: 'GitHub Origin', x: 785, fill: '#FAFAFF', stroke: 'url(#fm-grad-remote)', text: '#3730A3' },
              ] as const
            ).map((box) => {
              const isEndpoint = selected.from === box.id || selected.to === box.id;
              return (
                <g key={box.id}>
                  <rect
                    x={box.x}
                    y="84"
                    width="160"
                    height="72"
                    rx="12"
                    fill={box.fill}
                    stroke={box.stroke}
                    strokeWidth={isEndpoint ? '3' : '2'}
                  />
                  <text
                    x={box.x + 80}
                    y="116"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="#0F172A"
                  >
                    {box.title}
                  </text>
                  <text
                    x={box.x + 80}
                    y="136"
                    textAnchor="middle"
                    fontSize="11"
                    fill={box.text}
                  >
                    {box.sub}
                  </text>
                </g>
              );
            })}

            {/* Subtle static connectors */}
            <line x1="205" y1="120" x2="285" y2="120" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="445" y1="120" x2="525" y2="120" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="685" y1="120" x2="785" y2="120" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Highlighted Selected Route Arc */}
            <path
              d={`M ${x1} ${anchorY} Q ${midX} ${arcY} ${x2} ${anchorY}`}
              fill="none"
              stroke={activeColor}
              strokeWidth="3"
              className={isForward ? 'animate-flow-forward' : 'animate-flow-backward'}
              markerEnd={isForward ? 'url(#fm-arrow-fwd)' : 'url(#fm-arrow-bwd)'}
            />

            {/* Active Command Label on Arc */}
            <rect
              x={midX - 135}
              y={isForward ? 8 : 204}
              width="270"
              height="28"
              rx="6"
              fill="#FFFFFF"
              stroke={activeColor}
              strokeWidth="1.5"
            />
            <text
              x={midX}
              y={isForward ? 26 : 222}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={activeColor}
              fontFamily="var(--font-mono)"
            >
              {selected.command}
            </text>
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
          <div>
            <span className="font-semibold text-slate-900">Selected Route:</span>{' '}
            {selected.fromLabel} → {selected.toLabel} · {selected.purpose}
          </div>
          <span
            className={`font-semibold ${
              selected.safety === 'Destructive'
                ? 'text-rose-700'
                : selected.safety === 'Caution'
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            Safety: {selected.safety}
          </span>
        </div>
      </section>

      {/* Two-Column Forward vs Backward Command Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Forward Commands */}
        <section className="grad-card-sky rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ArrowRight className="w-4 h-4 text-sky-600 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900">
              1. Forward Commands (Advance Changes)
            </h2>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {forwardRows.map((row) => {
              const active = selected.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row)}
                  className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors cursor-pointer ${
                    active ? 'bg-sky-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs font-semibold text-sky-900">
                      {row.command}
                    </code>
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
                      {row.fromLabel} → {row.toLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{row.purpose}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Backward Commands */}
        <section className="grad-card-rose rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ArrowLeft className="w-4 h-4 text-rose-600 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900">
              2. Backward Commands (Undo & Rewind)
            </h2>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {backwardRows.map((row) => {
              const active = selected.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row)}
                  className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors cursor-pointer ${
                    active ? 'bg-rose-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs font-semibold text-rose-900">
                      {row.command}
                    </code>
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
                      {row.fromLabel} → {row.toLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-slate-600">{row.purpose}</p>
                    {row.safety === 'Destructive' && (
                      <span className="text-[11px] font-semibold text-rose-700 shrink-0">
                        Destructive
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Crucial Shared-History Safety Callout */}
      <section className="grad-card-amber rounded-xl p-4 md:p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm text-amber-950 leading-relaxed">
          <strong className="font-semibold">Shared Remote Safety Rule:</strong>{' '}
          <code className="font-mono text-xs bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">
            git reset
          </code>{' '}
          alone does NOT undo a commit already pushed to GitHub. Rewriting remote history requires{' '}
          <code className="font-mono text-xs bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">
            git push --force-with-lease
          </code>
          . For any shared repository, always prefer{' '}
          <code className="font-mono text-xs bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">
            git revert HEAD
          </code>{' '}
          so your team’s history never breaks.
        </div>
      </section>
    </div>
  );
};
