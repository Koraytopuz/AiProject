const UNCERTAINTY_WORDS = [
  'bilmem',
  'bilmiyorum',
  'hatırlamıyorum',
  'galiba',
  'sanırım',
  'emin değilim',
  'belki',
];

const EVADE_PHRASES = [
  'konuşmak istemiyorum',
  'bunu cevaplamak istemiyorum',
  'boşver',
  'sonra konuşalım',
];

export interface NlpAnalysisResult {
  nlpScore: number; // 0-10, 10 = çok tutarlı / düşük kaçamaklık
  semanticScore: number; // 0-10
  uncertaintyScore: number; // 0-10 (yüksek = çok belirsiz)
  evasivenessScore: number; // 0-10 (yüksek = çok kaçamak)
  lengthScore: number; // 0-10
  details: {
    uncertaintyCount: number;
    evasiveCount: number;
    answerLength: number;
  };
}

export function analyzeAnswerConsistency(question: string, answer: string): NlpAnalysisResult {
  const q = normalize(question);
  const a = normalize(answer);

  // Uzunluk metriği
  const answerWords = a.split(/\s+/).filter(Boolean);
  const answerLength = answerWords.length;
  let lengthScore = 5;
  if (answerLength < 3) lengthScore = 2;
  else if (answerLength < 8) lengthScore = 5;
  else if (answerLength < 25) lengthScore = 8;
  else lengthScore = 6; // aşırı uzunsa biraz düşür

  // Belirsizlik ve kaçamaklık
  const uncertaintyCount = countMatches(a, UNCERTAINTY_WORDS);
  const evasiveCount = countMatches(a, EVADE_PHRASES);

  const uncertaintyScore = Math.min(10, uncertaintyCount * 3); // 0,3,6,9,10
  const evasivenessScore = Math.min(10, evasiveCount * 4);

  // Çok kaba semantik yakınlık (ortak kelime oranı)
  const questionWords = q.split(/\s+/).filter(Boolean);
  const overlap = questionWords.filter((w) => a.includes(w));
  const overlapRatio = questionWords.length
    ? overlap.length / Math.min(questionWords.length, 10)
    : 0;
  const semanticScore = Math.max(0, Math.min(10, overlapRatio * 10));

  // Toplam NLP skoru: yüksek semantic + makul uzunluk, düşük belirsizlik/kaçamaklık
  const rawScore =
    semanticScore * 0.45 +
    lengthScore * 0.25 +
    (10 - uncertaintyScore) * 0.15 +
    (10 - evasivenessScore) * 0.15;

  const nlpScore = Number(Math.max(0, Math.min(10, rawScore)).toFixed(2));

  return {
    nlpScore,
    semanticScore: Number(semanticScore.toFixed(2)),
    uncertaintyScore: Number(uncertaintyScore.toFixed(2)),
    evasivenessScore: Number(evasivenessScore.toFixed(2)),
    lengthScore: Number(lengthScore.toFixed(2)),
    details: {
      uncertaintyCount,
      evasiveCount,
      answerLength,
    },
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zğüşöçı0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(text: string, patterns: string[]): number {
  let count = 0;
  for (const p of patterns) {
    if (text.includes(p)) count++;
  }
  return count;
}

// Duygu kelimeleri (basit heuristik)
const POSITIVE_WORDS = [
  'mutlu',
  'iyi',
  'güzel',
  'harika',
  'mükemmel',
  'sevindim',
  'hoş',
  'keyifli',
  'rahat',
  'huzurlu',
];
const NEGATIVE_WORDS = [
  'kötü',
  'üzgün',
  'kızgın',
  'sinirli',
  'stresli',
  'endişeli',
  'korkulu',
  'rahatsız',
  'sıkıntılı',
  'yorgun',
];

// Cevap tutarlılık analizi - Aynı soruya verilen farklı cevapları karşılaştır
export interface ConsistencyAnalysisResult {
  consistencyScore: number; // 0-10, 10 = çok tutarlı
  similarity: number; // 0-1, cevaplar arası benzerlik
  contradictionCount: number; // Çelişki sayısı
  details: {
    answerCount: number;
    avgLengthDiff: number;
    semanticOverlap: number;
  };
}

export function analyzeAnswerConsistencyAcrossAnswers(
  questionText: string,
  answers: string[],
): ConsistencyAnalysisResult {
  if (answers.length < 2) {
    return {
      consistencyScore: 10, // Tek cevap varsa tutarlı sayılır
      similarity: 1,
      contradictionCount: 0,
      details: {
        answerCount: answers.length,
        avgLengthDiff: 0,
        semanticOverlap: 1,
      },
    };
  }

  const normalizedAnswers = answers.map((a) => normalize(a));
  const answerWords = normalizedAnswers.map((a) => a.split(/\s+/).filter(Boolean));

  // Ortak kelime analizi
  const allWords = new Set<string>();
  answerWords.forEach((words) => words.forEach((w) => allWords.add(w)));
  const commonWords = Array.from(allWords).filter((w) =>
    answerWords.every((words) => words.includes(w)),
  );

  const semanticOverlap = allWords.size > 0 ? commonWords.length / allWords.size : 0;

  // Uzunluk farkı
  const lengths = answerWords.map((words) => words.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const lengthDiffs = lengths.map((l) => Math.abs(l - avgLength));
  const avgLengthDiff = lengthDiffs.reduce((a, b) => a + b, 0) / lengthDiffs.length;

  // Çelişki tespiti (basit: zıt duygu kelimeleri)
  let contradictionCount = 0;
  for (let i = 0; i < normalizedAnswers.length; i++) {
    for (let j = i + 1; j < normalizedAnswers.length; j++) {
      const a1 = normalizedAnswers[i];
      const a2 = normalizedAnswers[j];
      const hasPos1 = POSITIVE_WORDS.some((w) => a1.includes(w));
      const hasNeg1 = NEGATIVE_WORDS.some((w) => a1.includes(w));
      const hasPos2 = POSITIVE_WORDS.some((w) => a2.includes(w));
      const hasNeg2 = NEGATIVE_WORDS.some((w) => a2.includes(w));

      if ((hasPos1 && hasNeg2) || (hasNeg1 && hasPos2)) {
        contradictionCount++;
      }
    }
  }

  // Tutarlılık skoru
  const similarity = semanticOverlap * 0.7 + (1 - Math.min(avgLengthDiff / 20, 1)) * 0.3;
  const consistencyScore = Math.max(
    0,
    Math.min(10, similarity * 10 - contradictionCount * 2),
  );

  return {
    consistencyScore: Number(consistencyScore.toFixed(2)),
    similarity: Number(similarity.toFixed(2)),
    contradictionCount,
    details: {
      answerCount: answers.length,
      avgLengthDiff: Number(avgLengthDiff.toFixed(2)),
      semanticOverlap: Number(semanticOverlap.toFixed(2)),
    },
  };
}

// Duygu-içerik uyumu analizi
export interface EmotionContentConsistencyResult {
  consistencyScore: number; // 0-10, 10 = çok uyumlu
  emotionTone: 'positive' | 'negative' | 'neutral';
  faceStressLevel: number; // 0-10
  textEmotionLevel: number; // 0-10 (pozitif = düşük, negatif = yüksek)
  mismatch: boolean; // Yüz ifadesi ile metin çelişiyor mu?
  details: {
    positiveWords: number;
    negativeWords: number;
    stressMismatch: number; // Yüz stresi ile metin duygusu arasındaki fark
  };
}

export function analyzeEmotionContentConsistency(
  answerText: string,
  faceStressScore: number, // 0-10
): EmotionContentConsistencyResult {
  const normalized = normalize(answerText);
  const words = normalized.split(/\s+/);

  const positiveCount = POSITIVE_WORDS.filter((w) => normalized.includes(w)).length;
  const negativeCount = NEGATIVE_WORDS.filter((w) => normalized.includes(w)).length;

  // Metin duygusal tonu (0-10, yüksek = negatif/stresli)
  let textEmotionLevel = 5; // neutral
  if (positiveCount > negativeCount) {
    textEmotionLevel = Math.max(0, 5 - positiveCount * 1.5);
  } else if (negativeCount > positiveCount) {
    textEmotionLevel = Math.min(10, 5 + negativeCount * 1.5);
  }

  const emotionTone: 'positive' | 'negative' | 'neutral' =
    textEmotionLevel < 3 ? 'positive' : textEmotionLevel > 7 ? 'negative' : 'neutral';

  // Stres uyumsuzluğu: Yüz stresi yüksek ama metin pozitif, veya tam tersi
  const stressMismatch = Math.abs(faceStressScore - textEmotionLevel);
  const mismatch = stressMismatch > 4; // 4'ten fazla fark varsa uyumsuz sayılır

  // Uyum skoru: Düşük uyumsuzluk = yüksek skor
  const consistencyScore = Math.max(0, Math.min(10, 10 - stressMismatch * 1.2));

  return {
    consistencyScore: Number(consistencyScore.toFixed(2)),
    emotionTone,
    faceStressLevel: Number(faceStressScore.toFixed(2)),
    textEmotionLevel: Number(textEmotionLevel.toFixed(2)),
    mismatch,
    details: {
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      stressMismatch: Number(stressMismatch.toFixed(2)),
    },
  };
}


