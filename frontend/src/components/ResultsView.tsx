import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './ResultsView.css';

interface AnswerScore {
  answerId: string;
  questionId: string;
  questionNumber: number;
  questionText: string;
  category: string;
  faceScore: number | null;
  voiceScore: number | null;
  nlpScore: number | null;
  reactionDelay: number | null;
  reactionDelayScore: number | null;
  individualScore: number | null;
}

interface SessionScoreResult {
  sessionId: string;
  finalScore: number;
  totalQuestions: number;
  answeredQuestions: number;
  answerScores: AnswerScore[];
  averageFaceScore: number | null;
  averageVoiceScore: number | null;
  averageNlpScore: number | null;
  averageReactionDelay: number | null;
  categoryBreakdown: {
    [category: string]: {
      count: number;
      averageScore: number;
    };
  };
}

interface ResultsViewProps {
  sessionId: string;
  onBack?: () => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

function ResultsView({ sessionId, onBack }: ResultsViewProps) {
  const [scoreData, setScoreData] = useState<SessionScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true);
        // Önce skor hesapla
        const calculateRes = await fetch(
          `http://localhost:4000/sessions/${sessionId}/calculate-score`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (!calculateRes.ok) {
          throw new Error('Skor hesaplanamadı');
        }

        const data = await calculateRes.json();
        setScoreData(data);
      } catch (err) {
        console.error('Skor getirme hatası:', err);
        setError('Sonuçlar yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    void fetchScore();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="results-view">
        <div className="results-loading">Sonuçlar hesaplanıyor...</div>
      </div>
    );
  }

  if (error || !scoreData) {
    return (
      <div className="results-view">
        <div className="results-error">{error || 'Sonuçlar bulunamadı'}</div>
      </div>
    );
  }

  // Grafik verilerini hazırla
  const questionScoresData = scoreData.answerScores
    .filter((a) => a.individualScore !== null)
    .map((a) => ({
      name: `Soru ${a.questionNumber}`,
      skor: a.individualScore ?? 0,
      kategori: a.category,
    }));

  const metricComparisonData = [
    {
      name: 'Yüz',
      skor: scoreData.averageFaceScore ?? 0,
    },
    {
      name: 'Ses',
      skor: scoreData.averageVoiceScore ?? 0,
    },
    {
      name: 'NLP',
      skor: scoreData.averageNlpScore ?? 0,
    },
  ];

  const categoryData = Object.entries(scoreData.categoryBreakdown).map(([category, data]) => ({
    name: category.replace(/_/g, ' ').toUpperCase(),
    value: data.averageScore,
    count: data.count,
  }));

  // Skor aralığına göre renk belirle
  const getScoreColor = (score: number) => {
    if (score < 30) return '#4caf50'; // Yeşil - Düşük tutarsızlık
    if (score < 50) return '#ff9800'; // Turuncu - Orta tutarsızlık
    if (score < 70) return '#ff5722'; // Kırmızı-turuncu - Yüksek tutarsızlık
    return '#f44336'; // Kırmızı - Çok yüksek tutarsızlık
  };

  const scoreColor = getScoreColor(scoreData.finalScore);

  return (
    <div className="results-view">
      <div className="results-header">
        <h1>📊 Analiz Sonuçları</h1>
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Geri
          </button>
        )}
      </div>

      {/* Genel Skor */}
      <div className="final-score-card">
        <h2>Davranışsal Tutarsızlık Skoru</h2>
        <div className="final-score-value" style={{ color: scoreColor }}>
          {scoreData.finalScore.toFixed(2)} / 100
        </div>
        <div className="final-score-info">
          <p>
            <strong>{scoreData.answeredQuestions}</strong> soruya cevap verildi (Toplam:{' '}
            {scoreData.totalQuestions})
          </p>
          <p className="score-interpretation">
            {scoreData.finalScore < 30
              ? '✅ Düşük tutarsızlık seviyesi'
              : scoreData.finalScore < 50
                ? '⚠️ Orta seviye tutarsızlık'
                : scoreData.finalScore < 70
                  ? '🔴 Yüksek tutarsızlık seviyesi'
                  : '🚨 Çok yüksek tutarsızlık seviyesi'}
          </p>
        </div>
      </div>

      {/* Ortalama Metrikler */}
      <div className="metrics-summary">
        <h3>Ortalama Metrikler</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Yüz Analizi</span>
            <strong className="metric-value">
              {scoreData.averageFaceScore?.toFixed(2) ?? 'N/A'} / 10
            </strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Ses Analizi</span>
            <strong className="metric-value">
              {scoreData.averageVoiceScore?.toFixed(2) ?? 'N/A'} / 10
            </strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">NLP Skoru</span>
            <strong className="metric-value">
              {scoreData.averageNlpScore?.toFixed(2) ?? 'N/A'} / 10
            </strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Ortalama Gecikme</span>
            <strong className="metric-value">
              {scoreData.averageReactionDelay?.toFixed(2) ?? 'N/A'} sn
            </strong>
          </div>
        </div>
      </div>

      {/* Grafikler */}
      <div className="charts-container">
        {/* Soru Bazlı Skor Grafiği */}
        <div className="chart-card">
          <h3>Soru Bazlı Skor Dağılımı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={questionScoresData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="skor" fill="#8884d8" name="Tutarsızlık Skoru" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metrik Karşılaştırma */}
        <div className="chart-card">
          <h3>Metrik Karşılaştırması</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="skor" fill="#82ca9d" name="Ortalama Skor" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kategori Dağılımı */}
        {categoryData.length > 0 && (
          <div className="chart-card">
            <h3>Kategori Bazında Ortalama Skor</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, count }) => `${name}: ${value.toFixed(1)} (${count})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Zaman Çizelgesi (Reaction Delay) */}
        <div className="chart-card">
          <h3>Reaction Delay Zaman Çizelgesi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={scoreData.answerScores
                .filter((a) => a.reactionDelay !== null)
                .map((a) => ({
                  name: `Soru ${a.questionNumber}`,
                  delay: a.reactionDelay ?? 0,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="delay"
                stroke="#ff7300"
                name="Gecikme (saniye)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detaylı Soru Listesi */}
      <div className="questions-detail">
        <h3>Detaylı Soru Skorları</h3>
        <div className="questions-table">
          <table>
            <thead>
              <tr>
                <th>Soru No</th>
                <th>Soru</th>
                <th>Kategori</th>
                <th>Yüz</th>
                <th>Ses</th>
                <th>NLP</th>
                <th>Gecikme</th>
                <th>Toplam Skor</th>
              </tr>
            </thead>
            <tbody>
              {scoreData.answerScores.map((answer) => (
                <tr key={answer.answerId}>
                  <td>{answer.questionNumber}</td>
                  <td className="question-text">{answer.questionText}</td>
                  <td>{answer.category.replace(/_/g, ' ')}</td>
                  <td>{answer.faceScore?.toFixed(2) ?? '-'}</td>
                  <td>{answer.voiceScore?.toFixed(2) ?? '-'}</td>
                  <td>{answer.nlpScore?.toFixed(2) ?? '-'}</td>
                  <td>{answer.reactionDelay?.toFixed(2) ?? '-'} sn</td>
                  <td className="score-cell">
                    {answer.individualScore !== null ? (
                      <span style={{ color: getScoreColor(answer.individualScore) }}>
                        {answer.individualScore.toFixed(2)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skor Açıklaması */}
      <div className="score-explanation">
        <h3>📖 Skor Nasıl Hesaplanır?</h3>
        <div className="explanation-content">
          <p>
            <strong>Davranışsal Tutarsızlık Skoru (0-100):</strong> Bu skor, yüz ifadeleri, ses tonu,
            cevap tutarlılığı ve tepki sürelerine göre hesaplanır. Düşük skor daha tutarlı davranış,
            yüksek skor ise daha fazla tutarsızlık göstergesidir.
          </p>
          <div className="explanation-grid">
            <div className="explanation-item">
              <strong>Yüz Analizi (0-10):</strong>
              <ul>
                <li>Göz kırpma oranı</li>
                <li>Kafa hareketleri</li>
                <li>Mikro ifadeler (kaş çatma, dudak ısırma)</li>
                <li>Göz teması kaçınma</li>
              </ul>
            </div>
            <div className="explanation-item">
              <strong>Ses Analizi (0-10):</strong>
              <ul>
                <li>Konuşma hızı değişkenliği</li>
                <li>Ses titremesi (jitter, shimmer)</li>
                <li>Pitch değişkenliği</li>
                <li>Nefes alma sıklığı</li>
              </ul>
            </div>
            <div className="explanation-item">
              <strong>NLP Skoru (0-10):</strong>
              <ul>
                <li>Semantik tutarlılık</li>
                <li>Belirsizlik ifadeleri</li>
                <li>Kaçamaklık tespiti</li>
                <li>Cevap uzunluğu analizi</li>
              </ul>
            </div>
            <div className="explanation-item">
              <strong>Reaction Delay:</strong>
              <ul>
                <li>Soru sorulduktan sonra cevap başlama süresi</li>
                <li>Uzun gecikmeler tutarsızlık göstergesi olabilir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Etik Uyarı */}
      <div className="ethical-warning">
        <h4>⚠️ Önemli Uyarı ve Etik Bildirim</h4>
        <div className="warning-content">
          <p>
            <strong>Bu uygulama bilimsel yalan tespiti yapmaz.</strong> Sadece davranışsal
            tutarsızlık analizi gerçekleştirir.
          </p>
          <ul>
            <li>
              <strong>Sonuçlar kesin değildir:</strong> Skorlar sadece referans amaçlıdır ve
              gerçek durumu yansıtmayabilir.
            </li>
            <li>
              <strong>Çevresel faktörler:</strong> Gürültü, ışık, teknik sorunlar sonuçları
              etkileyebilir.
            </li>
            <li>
              <strong>Kişisel farklılıklar:</strong> Her bireyin doğal davranış kalıpları
              farklıdır.
            </li>
            <li>
              <strong>Veri gizliliği:</strong> Tüm veriler yerel olarak saklanır ve üçüncü
              taraflarla paylaşılmaz.
            </li>
            <li>
              <strong>Kullanım amacı:</strong> Bu uygulama eğitim ve araştırma amaçlıdır. Ciddi
              kararlar için kullanılmamalıdır.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ResultsView;

