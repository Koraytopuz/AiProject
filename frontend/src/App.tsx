import { useState, useEffect } from 'react';
import ConsentModal from './components/ConsentModal';
import CameraView from './components/CameraView';
import QuestionFlow from './components/QuestionFlow';
import ResultsView from './components/ResultsView';
import './App.css';

function App() {
  const [consentGiven, setConsentGiven] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceStressScore, setFaceStressScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  const handleQuestionComplete = (completedSessionId: string) => {
    setSessionId(completedSessionId);
    setShowResults(true);
  };

  const handleBackToQuestions = () => {
    setShowResults(false);
  };

  return (
    <div className="app">
      {!consentGiven ? (
        <ConsentModal onConsent={handleConsent} />
      ) : showResults && sessionId ? (
        <ResultsView sessionId={sessionId} onBack={handleBackToQuestions} />
      ) : (
        <>
          <CameraView stream={stream!} onFaceStressChange={setFaceStressScore} />
          <QuestionFlow
            faceStressScore={faceStressScore}
            onComplete={handleQuestionComplete}
          />
        </>
      )}
    </div>
  );
}

export default App;

