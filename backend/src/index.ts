import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import prisma from './db';
import { analyzeAnswerConsistency } from './nlp';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);

  socket.on('metrics', async (payload) => {
    console.log('incoming metrics payload', payload);
    try {
      const { questionId, sessionId, faceMetrics, voiceMetrics, timestamps } = payload ?? {};

      // Session yoksa oluştur
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const newSession = await prisma.session.create({
          data: { status: 'active' },
        });
        currentSessionId = newSession.id;
      }

      // QuestionId yoksa veya soru yoksa placeholder oluştur
      let currentQuestionId = questionId;
      if (!currentQuestionId) {
        const questionCount = await prisma.question.count({
          where: { sessionId: currentSessionId },
        });
        const newQuestion = await prisma.question.create({
          data: {
            sessionId: currentSessionId,
            questionText: payload?.questionText ?? 'Otomatik oluşturulan soru',
            category: payload?.category ?? 'otomatik',
            questionNumber: questionCount + 1,
          },
        });
        currentQuestionId = newQuestion.id;
      } else {
        // Soru var mı kontrol et
        const existingQuestion = await prisma.question.findUnique({
          where: { id: currentQuestionId },
        });
        if (!existingQuestion) {
          const questionCount = await prisma.question.count({
            where: { sessionId: currentSessionId },
          });
          await prisma.question.create({
            data: {
              id: currentQuestionId,
              sessionId: currentSessionId,
              questionText: payload?.questionText ?? 'Otomatik oluşturulan soru',
              category: payload?.category ?? 'otomatik',
              questionNumber: questionCount + 1,
            },
          });
        }
      }

      // Answer'ı questionId'ye göre bul veya oluştur
      const existingAnswer = await prisma.answer.findFirst({
        where: { questionId: currentQuestionId },
      });

      if (existingAnswer) {
        // Mevcut answer'ı güncelle
        await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: {
            faceScore: faceMetrics?.stressScore ?? existingAnswer.faceScore,
            voiceScore: voiceMetrics?.speechRate ?? existingAnswer.voiceScore,
            reactionDelay: timestamps?.answerStart
              ? calcReactionDelay(timestamps.questionStart, timestamps.answerStart)
              : existingAnswer.reactionDelay,
            questionStartTime: timestamps?.questionStart
              ? new Date(timestamps.questionStart)
              : existingAnswer.questionStartTime,
            answerStartTime: timestamps?.answerStart
              ? new Date(timestamps.answerStart)
              : existingAnswer.answerStartTime,
          },
        });
      } else {
        // Yeni answer oluştur
        await prisma.answer.create({
          data: {
            questionId: currentQuestionId,
            answerText: null,
            transcript: null,
            confidence: null,
            faceScore: faceMetrics?.stressScore ?? null,
            voiceScore: voiceMetrics?.speechRate ?? null,
            reactionDelay: timestamps?.answerStart
              ? calcReactionDelay(timestamps.questionStart, timestamps.answerStart)
              : null,
            questionStartTime: timestamps?.questionStart
              ? new Date(timestamps.questionStart)
              : null,
            answerStartTime: timestamps?.answerStart
              ? new Date(timestamps.answerStart)
              : null,
          },
        });
      }

      socket.emit('metrics:ack', {
        ok: true,
        sessionId: currentSessionId,
        questionId: currentQuestionId,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('metrics handler error:', error);
      socket.emit('metrics:ack', {
        ok: false,
        error: 'failed_to_persist_metrics',
        receivedAt: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// STT endpoint - Audio dosyası veya base64 audio kabul eder
app.post('/stt', async (req, res) => {
  try {
    const { audioData, audioFormat, sessionId, questionId } = req.body ?? {};

    // TODO: Whisper API entegrasyonu buraya gelecek
    // Şimdilik mock response
    const mockTranscript = 'STT placeholder: Whisper integration pending';
    const mockConfidence = 0.85;

    // Eğer questionId varsa, answer kaydını güncelle
    if (questionId) {
      await prisma.answer.update({
        where: { id: questionId },
        data: {
          transcript: mockTranscript,
          confidence: mockConfidence,
          answerText: mockTranscript,
        },
      });
    }

    res.json({
      transcript: mockTranscript,
      confidence: mockConfidence,
      sessionId: sessionId ?? null,
      questionId: questionId ?? null,
    });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'STT işlemi başarısız' });
  }
});

// NLP tutarlılık analizi endpoint'i
app.post('/nlp/analyze', async (req, res) => {
  try {
    const { sessionId, questionId, questionText, answerText } = req.body ?? {};

    if (!questionText || !answerText) {
      return res.status(400).json({ error: 'questionText ve answerText zorunludur' });
    }

    const analysis = analyzeAnswerConsistency(questionText, answerText);

    // Eğer questionId varsa ilgili answer kaydını güncelle
    if (questionId) {
      const existingAnswer = await prisma.answer.findFirst({
        where: { questionId },
      });

      if (existingAnswer) {
        await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: {
            nlpScore: analysis.nlpScore,
            answerText,
          },
        });
      } else {
        // Gerekirse yeni answer oluştur
        await prisma.answer.create({
          data: {
            questionId,
            answerText,
            nlpScore: analysis.nlpScore,
          },
        });
      }
    }

    res.json(analysis);
  } catch (error) {
    console.error('NLP analyze error:', error);
    res.status(500).json({ error: 'NLP analizi başarısız' });
  }
});

// Yeni session oluştur
app.post('/sessions', async (req, res) => {
  try {
    const session = await prisma.session.create({
      data: {
        status: 'active',
      },
    });
    res.json(session);
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Session oluşturulamadı' });
  }
});

// Session'a soru ekle
app.post('/sessions/:sessionId/questions', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionText, category, questionNumber } = req.body;

    const question = await prisma.question.create({
      data: {
        sessionId,
        questionText,
        category: category || 'açık_uçlu',
        questionNumber: questionNumber || 1,
      },
    });

    res.json(question);
  } catch (error) {
    console.error('Question creation error:', error);
    res.status(500).json({ error: 'Soru oluşturulamadı' });
  }
});

// Session detaylarını getir (sorular ve cevaplarla)
app.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            answers: true,
          },
          orderBy: {
            questionNumber: 'asc',
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session bulunamadı' });
    }

    res.json(session);
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ error: 'Session getirilemedi' });
  }
});

// Session'ın metriklerini getir
app.get('/sessions/:sessionId/metrics', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const answers = await prisma.answer.findMany({
      where: {
        question: {
          sessionId,
        },
      },
      include: {
        question: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Ortalama skorları hesapla
    const faceScores = answers.map((a) => a.faceScore).filter((s) => s !== null) as number[];
    const voiceScores = answers.map((a) => a.voiceScore).filter((s) => s !== null) as number[];
    const reactionDelays = answers
      .map((a) => a.reactionDelay)
      .filter((d) => d !== null) as number[];

    const avgFaceScore =
      faceScores.length > 0 ? faceScores.reduce((a, b) => a + b, 0) / faceScores.length : null;
    const avgVoiceScore =
      voiceScores.length > 0
        ? voiceScores.reduce((a, b) => a + b, 0) / voiceScores.length
        : null;
    const avgReactionDelay =
      reactionDelays.length > 0
        ? reactionDelays.reduce((a, b) => a + b, 0) / reactionDelays.length
        : null;

    res.json({
      sessionId,
      totalAnswers: answers.length,
      averageFaceScore: avgFaceScore,
      averageVoiceScore: avgVoiceScore,
      averageReactionDelay: avgReactionDelay,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.questionText,
        faceScore: a.faceScore,
        voiceScore: a.voiceScore,
        reactionDelay: a.reactionDelay,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    res.status(500).json({ error: 'Metrikler getirilemedi' });
  }
});

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

function calcReactionDelay(questionStart?: string, answerStart?: string) {
  if (!questionStart || !answerStart) return null;
  const qs = Date.parse(questionStart);
  const as = Date.parse(answerStart);
  if (Number.isNaN(qs) || Number.isNaN(as)) return null;
  return (as - qs) / 1000; // seconds
}

