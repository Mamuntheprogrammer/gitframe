import React, { useState } from 'react';
import { BookOpen, Tag, SlidersHorizontal, Lightbulb } from 'lucide-react';
import { LanguageMode, LessonStep } from '../types/git';
import { LESSONS_BN } from '../data/lessonsBn';

interface TheoryPanelProps {
  lesson: LessonStep;
  lang: LanguageMode;
}

type TheoryTab = 'story' | 'vocabulary' | 'flags';

function renderFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="font-mono text-[12px] bg-slate-100 text-slate-900 px-1 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const TheoryPanel: React.FC<TheoryPanelProps> = ({ lesson, lang }) => {
  const [activeTab, setActiveTab] = useState<TheoryTab>('story');
  const bn = lang === 'bn' ? LESSONS_BN[lesson.stepNumber] : undefined;
  const storyTitle = bn ? bn.storyTitle : lesson.storyTitle;
  const storyText = bn ? bn.storyText : lesson.storyText;
  const theorySummary = bn ? bn.theorySummary : lesson.theorySummary;
  const proTip = bn ? bn.proTip : lesson.proTip;

  return (
    <section
      aria-label="Story, Theory, Vocabulary, and Flags"
      className="grad-card rounded-xl p-5 md:p-6 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      {/* Header + Segmented View Selector (pinned at top of 55% column) */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Step {lesson.stepNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{lesson.category}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            {lesson.title}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {lesson.subtitle}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Lesson explanation sections"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'story'}
            onClick={() => setActiveTab('story')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'story'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Story &amp; Concept</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vocabulary'}
            onClick={() => setActiveTab('vocabulary')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'vocabulary'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Vocabulary ({lesson.vocabulary.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'flags'}
            onClick={() => setActiveTab('flags')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'flags'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Flags &amp; Best Use ({lesson.flags.length})</span>
          </button>
        </div>
      </div>

      {/* Spacious Internally Scrollable Reading Area */}
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
        {activeTab === 'story' && (
          <div className="space-y-6" lang={lang === 'bn' ? 'bn' : 'en'}>
            {/* CCTV Room Story */}
            {(storyTitle || storyText) && (
              <div>
                {storyTitle && (
                  <h3 className="text-sm font-semibold text-slate-900">
                    {storyTitle}
                  </h3>
                )}
                {storyText && (
                  <p
                    className={`mt-2 text-[15px] text-slate-700 ${
                      lang === 'bn' ? 'leading-[1.85]' : 'leading-7'
                    }`}
                  >
                    {renderFormattedText(storyText)}
                  </p>
                )}
              </div>
            )}

            {/* Technical Theory */}
            <div className={(storyTitle || storyText) ? 'pt-5 border-t border-slate-100' : ''}>
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'bn'
                  ? 'আসলে ভেতরে কী ঘটে?'
                  : 'How Git Works Under the Hood'}
              </h3>
              <div
                className={`mt-2 text-[15px] text-slate-700 whitespace-pre-line ${
                  lang === 'bn' ? 'leading-[1.85]' : 'leading-7'
                }`}
              >
                {renderFormattedText(theorySummary)}
              </div>
            </div>

            {/* Pro Tip */}
            <div className="pt-5 border-t border-slate-100 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
              <div
                className={`text-sm text-slate-700 ${
                  lang === 'bn' ? 'leading-[1.8]' : 'leading-relaxed'
                }`}
              >
                <span className="font-semibold text-slate-900">
                  {lang === 'bn' ? 'Practical Tip: ' : 'Practical Tip: '}
                </span>
                {renderFormattedText(proTip)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4 w-[28%]">Term</th>
                  <th className="py-2.5 px-4 w-[38%]">Technical Meaning</th>
                  <th className="py-2.5 pl-4">CCTV Room Analogy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lesson.vocabulary.map((v) => (
                  <tr key={v.term}>
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 align-top">
                      {v.term}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {renderFormattedText(v.meaning)}
                    </td>
                    <td className="py-3.5 pl-4 text-slate-600 align-top leading-relaxed">
                      {renderFormattedText(v.analogy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'flags' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Flag</th>
                  <th className="py-2.5 px-4">Example</th>
                  <th className="py-2.5 px-4">What It Does</th>
                  <th className="py-2.5 pl-4">Best Way to Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lesson.flags.map((f) => (
                  <tr key={f.flag}>
                    <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-sky-800 align-top whitespace-nowrap">
                      {f.flag}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-800 align-top whitespace-nowrap">
                      {f.syntax}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {renderFormattedText(f.purpose)}
                    </td>
                    <td className="py-3.5 pl-4 text-slate-600 align-top leading-relaxed">
                      {renderFormattedText(f.bestPractice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
