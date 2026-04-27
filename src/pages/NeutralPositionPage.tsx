import { Fragment, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import SectionWrapper from '../components/SectionWrapper';
import PageHeader from '../components/PageHeader';
import PlaceholderResultCard from '../components/PlaceholderResultCard';
import CtaBlock from '../components/CtaBlock';
import { useBiasAnalysis } from '../context/BiasAnalysisContext';

const CTAS = [
  { to: '/', title: 'Text Analysis', description: 'Analyze new text' },
  { to: '/bias-score', title: 'Bias Score', description: 'View score' },
];

type Highlight = { phrase: string; reason: string };
type RewriteChange = { from: string; to: string; whyBetter: string };

function collectMatches(text: string, phrases: Highlight[]) {
  const matches: Array<{ start: number; end: number; phrase: string; reason: string }> = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  const sorted = [...phrases]
    .filter((item) => item.phrase.trim().length >= 2)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  for (const item of sorted) {
    const phrase = item.phrase.trim();
    const lowerPhrase = phrase.toLowerCase();
    const lowerText = text.toLowerCase();
    let from = 0;

    while (from < text.length) {
      const at = lowerText.indexOf(lowerPhrase, from);
      if (at === -1) break;
      const end = at + phrase.length;
      const overlaps = usedRanges.some((r) => at < r.end && end > r.start);
      if (!overlaps) {
        matches.push({ start: at, end, phrase, reason: item.reason });
        usedRanges.push({ start: at, end });
      }
      from = at + phrase.length;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function renderHighlightedText(text: string, phrases: Highlight[]) {
  const matches = collectMatches(text, phrases);
  if (matches.length === 0) {
    return <span>{text}</span>;
  }

  const nodes: JSX.Element[] = [];
  let cursor = 0;
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    if (match.start > cursor) {
      nodes.push(<Fragment key={`t-${i}`}>{text.slice(cursor, match.start)}</Fragment>);
    }
    nodes.push(
      <mark
        key={`m-${i}`}
        className="cbd-biased-mark"
        title={match.reason || 'Potentially biased phrasing'}
        aria-label={`${match.phrase}. ${match.reason || 'Potentially biased phrasing.'}`}
      >
        {text.slice(match.start, match.end)}
      </mark>,
    );
    cursor = match.end;
  }
  if (cursor < text.length) {
    nodes.push(<Fragment key="t-end">{text.slice(cursor)}</Fragment>);
  }
  return nodes;
}

function collectRewriteMatches(
  text: string,
  changes: RewriteChange[],
): Array<{ start: number; end: number; to: string; whyBetter: string; from: string }> {
  const matches: Array<{ start: number; end: number; to: string; whyBetter: string; from: string }> = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  const sorted = [...changes]
    .filter((item) => item.to.trim().length >= 2)
    .sort((a, b) => b.to.length - a.to.length);

  const lowerText = text.toLowerCase();
  for (const item of sorted) {
    const to = item.to.trim();
    const lowerTo = to.toLowerCase();
    let fromIdx = 0;

    while (fromIdx < text.length) {
      const at = lowerText.indexOf(lowerTo, fromIdx);
      if (at === -1) break;
      const end = at + to.length;
      const overlaps = usedRanges.some((r) => at < r.end && end > r.start);
      if (!overlaps) {
        matches.push({ start: at, end, to, whyBetter: item.whyBetter, from: item.from });
        usedRanges.push({ start: at, end });
        break;
      }
      fromIdx = at + to.length;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function renderHighlightedRewrite(text: string, changes: RewriteChange[]) {
  const matches = collectRewriteMatches(text, changes);
  if (matches.length === 0) {
    return <span>{text}</span>;
  }

  const nodes: JSX.Element[] = [];
  let cursor = 0;
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    if (match.start > cursor) {
      nodes.push(<Fragment key={`rw-t-${i}`}>{text.slice(cursor, match.start)}</Fragment>);
    }
    nodes.push(
      <mark
        key={`rw-m-${i}`}
        className="cbd-rewrite-mark"
        title={match.whyBetter || 'More neutral framing'}
        aria-label={`${match.to}. ${match.whyBetter || 'More neutral framing.'}`}
      >
        {text.slice(match.start, match.end)}
      </mark>,
    );
    cursor = match.end;
  }
  if (cursor < text.length) {
    nodes.push(<Fragment key="rw-t-end">{text.slice(cursor)}</Fragment>);
  }
  return nodes;
}

export default function NeutralPositionPage() {
  const { biasScore, neutralPosition, analysisText, biasedPhrases, rewriteChanges } = useBiasAnalysis();
  const hasAnalysis = biasScore !== null;
  const hasRewrite = Boolean(neutralPosition && neutralPosition.trim().length > 0);
  const hasHighlights = biasedPhrases.length > 0 && analysisText.trim().length > 0;
  const rewriteMatches = useMemo(
    () => collectRewriteMatches(neutralPosition ?? '', rewriteChanges),
    [neutralPosition, rewriteChanges],
  );
  const hasRewriteHighlights = rewriteMatches.length > 0 && hasRewrite;
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopyNeutralRewrite = async () => {
    if (!neutralPosition || !neutralPosition.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(neutralPosition);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  return (
    <SectionWrapper>
      <PageHeader
        title="Neutral Position"
        subtitle="A more neutral framing of the same content, so you can compare the original text with a less biased version."
      />

      <p className="text-muted small mb-4" style={{ maxWidth: '42rem' }}>
        This version aims to preserve the subject while reducing emotionally loaded or one-sided framing.
        It is generated automatically and may omit nuance—use it as a comparison aid, not as a final authority.
      </p>

      <PlaceholderResultCard title="Original text (highlighted phrases)" className="mb-4">
        {!hasAnalysis ? (
          <p className="text-muted mb-0 py-4 text-center" role="status">
            No highlighted original text yet. Run <strong className="text-light">Analyze Text</strong>{' '}
            on the Text Analysis page first.
          </p>
        ) : (
          <div className="cbd-neutral-rewrite p-4 rounded border" role="region" aria-label="Original text with highlighted phrases">
            <p className="mb-0 text-light" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {renderHighlightedText(analysisText, biasedPhrases)}
            </p>
          </div>
        )}
        {hasAnalysis && !hasHighlights ? (
          <p className="text-muted small mt-3 mb-0">
            The model did not return specific phrase-level highlights for this analysis.
          </p>
        ) : null}
        {hasHighlights ? (
          <div className="mt-3">
            <h2 className="h6 fw-semibold mb-2 cbd-legend-heading">Why phrases were highlighted</h2>
            <ul className="list-unstyled mb-0 cbd-highlight-legend">
              {biasedPhrases.map((item, i) => (
                <li key={`${item.phrase}-${i}`} className="cbd-highlight-legend__item">
                  <span className="cbd-highlight-legend__phrase">"{item.phrase}"</span>
                  <span className="text-muted"> - {item.reason || 'Potentially biased phrasing'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PlaceholderResultCard>

      <PlaceholderResultCard title="Neutral rewrite" className="mb-4">
        {!hasAnalysis ? (
          <p className="text-muted mb-0 py-4 text-center" role="status">
            No neutral rewrite available yet. Run <strong className="text-light">Analyze Text</strong> on
            the Text Analysis page first.
          </p>
        ) : !hasRewrite ? (
          <p className="text-muted mb-0 py-4 text-center" role="status">
            No rewrite was returned for this analysis (for example, when no meaningful bias was detected).
          </p>
        ) : (
          <div className="cbd-neutral-rewrite p-4 rounded border" role="region" aria-label="Neutral rewrite text">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <p className="mb-0 text-muted small">
                Copy this version to compare side-by-side with the original text.
              </p>
              <Button
                type="button"
                variant="outline-info"
                size="sm"
                onClick={() => void handleCopyNeutralRewrite()}
              >
                {copyStatus === 'copied'
                  ? 'Copied'
                  : copyStatus === 'error'
                    ? 'Copy failed'
                    : 'Copy rewrite'}
              </Button>
            </div>
            <p className="mb-0 text-light" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {renderHighlightedRewrite(
                neutralPosition ?? '',
                rewriteMatches.map((m) => ({ from: m.from, to: m.to, whyBetter: m.whyBetter })),
              )}
            </p>
          </div>
        )}
        {hasRewriteHighlights ? (
          <div className="mt-3">
            <h2 className="h6 fw-semibold mb-2 cbd-legend-heading">Reframed sections and why</h2>
            <ul className="list-unstyled mb-0 cbd-rewrite-legend">
              {rewriteMatches.map((change, i) => (
                <li key={`${change.from}-${change.to}-${i}`} className="cbd-rewrite-legend__item">
                  <span className="cbd-rewrite-legend__from">"{change.from}"</span>
                  <span className="text-muted"> to </span>
                  <span className="cbd-rewrite-legend__to">"{change.to}"</span>
                  <span className="text-muted"> - {change.whyBetter || 'More neutral framing.'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PlaceholderResultCard>

      <CtaBlock title="Next steps" links={CTAS} largeTitles />
    </SectionWrapper>
  );
}
