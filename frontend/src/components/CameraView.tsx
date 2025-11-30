import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import './CameraView.css';

interface CameraViewProps {
  stream: MediaStream;
}

function CameraView({ stream }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const { isRecording, startRecording, stopRecording, audioBlob } = useAudioRecorder(stream);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    
    newSocket.on('connect', () => {
      console.log('WebSocket bağlantısı kuruldu');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket bağlantısı kesildi');
      setConnected(false);
    });

    newSocket.on('metrics:ack', (data) => {
      console.log('Backend onayı:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMetrics = () => {
    if (!socket || !connected) return;

    const metrics = {
      questionId: 1,
      faceMetrics: {
        stressScore: Math.random() * 10,
        eyeBlinkRate: Math.random() * 5,
        headMovement: Math.random() * 10,
      },
      voiceMetrics: {
        pitchVariability: Math.random() * 10,
        speechRate: Math.random() * 10,
      },
      timestamps: {
        questionStart: new Date().toISOString(),
        answerStart: new Date().toISOString(),
      },
    };

    socket.emit('metrics', metrics);
  };

  const handleRecordAndSend = async () => {
    if (isRecording) {
      // Kaydı durdur ve STT'ye gönder
      const blob = await stopRecording();
      if (!blob) return;

      // Audio'yu base64'e çevir
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1]; // data:audio/webm;base64, kısmını çıkar

        try {
          const response = await fetch('http://localhost:4000/stt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioData: base64Data,
              audioFormat: 'webm',
              sessionId: null, // TODO: Session ID'yi state'ten al
              questionId: null, // TODO: Question ID'yi state'ten al
            }),
          });

          const data = await response.json();
          setTranscript(data.transcript);
          console.log('STT Response:', data);
        } catch (error) {
          console.error('STT gönderme hatası:', error);
        }
      };
      reader.readAsDataURL(blob);
    } else {
      // Kaydı başlat
      startRecording();
    }
  };

  return (
    <div className="camera-view">
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <div className="status-overlay">
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Bağlı' : '🔴 Bağlantı Yok'}
          </div>
        </div>
      </div>
      <div className="controls">
        <button onClick={sendMetrics} disabled={!connected}>
          Test Metrikleri Gönder
        </button>
        <button
          onClick={handleRecordAndSend}
          disabled={!connected}
          className={isRecording ? 'recording' : ''}
        >
          {isRecording ? '⏹️ Kaydı Durdur ve Gönder' : '🎤 Ses Kaydı Başlat'}
        </button>
      </div>
      {transcript && (
        <div className="transcript-box">
          <h3>Transkript:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}

export default CameraView;

