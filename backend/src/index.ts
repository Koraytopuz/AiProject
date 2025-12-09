import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import prisma from './db';

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
      const { questionId, faceMetrics, voiceMetrics, timestamps } = payload ?? {};

      if (questionId) {
        // Soru yoksa basit bir placeholder oluştur (prototip amaçlı)
        const existingQuestion = await prisma.question.findUnique({
          where: { id: questionId },
        });

        if (!existingQuestion) {
          await prisma.question.create({
            data: {
              id: questionId,
              sessionId: payload?.sessionId ?? `session-${Date.now()}`,
              questionText: payload?.questionText ?? 'auto-generated question',
              category: payload?.category ?? 'otomatik',
              questionNumber: payload?.questionNumber ?? 1,
            },
          });
        }

        // Eğer soru varsa cevabı güncelle veya oluştur
        await prisma.answer.upsert({
          where: { id: questionId },
          update: {
            faceScore: faceMetrics?.stressScore ?? null,
            voiceScore: voiceMetrics?.speechRate ?? null,
            reactionDelay: timestamps?.answerStart
              ? calcReactionDelay(timestamps.questionStart, timestamps.answerStart)
              : null,
          },
          create: {
            id: questionId, // burada questionId'yi answer id olarak kullanıyoruz (prototip)
            questionId,
            answerText: null,
            transcript: null,
            confidence: null,
            faceScore: faceMetrics?.stressScore ?? null,
            voiceScore: voiceMetrics?.speechRate ?? null,
            reactionDelay: timestamps?.answerStart
              ? calcReactionDelay(timestamps.questionStart, timestamps.answerStart)
              : null,
          },
        });
      }

      socket.emit('metrics:ack', {
        ok: true,
        questionId: payload?.questionId ?? null,
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

