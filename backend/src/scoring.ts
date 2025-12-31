/**
 * Skor Hesaplama Motoru
 * 
 * Final skor formülü:
 * final_score = (face_score * 0.35) + (voice_score * 0.35) + (nlp_score * 0.20) + (reaction_delay_score * 0.10)
 * 
 * Skorlar 0-100 arası "Davranışsal Tutarsızlık Skoru" olarak döner.
 * Yüksek skor = daha fazla tutarsızlık/stres
 */

export interface AnswerScore {
  answerId: string;
  questionId: string;
  questionNumber: number;
  questionText: string;
  category: string;
  faceScore: number | null;
  voiceScore: number | null;
  nlpScore: number | null;
  reactionDelay: number | null;
  reactionDelayScore: number | null; // 0-10 arası normalize edilmiş
  individualScore: number | null; // 0-100 arası bu cevap için skor
}

export interface SessionScoreResult {
  sessionId: string;
  finalScore: number; // 0-100 arası genel skor
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

/**
 * Reaction delay'i 0-10 arası skora çevirir
 * 
 * Mantık:
 * - 0-1 saniye: 0 (çok hızlı, tutarlı)
 * - 1-3 saniye: 2-4 (normal)
 * - 3-5 saniye: 5-7 (biraz gecikme)
 * - 5+ saniye: 8-10 (çok gecikme, tutarsızlık işareti)
 */
function calculateReactionDelayScore(reactionDelay: number | null): number | null {
  if (reactionDelay === null || reactionDelay < 0) return null;

  if (reactionDelay <= 1) {
    return 0; // Çok hızlı
  } else if (reactionDelay <= 2) {
    return 2; // Hızlı
  } else if (reactionDelay <= 3) {
    return 4; // Normal
  } else if (reactionDelay <= 4) {
    return 6; // Biraz gecikme
  } else if (reactionDelay <= 5) {
    return 8; // Gecikme
  } else {
    return 10; // Çok gecikme
  }
}

/**
 * Tek bir cevap için skor hesaplar
 */
export function calculateAnswerScore(
  answerId: string,
  questionId: string,
  questionNumber: number,
  questionText: string,
  category: string,
  faceScore: number | null,
  voiceScore: number | null,
  nlpScore: number | null,
  reactionDelay: number | null,
): AnswerScore {
  const reactionDelayScore = calculateReactionDelayScore(reactionDelay);

  // Eksik veri kontrolü
  const hasFaceScore = faceScore !== null && faceScore !== undefined;
  const hasVoiceScore = voiceScore !== null && voiceScore !== undefined;
  const hasNlpScore = nlpScore !== null && nlpScore !== undefined;
  const hasReactionDelayScore = reactionDelayScore !== null;

  // Hangi metrikler mevcut?
  const availableMetrics = [
    hasFaceScore,
    hasVoiceScore,
    hasNlpScore,
    hasReactionDelayScore,
  ].filter(Boolean).length;

  // Eğer hiç metrik yoksa skor hesaplanamaz
  if (availableMetrics === 0) {
    return {
      answerId,
      questionId,
      questionNumber,
      questionText,
      category,
      faceScore,
      voiceScore,
      nlpScore,
      reactionDelay,
      reactionDelayScore: null,
      individualScore: null,
    };
  }

  // Ağırlıkları mevcut metriklere göre normalize et
  let faceWeight = 0.35;
  let voiceWeight = 0.35;
  let nlpWeight = 0.20;
  let reactionWeight = 0.10;

  // Eksik metrikler varsa ağırlıkları yeniden dağıt (toplam 1 olacak şekilde)
  const availableWeights: number[] = [];
  if (hasFaceScore) availableWeights.push(faceWeight);
  if (hasVoiceScore) availableWeights.push(voiceWeight);
  if (hasNlpScore) availableWeights.push(nlpWeight);
  if (hasReactionDelayScore) availableWeights.push(reactionWeight);

  const totalAvailableWeight = availableWeights.reduce((sum, w) => sum + w, 0);

  if (totalAvailableWeight > 0) {
    // Mevcut ağırlıkları normalize et (toplam 1 olacak şekilde)
    if (hasFaceScore) faceWeight = faceWeight / totalAvailableWeight;
    if (hasVoiceScore) voiceWeight = voiceWeight / totalAvailableWeight;
    if (hasNlpScore) nlpWeight = nlpWeight / totalAvailableWeight;
    if (hasReactionDelayScore) reactionWeight = reactionWeight / totalAvailableWeight;
  }

  // Skor hesaplama (0-10 arası skorları 0-100'e çevir)
  let rawScore = 0;
  if (hasFaceScore) rawScore += (faceScore / 10) * 100 * faceWeight;
  if (hasVoiceScore) rawScore += (voiceScore / 10) * 100 * voiceWeight;
  if (hasNlpScore) rawScore += (nlpScore / 10) * 100 * nlpWeight;
  if (hasReactionDelayScore) rawScore += (reactionDelayScore / 10) * 100 * reactionWeight;

  const individualScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(2));

  return {
    answerId,
    questionId,
    questionNumber,
    questionText,
    category,
    faceScore,
    voiceScore,
    nlpScore,
    reactionDelay,
    reactionDelayScore,
    individualScore,
  };
}

/**
 * Session için genel skor hesaplar
 */
export function calculateSessionScore(answerScores: AnswerScore[]): SessionScoreResult {
  const validScores = answerScores.filter((a) => a.individualScore !== null);
  const totalQuestions = answerScores.length;
  const answeredQuestions = validScores.length;

  // Final skor: tüm cevapların ortalaması
  const finalScore =
    validScores.length > 0
      ? validScores.reduce((sum, a) => sum + (a.individualScore ?? 0), 0) / validScores.length
      : 0;

  // Ortalama metrikler
  const faceScores = answerScores
    .map((a) => a.faceScore)
    .filter((s) => s !== null && s !== undefined) as number[];
  const voiceScores = answerScores
    .map((a) => a.voiceScore)
    .filter((s) => s !== null && s !== undefined) as number[];
  const nlpScores = answerScores
    .map((a) => a.nlpScore)
    .filter((s) => s !== null && s !== undefined) as number[];
  const reactionDelays = answerScores
    .map((a) => a.reactionDelay)
    .filter((d) => d !== null && d !== undefined) as number[];

  const averageFaceScore =
    faceScores.length > 0
      ? Number((faceScores.reduce((a, b) => a + b, 0) / faceScores.length).toFixed(2))
      : null;
  const averageVoiceScore =
    voiceScores.length > 0
      ? Number((voiceScores.reduce((a, b) => a + b, 0) / voiceScores.length).toFixed(2))
      : null;
  const averageNlpScore =
    nlpScores.length > 0
      ? Number((nlpScores.reduce((a, b) => a + b, 0) / nlpScores.length).toFixed(2))
      : null;
  const averageReactionDelay =
    reactionDelays.length > 0
      ? Number((reactionDelays.reduce((a, b) => a + b, 0) / reactionDelays.length).toFixed(2))
      : null;

  // Kategori bazında analiz
  const categoryBreakdown: { [category: string]: { count: number; averageScore: number } } = {};
  answerScores.forEach((score) => {
    if (score.individualScore !== null) {
      if (!categoryBreakdown[score.category]) {
        categoryBreakdown[score.category] = { count: 0, averageScore: 0 };
      }
      const categoryData = categoryBreakdown[score.category];
      if (categoryData) {
        categoryData.count++;
        categoryData.averageScore += score.individualScore;
      }
    }
  });

  // Kategori ortalamalarını hesapla
  Object.keys(categoryBreakdown).forEach((category) => {
    const data = categoryBreakdown[category];
    if (data && data.count > 0) {
      data.averageScore = Number((data.averageScore / data.count).toFixed(2));
    }
  });

  return {
    sessionId: '', // Caller tarafından set edilecek
    finalScore: Number(finalScore.toFixed(2)),
    totalQuestions,
    answeredQuestions,
    answerScores,
    averageFaceScore,
    averageVoiceScore,
    averageNlpScore,
    averageReactionDelay,
    categoryBreakdown,
  };
}

