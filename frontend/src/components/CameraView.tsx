import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import './CameraView.css';

interface CameraViewProps {
  stream: MediaStream;
}

function CameraView({ stream }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [faceMetrics, setFaceMetrics] = useState<{
    eyeBlinkRate: number;
    headMovement: number;
    stressScore: number;
  } | null>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(stream);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

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

      setFaceMetrics({
        eyeBlinkRate: Number(eyeBlinkRate.toFixed(2)),
        headMovement: Number(headMovement.toFixed(2)),
        stressScore: Number(stressScore.toFixed(2)),
      });
    }

    ctx.restore();
  };

  const sendMetrics = () => {
    if (!socket || !connected) return;

    const metrics = {
      questionId: 1,
      faceMetrics: faceMetrics ?? {
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
        <canvas ref={canvasRef} className="camera-canvas" />
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
      {faceMetrics && (
        <div className="metrics-panel">
          <h3>Yüz Metrikleri</h3>
          <ul>
            <li>Stres Skoru: {faceMetrics.stressScore.toFixed(2)}</li>
            <li>Göz Açıklığı (blink düşük): {faceMetrics.eyeBlinkRate.toFixed(2)}</li>
            <li>Kafa Hareketi: {faceMetrics.headMovement.toFixed(2)}</li>
          </ul>
        </div>
      )}
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

