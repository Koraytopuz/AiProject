import { useEffect, useState } from 'react';
import './QuestionFlow.css';

interface Question {
  id: string;
  questionNumber: number;
  questionText: string;
  category: string;
}

interface NlpResult {
  nlpScore: number;
  semanticScore: number;
  uncertaintyScore: number;
  evasivenessScore: number;
  lengthScore: number;
  emotionAnalysis?: {
    consistencyScore: number;
    emotionTone: 'positive' | 'negative' | 'neutral';
    faceStressLevel: number;
    textEmotionLevel: number;
    mismatch: boolean;
    details: {
      positiveWords: number;
      negativeWords: number;
      stressMismatch: number;
    };
  };
}

interface QuestionFlowProps {
  faceStressScore?: number | null;
  onComplete?: (sessionId: string) => void;
}

function QuestionFlow({ faceStressScore, onComplete }: QuestionFlowProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [nlpResult, setNlpResult] = useState<NlpResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initSessionAndQuestions = async () => {
      try {
        // 1) Session oluştur
        const sessionRes = await fetch('http://localhost:4000/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const session = await sessionRes.json();
        setSessionId(session.id);

        // 2) 20 soruluk akışı başlat
        const questionsRes = await fetch(
          `http://localhost:4000/sessions/${session.id}/bootstrap-questions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        );
        const qs = await questionsRes.json();
        setQuestions(qs);
      } catch (error) {
        console.error('Soru akışı başlatılamadı:', error);
      }
    };

    void initSessionAndQuestions();
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;

  const handleAnalyze = async () => {
    if (!currentQuestion || !answerText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/nlp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          questionText: currentQuestion.questionText,
          answerText,
          faceStressScore: faceStressScore ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNlpResult(data);
      } else {
        console.error('NLP error:', data);
      }
    } catch (error) {
      console.error('NLP isteği başarısız:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setNlpResult(null);
    setAnswerText('');
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Tüm sorular tamamlandı
      if (sessionId && onComplete) {
        onComplete(sessionId);
      }
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="question-flow">
        <div className="question-card">Soru akışı hazırlanıyor...</div>
      </div>
    );
  }

  return (
    <div className="question-flow">
      <div className="question-card">
        <div className="question-header">
          <span className="question-step">
            Soru {currentQuestion.questionNumber} / {questions.length}
          </span>
          <span className="question-category">{currentQuestion.category}</span>
        </div>
        <p className="question-text">{currentQuestion.questionText}</p>
        <textarea
          className="answer-input"
          rows={4}
          placeholder="Cevabını buraya yaz (aynı zamanda sesli cevabın metin karşılığı gibi düşünebilirsin)..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
        />
        <div className="question-actions">
          <button onClick={handleAnalyze} disabled={loading || !answerText.trim()}>
            {loading ? 'Analiz ediliyor...' : 'Cevabı Analiz Et'}
          </button>
          <button onClick={handleNext} className="secondary">
            {currentIndex >= questions.length - 1 ? 'Sonuçları Gör' : 'Sonraki Soru'}
          </button>
        </div>
        {nlpResult && (
          <div className="nlp-result">
            <h4>NLP Tutarlılık Skoru</h4>
            <div className="nlp-score-main">
              <span className="score-label">NLP Skoru</span>
              <span className="score-value">{nlpResult.nlpScore.toFixed(2)} / 10</span>
            </div>
            <div className="nlp-score-grid">
              <div>
                <span>Semantik Uyum</span>
                <strong>{nlpResult.semanticScore.toFixed(2)}</strong>
              </div>
              <div>
                <span>Belirsizlik</span>
                <strong>{nlpResult.uncertaintyScore.toFixed(2)}</strong>
              </div>
              <div>
                <span>Kaçamaklık</span>
                <strong>{nlpResult.evasivenessScore.toFixed(2)}</strong>
              </div>
              <div>
                <span>Uzunluk Skoru</span>
                <strong>{nlpResult.lengthScore.toFixed(2)}</strong>
              </div>
            </div>
            {nlpResult.emotionAnalysis && (
              <div className="emotion-analysis">
                <h4>Duygu-İçerik Uyumu</h4>
                <div className={`emotion-status ${nlpResult.emotionAnalysis.mismatch ? 'mismatch' : 'match'}`}>
                  {nlpResult.emotionAnalysis.mismatch ? '⚠️ Uyumsuzluk Tespit Edildi' : '✅ Uyumlu'}
                </div>
                <div className="emotion-details">
                  <div>
                    <span>Yüz Stres Seviyesi</span>
                    <strong>{nlpResult.emotionAnalysis.faceStressLevel.toFixed(2)} / 10</strong>
                  </div>
                  <div>
                    <span>Metin Duygusal Tonu</span>
                    <strong>
                      {nlpResult.emotionAnalysis.emotionTone === 'positive'
                        ? 'Pozitif'
                        : nlpResult.emotionAnalysis.emotionTone === 'negative'
                          ? 'Negatif'
                          : 'Nötr'}
                    </strong>
                  </div>
                  <div>
                    <span>Uyum Skoru</span>
                    <strong>{nlpResult.emotionAnalysis.consistencyScore.toFixed(2)} / 10</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionFlow;



