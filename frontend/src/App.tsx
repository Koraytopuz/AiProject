import { useState, useEffect } from 'react';
import ConsentModal from './components/ConsentModal';
import CameraView from './components/CameraView';
import QuestionFlow from './components/QuestionFlow';
import './App.css';

function App() {
  const [consentGiven, setConsentGiven] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleConsent = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      setStream(mediaStream);
      setConsentGiven(true);
    } catch (error) {
      console.error('Kamera/mikrofon erişimi reddedildi:', error);
      alert('Kamera ve mikrofon erişimi gerekli. Lütfen izin verin.');
    }
  };

  return (
    <div className="app">
      {!consentGiven ? (
        <ConsentModal onConsent={handleConsent} />
      ) : (
        <>
          <CameraView stream={stream!} />
          <QuestionFlow />
        </>
      )}
    </div>
  );
}

export default App;

