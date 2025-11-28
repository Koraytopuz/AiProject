import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

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

  socket.on('metrics', (payload) => {
    console.log('incoming metrics payload', payload);
    socket.emit('metrics:ack', {
      ok: true,
      questionId: payload?.questionId ?? null,
      receivedAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/stt', (req, res) => {
  const { mockAudioRef } = req.body ?? {};

  res.json({
    transcript: 'STT placeholder: Whisper integration pending',
    confidence: 0.0,
    receivedRef: mockAudioRef ?? null,
  });
});

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

