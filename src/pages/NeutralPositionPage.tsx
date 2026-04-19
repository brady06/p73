import SectionWrapper from '../components/SectionWrapper';
import PageHeader from '../components/PageHeader';
import PlaceholderResultCard from '../components/PlaceholderResultCard';
import CtaBlock from '../components/CtaBlock';
import { useBiasAnalysis } from '../context/BiasAnalysisContext';

const CTAS = [
  { to: '/', title: 'Text Analysis', description: 'Analyze new text' },
  { to: '/bias-score', title: 'Bias Score', description: 'View score' },
];

export default function NeutralPositionPage() {
  const { biasScore, neutralPosition } = useBiasAnalysis();
  const hasAnalysis = biasScore !== null;
  const hasRewrite = Boolean(neutralPosition && neutralPosition.trim().length > 0);

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
            <p className="mb-0 text-light" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {neutralPosition}
            </p>
          </div>
        )}
      </PlaceholderResultCard>

      <CtaBlock title="Next steps" links={CTAS} largeTitles />
    </SectionWrapper>
  );
}
