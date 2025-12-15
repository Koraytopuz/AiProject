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


