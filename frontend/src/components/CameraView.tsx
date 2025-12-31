import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import './CameraView.css';

interface CameraViewProps {
  stream: MediaStream;
  onFaceStressChange?: (score: number | null) => void;
}

function CameraView({ stream, onFaceStressChange }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [faceMetrics, setFaceMetrics] = useState<{
    eyeBlinkRate: number;
    headMovement: number;
    stressScore: number;
  } | null>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(stream);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const voiceMetrics = useAudioAnalyzer(stream);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    // Video element için stream'i bağla
    videoRef.current.srcObject = stream;

    // MediaPipe FaceMesh başlat
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    // Kamera wrapper
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current as HTMLVideoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();
    cameraRef.current = camera;

    return () => {
      cameraRef.current?.stop();
      faceMeshRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  useEffect(() => {
    // Session oluştur
    const createSession = async () => {
      try {
        const response = await fetch('http://localhost:4000/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const session = await response.json();
        setSessionId(session.id);
        console.log('Session oluşturuldu:', session.id);
      } catch (error) {
        console.error('Session oluşturma hatası:', error);
      }
    };

    createSession();

    const newSocket = io('http://localhost:4000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
    });
    
    newSocket.on('connect', () => {
      console.log('WebSocket bağlantısı kuruldu');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket bağlantısı kesildi:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket bağlantı hatası:', error);
      setConnected(false);
    });

    newSocket.on('metrics:ack', (data) => {
      console.log('Backend onayı:', data);
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const onResults = (results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const eyeBlinkRate = calcEyeOpenness(landmarks);
      const headMovement = calcHeadMovement(landmarks);
      const stressScore = Math.min(
        10,
        Math.max(0, (1 - eyeBlinkRate) * 6 + headMovement * 4),
      );

      const newMetrics = {
        eyeBlinkRate: Number(eyeBlinkRate.toFixed(2)),
        headMovement: Number(headMovement.toFixed(2)),
        stressScore: Number(stressScore.toFixed(2)),
      };
      setFaceMetrics(newMetrics);
      if (onFaceStressChange) {
        onFaceStressChange(newMetrics.stressScore);
      }
    }

    ctx.restore();
  };

  const sendMetrics = useCallback(() => {
    console.log('=== sendMetrics FONKSİYONU ÇAĞRILDI ===');
    console.log('Durum kontrolü:', { 
      socket: !!socket, 
      connected, 
      sessionId, 
      faceMetrics: !!faceMetrics, 
      voiceMetrics: !!voiceMetrics 
    });
    
    if (!socket) {
      console.error('Socket null! WebSocket bağlantısı kurulmamış.');
      return;
    }

    if (!connected) {
      console.warn('WebSocket bağlantısı aktif değil, yine de deniyoruz...');
      // Bağlantı yoksa bile deneyelim, belki bağlanır
    }

    const metrics = {
      sessionId: sessionId,
      questionId: null, // Backend otomatik oluşturacak
      faceMetrics: faceMetrics
        ? {
            stressScore: faceMetrics.stressScore,
            eyeBlinkRate: faceMetrics.eyeBlinkRate,
            headMovement: faceMetrics.headMovement,
          }
        : null,
      voiceMetrics: voiceMetrics && voiceMetrics.rms !== undefined
        ? {
            rms: voiceMetrics.rms,
            zcr: voiceMetrics.zcr,
            pitchHz: voiceMetrics.pitchHz,
            speechRate: voiceMetrics.pitchHz ? voiceMetrics.pitchHz / 100 : 0,
          }
        : null,
      timestamps: {
        questionStart: new Date().toISOString(),
        answerStart: new Date().toISOString(),
      },
    };

    console.log('Metrikler gönderiliyor:', metrics);
    try {
      socket.emit('metrics', metrics);
      console.log('Metrikler başarıyla gönderildi');
    } catch (error) {
      console.error('Metrik gönderme hatası:', error);
      alert('Metrikler gönderilirken bir hata oluştu.');
    }
  }, [socket, connected, sessionId, faceMetrics, voiceMetrics]);

  // Otomatik metrik gönderimi (her 5 saniyede bir)
  useEffect(() => {
    if (!connected || !socket || !sessionId) return;

    const interval = setInterval(() => {
      if (faceMetrics || (voiceMetrics && voiceMetrics.rms !== undefined)) {
        sendMetrics();
      }
    }, 5000); // 5 saniye

    return () => clearInterval(interval);
  }, [connected, socket, sessionId, faceMetrics, voiceMetrics, sendMetrics]);

  const handleRecordAndSend = async () => {
    if (isRecording) {
      // Kaydı durdur ve STT'ye gönder
      console.log('Kayıt durduruluyor ve STT\'ye gönderiliyor...');
      const blob = await stopRecording();
      if (!blob) {
        console.warn('Kayıt blob\'u alınamadı');
        return;
      }

      // Audio'yu base64'e çevir
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1]; // data:audio/webm;base64, kısmını çıkar

        try {
          console.log('STT endpoint\'ine gönderiliyor...');
          const response = await fetch('http://localhost:4000/stt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioData: base64Data,
              audioFormat: 'webm',
              sessionId: sessionId,
              questionId: null,
            }),
          });

          if (!response.ok) {
            throw new Error(`STT endpoint hatası: ${response.status}`);
          }

          const data = await response.json();
          setTranscript(data.transcript);
          console.log('STT Response:', data);
        } catch (error) {
          console.error('STT gönderme hatası:', error);
          alert('Ses kaydı gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
      };
      reader.readAsDataURL(blob);
    } else {
      // Kaydı başlat
      console.log('Ses kaydı başlatılıyor...');
      try {
        startRecording();
      } catch (error) {
        console.error('Kayıt başlatma hatası:', error);
        alert('Ses kaydı başlatılamadı. Lütfen mikrofon iznini kontrol edin.');
      }
    }
  };

  // Debug: Component render olduğunda log
  useEffect(() => {
    console.log('CameraView render edildi', { 
      connected, 
      socket: !!socket, 
      sessionId, 
      faceMetrics: !!faceMetrics, 
      voiceMetrics: !!voiceMetrics,
      isRecording 
    });
  });

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
        <canvas ref={canvasRef} className="camera-canvas" />
        <div className="status-overlay">
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Bağlı' : '🔴 Bağlantı Yok'}
          </div>
          {sessionId && (
            <div className="session-indicator">
              Session: {sessionId.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>
      <div className="controls" style={{ 
        zIndex: 9999, 
        position: 'relative',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '20px',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '800px'
      }}>
        <button 
          type="button"
          id="test-metrics-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('=== Test Metrikleri Gönder butonuna tıklandı ===');
            console.log('Durum:', { connected, socket: !!socket, sessionId, faceMetrics: !!faceMetrics, voiceMetrics: !!voiceMetrics });
            sendMetrics();
          }} 
          title="Metrikleri gönder"
          style={{ 
            pointerEvents: 'auto !important',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 10001,
            opacity: 1,
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            minWidth: '200px',
            userSelect: 'none'
          }}
        >
          Test Metrikleri Gönder
        </button>
        <button
          type="button"
          id="record-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('=== Ses Kaydı butonuna tıklandı ===');
            console.log('Durum:', { isRecording, connected, socket: !!socket, sessionId });
            handleRecordAndSend().catch((error) => {
              console.error('handleRecordAndSend hatası:', error);
            });
          }}
          className={isRecording ? 'recording' : ''}
          title={isRecording ? 'Kaydı durdur ve gönder' : 'Ses kaydını başlat'}
          style={{ 
            pointerEvents: 'auto !important',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 10001,
            opacity: 1,
            padding: '12px 24px',
            backgroundColor: isRecording ? '#ef4444' : 'white',
            color: isRecording ? 'white' : '#667eea',
            border: `2px solid ${isRecording ? '#ef4444' : '#667eea'}`,
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            minWidth: '200px',
            userSelect: 'none'
          }}
        >
          {isRecording ? '⏹️ Kaydı Durdur ve Gönder' : '🎤 Ses Kaydı Başlat'}
        </button>
      </div>
      <div className="metrics-panel">
        <h3>Yüz Metrikleri</h3>
        {faceMetrics ? (
          <ul>
            <li>Stres Skoru: {faceMetrics.stressScore.toFixed(2)}</li>
            <li>Göz Açıklığı (blink düşük): {faceMetrics.eyeBlinkRate.toFixed(2)}</li>
            <li>Kafa Hareketi: {faceMetrics.headMovement.toFixed(2)}</li>
          </ul>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Yüz tespit ediliyor... Lütfen kameraya bakın.
          </p>
        )}
      </div>
      <div className="metrics-panel">
        <h3>Ses Metrikleri</h3>
        {voiceMetrics && voiceMetrics.rms !== undefined ? (
          <ul>
            <li>RMS (enerji): {voiceMetrics.rms.toFixed(4)}</li>
            <li>ZCR (saniye başına crossing): {voiceMetrics.zcr.toFixed(2)}</li>
            <li>Pitch (Hz): {voiceMetrics.pitchHz ? voiceMetrics.pitchHz.toFixed(2) : '—'}</li>
          </ul>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Ses analizi başlatılıyor...
          </p>
        )}
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

// Basit göz açıklığı metriği (EAR benzeri)
function calcEyeOpenness(landmarks: { x: number; y: number; z: number }[]) {
  const leftUpper = landmarks[159];
  const leftLower = landmarks[145];
  const leftLeft = landmarks[33];
  const leftRight = landmarks[133];

  const rightUpper = landmarks[386];
  const rightLower = landmarks[374];
  const rightLeft = landmarks[362];
  const rightRight = landmarks[263];

  const leftVert = distance(leftUpper, leftLower);
  const leftHorz = distance(leftLeft, leftRight);
  const rightVert = distance(rightUpper, rightLower);
  const rightHorz = distance(rightLeft, rightRight);

  const leftRatio = leftVert / leftHorz;
  const rightRatio = rightVert / rightHorz;

  // Normalde ~0.25-0.35 arası; 0'a yakınsa göz kapalı
  const ear = (leftRatio + rightRatio) / 2;
  return Math.max(0, Math.min(1, ear * 3)); // normalize 0-1
}

// Basit kafa hareketi metriği (pitch/yaw yaklaşık)
function calcHeadMovement(landmarks: { x: number; y: number; z: number }[]) {
  const nose = landmarks[1];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];

  const horiz = distance(leftEar, rightEar);
  const noseToLeft = distance(nose, leftEar);
  const noseToRight = distance(nose, rightEar);

  const yawAsymmetry = Math.abs(noseToLeft - noseToRight) / horiz;
  // 0-1 aralığına sıkıştır
  return Math.max(0, Math.min(1, yawAsymmetry * 3));
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2),
  );
}

