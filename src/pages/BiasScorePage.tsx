import SectionWrapper from '../components/SectionWrapper';
import PageHeader from '../components/PageHeader';
import PlaceholderResultCard from '../components/PlaceholderResultCard';
import SemicircleGauge from '../components/SemicircleGauge';
import CtaBlock from '../components/CtaBlock';
import { useBiasAnalysis } from '../context/BiasAnalysisContext';

const CTAS = [
  { to: '/', title: 'Text Analysis', description: 'Analyze new text' },
  { to: '/chat', title: 'Chat', description: 'Discuss bias in your text' },
  { to: '/neutral-position', title: 'Neutral Position', description: 'View neutral rewrite' },
];

export default function BiasScorePage() {
  const { biasScore, biasNotes } = useBiasAnalysis();
  const hasAnalysis = biasScore !== null;
  const score = hasAnalysis ? biasScore : 0;

  const notesToShow =
    hasAnalysis && biasNotes.length > 0
      ? biasNotes
      : hasAnalysis && biasScore === 0
        ? ['No strong bias signals were detected for this text, or it was not meaningfully evaluable for biased framing.']
        : hasAnalysis
          ? ['The model did not return specific bullet notes; the score above still reflects its overall assessment.']
          : [];

  return (
    <SectionWrapper>
      <PageHeader
        title="Bias Score"
        subtitle="A single score indicating how biased the framing of the analyzed text may be. Lower values suggest more neutral framing; higher values suggest stronger bias."
      />

      <PlaceholderResultCard title="Score" className="mb-4">
        {hasAnalysis ? (
          <div
            className="d-flex flex-column align-items-center py-3"
            role="img"
            aria-label={`Bias severity score: ${Math.round(score)} out of 100`}
          >
            <SemicircleGauge value={score} size={220} strokeWidth={16} animateEntrance />
          </div>
        ) : (
          <p className="text-muted mb-0 py-4 text-center" role="status">
            No analysis yet. Run <strong className="text-light">Analyze Text</strong> on the Text
            Analysis page to generate a bias score.
          </p>
        )}
      </PlaceholderResultCard>

      {hasAnalysis ? (
        <PlaceholderResultCard title="Why this may be biased" className="mb-4 cbd-bias-notes-card">
          <ul className="cbd-bias-notes-list list-unstyled mb-0">
            {notesToShow.map((note, i) => (
              <li key={i} className="cbd-bias-notes-item">
                <span className="cbd-bias-notes-bullet" aria-hidden>
                  ·
                </span>
                {note}
              </li>
            ))}
          </ul>
        </PlaceholderResultCard>
      ) : null}

      <CtaBlock title="Next steps" links={CTAS} largeTitles />
    </SectionWrapper>
  );
}
