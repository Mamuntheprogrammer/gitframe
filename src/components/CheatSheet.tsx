import React, { useState, useMemo } from 'react';
import { Copy, Check, Search } from 'lucide-react';
import { CHEAT_SHEET } from '../data/cheatSheet';
import { CheatSheetItem } from '../types/git';

const CATEGORIES: Array<'All' | CheatSheetItem['category']> = [
  'All',
  'Setup',
  'Daily Workflow',
  'Inspect & Diff',
  'Undo & Recovery',
  'Branch & Merge',
  'Remote & SSH',
  'Stash & Clean',
];

export const CheatSheet: React.FC = () => {
  const [category, setCategory] = useState<'All' | CheatSheetItem['category']>('All');
  const [query, setQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHEAT_SHEET.filter((item) => {
      const catMatch = category === 'All' || item.category === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.command.toLowerCase().includes(q) ||
        (item.shorthand && item.shorthand.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCmd(text);
    setTimeout(() => {
      setCopiedCmd((cur) => (cur === text ? null : cur));
    }, 1400);
  };

  return (
    <div className="space-y-6">
      {/* Quick Reference Header + Filters */}
      <section className="grad-card rounded-xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Practical Git Infographic Cheat Sheet
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Most-used commands, practical shorthands, SSH setup, and recovery recipes — click any command to copy.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter commands (e.g. reset, stash, ssh)..."
              aria-label="Filter Git commands"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Segmented Filter */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* High-Contrast Quick Shorthand Reference Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Commit → Staging', cmd: 'git reset --soft HEAD~1' },
            { label: 'Commit → Workspace', cmd: 'git reset HEAD~1' },
            { label: 'Staging → Workspace', cmd: 'git restore --staged .' },
            { label: 'Workspace → Last Commit', cmd: 'git restore .' },
          ].map((quick) => (
            <div
              key={quick.cmd}
              className="rounded-lg grad-card-subtle px-3.5 py-2.5 flex flex-col justify-between"
            >
              <span className="text-[11px] font-medium text-slate-500">
                {quick.label}
              </span>
              <code className="font-mono text-xs font-semibold text-slate-900 mt-1">
                {quick.cmd}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Cheat Sheet Command Table */}
      <section className="grad-card rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
          <span>Showing {filtered.length} practical commands</span>
          <span>Click Copy on any row</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No Git commands match "{query}". Try clearing the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 px-4">Command</th>
                  <th className="py-3 px-4">Practical Shorthand</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 pl-4 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => {
                  const isCopied = copiedCmd === item.command;
                  return (
                    <tr key={item.command} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap align-top">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap align-top">
                        {item.command}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-sky-800 whitespace-nowrap align-top">
                        {item.shorthand || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 leading-relaxed align-top">
                        {item.description}
                      </td>
                      <td className="py-3 pl-4 text-right align-top">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.command)}
                          aria-label={`Copy ${item.command}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
