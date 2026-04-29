import { useState } from 'react';
import { Alert, Form, Row, Col } from 'react-bootstrap';
import { requestBiasAnalysis } from '../api/biasScore';
import AnalyzeTextButton from '../components/AnalyzeTextButton';
import { useBiasAnalysis } from '../context/BiasAnalysisContext';
import SectionWrapper from '../components/SectionWrapper';
import Hero from '../components/Hero';
import NextStepCta from '../components/NextStepCta';

const LOG = '[analyze]';

export default function TextAnalysisPage() {
  const {
    analysisText: text,
    setAnalysisText,
    analysisStatus,
    setAnalysisStatus,
    analysisError,
    setAnalysisError,
    setBiasScore,
    setBiasNotes,
    setBiasedPhrases,
    setRewriteChanges,
    setNeutralPosition,
    clearAnalysisResults,
  } = useBiasAnalysis();

  const [emptySubmitHint, setEmptySubmitHint] = useState(false);

  const handleTextChange = (value: string) => {
    setAnalysisText(value);
    if (analysisStatus === 'success' || analysisStatus === 'error') {
      setAnalysisStatus('idle');
      clearAnalysisResults();
    }
    if (emptySubmitHint) {
      setEmptySubmitHint(false);
    }
    if (analysisError) {
      setAnalysisError(null);
    }
  };

  const handleAnalyze = async () => {
    if (analysisStatus === 'loading') {
      return;
    }
    if (analysisStatus === 'success') {
      return;
    }
    if (!text.trim()) {
      setEmptySubmitHint(true);
      return;
    }

    setEmptySubmitHint(false);
    setAnalysisError(null);
    clearAnalysisResults();
    setAnalysisStatus('loading');
    console.log(`${LOG} button clicked, starting request`);

    try {
      const result = await requestBiasAnalysis(text.trim());
      console.log(`${LOG} response OK, score=${result.score}, storing in context`);
      setBiasScore(result.score);
      setBiasNotes(result.notes);
      setBiasedPhrases(result.biasedPhrases);
      setRewriteChanges(result.rewriteChanges);
      setNeutralPosition(result.neutralPosition);
      setAnalysisStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      console.warn(`${LOG} request failed:`, message);
      setAnalysisError(message);
      setAnalysisStatus('error');
    }
  };

  return (
    <>
      <SectionWrapper className="bg-winter-subtle">
        <Hero
          title="Bias Detector"
          subtitle="Paste text below to analyze its framing. See a bias score, short notes on what stands out, and a neutral rewrite to compare against the original."
        />
      </SectionWrapper>

      <SectionWrapper>
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">
          {analysisStatus === 'loading' ? 'Analyzing text. Please wait.' : null}
          {analysisStatus === 'success'
            ? 'Analysis complete. Bias score, notes, and neutral rewrite are ready.'
            : null}
          {analysisError ? `Analysis failed. ${analysisError}` : null}
        </div>
        <Form>
          <Form.Group className="mb-4">
            <Form.Label htmlFor="analysis-text">Text to analyze</Form.Label>
            <Form.Control
              id="analysis-text"
              as="textarea"
              rows={6}
              placeholder="Paste or type the text you want to analyze here…"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              aria-invalid={emptySubmitHint}
              aria-describedby={emptySubmitHint ? 'analysis-text-hint' : undefined}
            />
          </Form.Group>
          {emptySubmitHint ? (
            <p id="analysis-text-hint" className="small text-muted mb-3" role="status">
              Add text to run analysis. The button stays available once you have entered something to
              analyze.
            </p>
          ) : null}
          {analysisError ? (
            <Alert variant="danger" className="mb-3" role="alert">
              {analysisError}
            </Alert>
          ) : null}
          <AnalyzeTextButton status={analysisStatus} onAnalyze={() => void handleAnalyze()} />
        </Form>

        {analysisStatus === 'success' ? (
          <section
            className="after-analyze-reveal mt-5 pt-2"
            aria-labelledby="after-analyze-heading"
          >
            <h2
              id="after-analyze-heading"
              className="after-analyze-reveal__heading h5 fw-semibold mb-3"
              style={{ color: 'var(--cbd-text)' }}
            >
              After analyzing
            </h2>
            <Row xs={1} md={3} className="g-4">
              <Col className="after-analyze-reveal__col after-analyze-reveal__col--1">
                <NextStepCta
                  to="/bias-score"
                  title="Bias Score"
                  description="See how biased the framing is on a clear scale."
                  variant="ice"
                />
              </Col>
              <Col className="after-analyze-reveal__col after-analyze-reveal__col--2">
                <NextStepCta
                  to="/neutral-position"
                  title="Neutral Position"
                  description="Read a more neutral version of the same content."
                  variant="slate"
                />
              </Col>
              <Col className="after-analyze-reveal__col after-analyze-reveal__col--3">
                <NextStepCta
                  to="/chat"
                  title="Chat"
                  description="Ask the assistant about bias in this text."
                  variant="ice"
                />
              </Col>
            </Row>
          </section>
        ) : null}
      </SectionWrapper>
    </>
  );
}
