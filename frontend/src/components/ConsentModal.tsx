import './ConsentModal.css';

interface ConsentModalProps {
  onConsent: () => void;
}

function ConsentModal({ onConsent }: ConsentModalProps) {
  return (
    <div className="consent-overlay">
      <div className="consent-modal">
        <h1>Davranışsal Tutarsızlık Analizi</h1>
        <div className="consent-content">
          <h2>Önemli Bilgilendirme</h2>
          <p>
            Bu uygulama, <strong>bilimsel yalan tespiti yapmaz</strong>. 
            Sadece davranışsal tutarsızlık analizi gerçekleştirir.
          </p>
          <ul>
            <li>Kamera ve mikrofon erişimi gereklidir</li>
            <li>Yüz ifadeleri ve ses tonu analiz edilecektir</li>
            <li>Veriler şifrelenmiş olarak saklanacaktır</li>
            <li>Sonuçlar kesin değildir ve yalnızca referans amaçlıdır</li>
          </ul>
          <div className="consent-warning">
            <strong>⚠️ Uyarı:</strong> Bu uygulama yalan tespit cihazı değildir. 
            Sunulan skor sadece "stres ve tutarsızlık analizi"dir.
          </div>
          <button className="consent-button" onClick={onConsent}>
            İzin Ver ve Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentModal;

