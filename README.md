# 🎯 Davranışsal Tutarsızlık Analiz Uygulaması

Modern web teknolojileri kullanılarak geliştirilmiş, kamera ve mikrofon ile gerçek zamanlı davranışsal analiz yapan bir uygulamadır.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Stack](#teknoloji-stack)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Proje Yapısı](#proje-yapısı)
- [Test](#test)
- [Önemli Uyarılar](#önemli-uyarılar)

## ✨ Özellikler

### 🎥 Real-time Analiz
- **Kamera Analizi:** MediaPipe Face Mesh ile gerçek zamanlı yüz landmark tespiti
- **Ses Analizi:** Web Audio API ile ses tonu, pitch, RMS ve ZCR analizi
- **WebSocket Bağlantısı:** Backend ile gerçek zamanlı veri iletişimi

### 📊 Analiz Metrikleri
- **Yüz Analizi:**
  - Göz kırpma oranı
  - Kafa hareketleri
  - Mikro ifadeler (kaş çatma, dudak ısırma)
  - Stres skoru hesaplama

- **Ses Analizi:**
  - Konuşma hızı değişkenliği
  - Ses titremesi (jitter, shimmer)
  - Pitch değişkenliği
  - Nefes alma sıklığı

- **NLP Analizi:**
  - Semantik tutarlılık
  - Belirsizlik ifadeleri tespiti
  - Kaçamaklık analizi
  - Cevap uzunluğu değerlendirmesi
  - Duygu-içerik uyumu kontrolü

- **Reaction Delay:**
  - Soru sorulduktan sonra cevap başlama süresi
  - Tepki gecikmesi analizi

### 📈 Görselleştirme
- Davranışsal tutarsızlık skoru (0-100)
- Soru bazlı skor dağılımı grafikleri
- Metrik karşılaştırma grafikleri
- Kategori bazında analiz
- Detaylı soru-cevap tablosu

### 🗄️ Veritabanı
- Prisma ORM ile veritabanı yönetimi
- SQLite (geliştirme) / PostgreSQL (production)
- Session, Question, Answer modelleri
- Otomatik metrik kayıtları

## 🛠️ Teknoloji Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **MediaPipe Face Mesh** - Yüz landmark tespiti
- **Web Audio API** - Ses analizi
- **Socket.IO Client** - WebSocket bağlantısı
- **Recharts** - Grafik görselleştirme

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Socket.IO** - WebSocket server
- **TypeScript** - Type safety
- **Prisma** - ORM
- **SQLite** - Veritabanı (dev)
- **PostgreSQL** - Veritabanı (prod)

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Git

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/Koraytopuz/AiProject.git
cd AiProject
```

2. **Backend kurulumu:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

3. **Frontend kurulumu:**
```bash
cd ../frontend
npm install
```

4. **Environment değişkenleri (opsiyonel):**
```bash
# backend/.env
DATABASE_URL="file:./dev.db"
PORT=4000
```

## 💻 Kullanım

### Geliştirme Modu

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Erişim
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

### Kullanım Akışı

1. **Başlangıç:** Uygulama açıldığında consent modal görünür
2. **İzin:** Kamera ve mikrofon erişimi için izin verin
3. **Soru Akışı:** 20 soru otomatik olarak yüklenir
4. **Cevap:** Her soru için metin cevabı girin
5. **Analiz:** "Cevabı Analiz Et" butonuna tıklayın
6. **Sonuçlar:** Tüm sorular tamamlandığında sonuç ekranı görünür

## 📡 API Dokümantasyonu

### REST Endpoints

#### Health Check
```http
GET /health
```
**Response:**
```json
{"status":"ok"}
```

#### Session Oluşturma
```http
POST /sessions
```
**Response:**
```json
{
  "id": "session-uuid",
  "status": "active",
  "createdAt": "2025-11-30T..."
}
```

#### Soru Yükleme
```http
POST /sessions/:sessionId/bootstrap-questions
```
**Response:**
```json
{
  "questions": [
    {
      "id": "question-uuid",
      "questionText": "...",
      "category": "...",
      "questionNumber": 1
    }
  ]
}
```

#### NLP Analizi
```http
POST /nlp/analyze
```
**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "questionId": "question-uuid",
  "questionText": "Bugün nasılsın?",
  "answerText": "İyiyim, teşekkürler.",
  "faceStressScore": 3.5
}
```

**Response:**
```json
{
  "nlpScore": 7.5,
  "semanticScore": 8.0,
  "uncertaintyScore": 0,
  "evasivenessScore": 0,
  "lengthScore": 8.0,
  "emotionAnalysis": {
    "consistencyScore": 8.2,
    "emotionTone": "positive",
    "mismatch": false
  }
}
```

#### Skor Hesaplama
```http
POST /sessions/:sessionId/calculate-score
```
**Response:**
```json
{
  "sessionId": "session-uuid",
  "finalScore": 45.5,
  "totalQuestions": 20,
  "answeredQuestions": 20,
  "averageFaceScore": 5.2,
  "averageVoiceScore": 4.8,
  "averageNlpScore": 6.1,
  "categoryBreakdown": {...}
}
```

### WebSocket Events

#### Client → Server

**`metrics`** - Metrik gönderme
```json
{
  "sessionId": "session-uuid",
  "questionId": "question-uuid",
  "faceMetrics": {
    "stressScore": 5.2,
    "eyeBlinkRate": 0.3,
    "headMovement": 0.15
  },
  "voiceMetrics": {
    "rms": 0.5,
    "zcr": 0.2,
    "pitchHz": 180
  },
  "timestamps": {
    "questionStart": "2025-11-30T...",
    "answerStart": "2025-11-30T..."
  }
}
```

#### Server → Client

**`metrics:ack`** - Metrik onayı
```json
{
  "ok": true,
  "sessionId": "session-uuid",
  "questionId": "question-uuid",
  "receivedAt": "2025-11-30T..."
}
```

## 📁 Proje Yapısı

```
AiProject/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server + Socket.IO
│   │   ├── db.ts              # Prisma client
│   │   ├── nlp.ts             # NLP analiz fonksiyonları
│   │   ├── scoring.ts         # Skor hesaplama motoru
│   │   └── questions.ts      # Soru listesi
│   ├── prisma/
│   │   ├── schema.prisma      # Veritabanı şeması
│   │   └── migrations/        # Migration dosyaları
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Ana uygulama
│   │   ├── components/
│   │   │   ├── ConsentModal.tsx
│   │   │   ├── CameraView.tsx
│   │   │   ├── QuestionFlow.tsx
│   │   │   └── ResultsView.tsx
│   │   └── hooks/
│   │       ├── useAudioRecorder.ts
│   │       └── useAudioAnalyzer.ts
│   ├── package.json
│   └── vite.config.ts
│
├── README.md
├── TEST_REHBERI.md
├── TEST_SENARYOLARI.md
└── TEST_SONUCLARI.md
```

## 🧪 Test

Detaylı test senaryoları için:
- `TEST_REHBERI.md` - Adım adım test rehberi
- `TEST_SENARYOLARI.md` - Test senaryoları
- `TEST_SONUCLARI.md` - Test sonuçları

### Hızlı Test

```bash
# Backend health check
curl http://localhost:4000/health

# Session oluştur
curl -X POST http://localhost:4000/sessions

# Prisma Studio (veritabanı görüntüleme)
cd backend
npx prisma studio
```

## ⚠️ Önemli Uyarılar

### Etik ve Kullanım
- **Bu uygulama bilimsel yalan tespiti yapmaz.** Sadece davranışsal tutarsızlık analizi gerçekleştirir.
- Sonuçlar kesin değildir ve sadece referans amaçlıdır.
- Çevresel faktörler (gürültü, ışık, teknik sorunlar) sonuçları etkileyebilir.
- Her bireyin doğal davranış kalıpları farklıdır.
- Bu uygulama eğitim ve araştırma amaçlıdır. Ciddi kararlar için kullanılmamalıdır.

### Veri Gizliliği
- Tüm veriler yerel olarak saklanır (SQLite).
- Üçüncü taraflarla paylaşılmaz.
- Production ortamında PostgreSQL kullanılması önerilir.

### Teknik Notlar
- MediaPipe Face Mesh tarayıcı uyumluluğu için modern tarayıcı gereklidir.
- HTTPS gereklidir (localhost hariç) kamera/mikrofon erişimi için.
- WebSocket bağlantısı için backend'in çalışıyor olması gerekir.

## 📝 Lisans

Bu proje eğitim ve araştırma amaçlıdır.

## 👥 Katkıda Bulunanlar

- Koray Topuz

## 📞 İletişim

Sorularınız için GitHub Issues kullanabilirsiniz.

---

**Son Güncelleme:** 30 Kasım 2025
