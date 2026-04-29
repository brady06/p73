import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import SectionWrapper from '../components/SectionWrapper';
import PageHeader from '../components/PageHeader';
import CtaBlock from '../components/CtaBlock';
import { useBiasAnalysis } from '../context/BiasAnalysisContext';
import { requestBiasChatReply, type BiasChatTurn } from '../api/biasChat';

const CTAS = [
  { to: '/', title: 'Text Analysis', description: 'Analyze new text' },
  { to: '/bias-score', title: 'Bias Score', description: 'View score' },
  { to: '/neutral-position', title: 'Neutral Position', description: 'View neutral rewrite' },
];

function buildChatContext(params: {
  analysisText: string;
  biasScore: number | null;
  biasNotes: string[];
  biasedPhrases: { phrase: string; reason: string }[];
  neutralPosition: string | null;
}) {
  return {
    analyzedText: params.analysisText,
    biasScore: params.biasScore,
    biasNotes: params.biasNotes,
    biasedPhrases: params.biasedPhrases,
    neutralPosition: params.neutralPosition ?? '',
  };
}

function ChatMessageBody({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <div
      className={`cbd-chat-bubble p-3 rounded-3 ${isUser ? 'cbd-chat-bubble--user' : 'cbd-chat-bubble--assistant'}`}
    >
      <p className="mb-0 text-light" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </p>
    </div>
  );
}

export default function ChatPage() {
  const {
    analysisText,
    biasScore,
    biasNotes,
    biasedPhrases,
    neutralPosition,
  } = useBiasAnalysis();

  const hasAnalysis = biasScore !== null && analysisText.trim().length > 0;
  const [messages, setMessages] = useState<BiasChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasAnalysis) {
      setMessages([]);
      setDraft('');
      setError(null);
    }
  }, [hasAnalysis]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || loading || !hasAnalysis) {
      return;
    }

    const context = buildChatContext({
      analysisText,
      biasScore,
      biasNotes,
      biasedPhrases,
      neutralPosition,
    });

    const userTurn: BiasChatTurn = { role: 'user', content: trimmed };
    const historySnapshot = messages;
    const nextHistory = [...historySnapshot, userTurn];

    setError(null);
    setDraft('');
    setMessages(nextHistory);
    setLoading(true);

    try {
      const { reply } = await requestBiasChatReply(nextHistory, context);
      setMessages([...nextHistory, { role: 'assistant', content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setMessages(historySnapshot);
      setDraft(trimmed);
    } finally {
      setLoading(false);
    }
  }, [
    analysisText,
    biasNotes,
    biasedPhrases,
    biasScore,
    draft,
    hasAnalysis,
    loading,
    messages,
    neutralPosition,
  ]);

  return (
    <SectionWrapper>
      <PageHeader
        title="Chat"
        subtitle="Ask follow-up questions about the analyzed text, the bias score, highlighted phrases, and how the neutral rewrite addresses framing."
      />

      <p className="text-muted small mb-4" style={{ maxWidth: '42rem' }}>
        The assistant is instructed to stay on this passage and bias-related discussion only. Replies are
        plain text (no code runs in your browser). This is still AI output and can be wrong or incomplete.
      </p>

      {!hasAnalysis ? (
        <Alert variant="secondary" className="mb-4">
          <p className="mb-0">
            Run <strong>Analyze Text</strong> on the Text Analysis page first. Chat uses your latest
            analysis, score, notes, and neutral rewrite as context.
          </p>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" className="mb-3" role="alert">
          {error}
        </Alert>
      ) : null}

      <div
        className="cbd-chat-log border rounded-3 p-3 mb-4"
        style={{ minHeight: '14rem', maxHeight: 'min(55vh, 28rem)', overflowY: 'auto' }}
        role="log"
        aria-relevant="additions"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-muted mb-0 small">
            {hasAnalysis
              ? 'Ask why a phrase was flagged, whether the score feels fair, or how the neutral version changes tone.'
              : 'Your conversation will appear here after you run an analysis.'}
          </p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
            {messages.map((m, i) => (
              <li
                key={`${m.role}-${i}`}
                className={`d-flex ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div style={{ maxWidth: 'min(100%, 34rem)' }}>
                  <ChatMessageBody text={m.content} isUser={m.role === 'user'} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {loading ? (
          <div className="d-flex align-items-center gap-2 mt-3 text-muted small">
            <Spinner animation="border" size="sm" role="status" aria-label="Loading" />
            <span>Thinking…</span>
          </div>
        ) : null}
        <div ref={scrollAnchorRef} />
      </div>

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="mb-4"
      >
        <Form.Group className="mb-2">
          <Form.Label htmlFor="chat-input">Your question</Form.Label>
          <Form.Control
            id="chat-input"
            as="textarea"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Why was this phrase considered biased?"
            disabled={!hasAnalysis || loading}
            maxLength={2800}
            aria-describedby="chat-input-hint"
          />
        </Form.Group>
        <p id="chat-input-hint" className="text-muted small mb-2">
          Plain text only. Messages are sent to the model under strict scope rules; do not paste secrets.
        </p>
        <Button type="submit" variant="primary" disabled={!hasAnalysis || loading || !draft.trim()}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Sending
            </>
          ) : (
            'Send'
          )}
        </Button>
      </Form>

      <CtaBlock title="Next steps" links={CTAS} largeTitles />
    </SectionWrapper>
  );
}
