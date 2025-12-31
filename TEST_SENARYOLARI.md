# 🧪 Test Senaryoları - Hafta 1, 2, 3

## 🚀 Servisleri Başlatma

### Backend
```bash
cd backend
npm run dev
```
Backend: `http://localhost:4000`

### Frontend
```bash
cd frontend
npm run dev
```
Frontend: `http://localhost:3000`

---

## ✅ Test Senaryoları

### 1. Backend Health Check
**Endpoint:** `GET http://localhost:4000/health`

**Beklenen:**
```json
{"status":"ok"}
```

**Test:**
```bash
curl http://localhost:4000/health
```

---

### 2. Session Oluşturma
**Endpoint:** `POST http://localhost:4000/sessions`

**Test:**
```bash
curl -X POST http://localhost:4000/sessions \
  -H "Content-Type: application/json"
```

**Beklenen:** Session ID döner

---

### 3. Soru Akışı Başlatma
**Endpoint:** `POST http://localhost:4000/sessions/:sessionId/bootstrap-questions`

**Test:**
```bash
# Önce session oluştur, sonra:
curl -X POST http://localhost:4000/sessions/[SESSION_ID]/bootstrap-questions \
  -H "Content-Type: application/json"
```

**Beklenen:** 20 soru döner

---

### 4. NLP Analizi
**Endpoint:** `POST http://localhost:4000/nlp/analyze`

**Test:**
```bash
curl -X POST http://localhost:4000/nlp/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Bugün nasılsın?",
    "answerText": "İyiyim, teşekkürler. Sen nasılsın?",
    "faceStressScore": 3.5
  }'
```

**Beklenen:**
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
    "faceStressLevel": 3.5,
    "textEmotionLevel": 2.0,
    "mismatch": false
  }
}
```

---

### 5. Duygu-İçerik Uyumu Analizi
**Endpoint:** `POST http://localhost:4000/nlp/emotion-consistency`

**Test:**
```bash
curl -X POST http://localhost:4000/nlp/emotion-consistency \
  -H "Content-Type: application/json" \
  -d '{
    "answerText": "Çok mutluyum, harika bir gün geçirdim!",
    "faceStressScore": 8.5
  }'
```

**Beklenen:** Uyumsuzluk tespit edilmeli (yüz stresi yüksek ama metin pozitif)

---

### 6. Cevap Tutarlılık Analizi
**Endpoint:** `POST http://localhost:4000/nlp/consistency`

**Test:**
```bash
curl -X POST http://localhost:4000/nlp/consistency \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "[QUESTION_ID]"
  }'
```

**Beklenen:** Aynı soruya verilen farklı cevapların tutarlılık analizi

---

### 7. Session Metrikleri
**Endpoint:** `GET http://localhost:4000/sessions/:sessionId/metrics`

**Test:**
```bash
curl http://localhost:4000/sessions/[SESSION_ID]/metrics
```

**Beklenen:** Ortalama skorlar ve detaylı metrikler

---

## 🖥️ Frontend Test Senaryoları

### 1. Kamera ve Mikrofon Erişimi
1. `http://localhost:3000` aç
2. Consent modal görünür
3. "İzin Ver ve Devam Et" butonuna tıkla
4. Tarayıcı izin ister → İzin ver
5. **Beklenen:** Video stream görünür, sağ üstte "🟢 Bağlı" durumu

---

### 2. Yüz Analizi
1. Kamera açıldıktan sonra
2. **Beklenen:**
   - Video üzerinde yüz landmark'ları çizilir (canvas overlay)
   - "Yüz Metrikleri" panelinde:
     - Stres Skoru (0-10)
     - Göz Açıklığı
     - Kafa Hareketi
   - Metrikler gerçek zamanlı güncellenir

---

### 3. Ses Analizi
1. Mikrofon aktif olduğunda
2. Konuş
3. **Beklenen:**
   - "Ses Metrikleri" panelinde:
     - RMS (enerji)
     - ZCR (zero-crossing rate)
     - Pitch (Hz)
   - Metrikler gerçek zamanlı güncellenir

---

### 4. Soru Akışı
1. Sayfa açıldığında otomatik olarak:
   - Session oluşturulur
   - 20 soru yüklenir
2. **Beklenen:**
   - "Soru 1 / 20" görünür
   - Soru metni görünür
   - Kategori etiketi görünür
   - Cevap textarea'sı görünür

---

### 5. NLP Analizi (Frontend)
1. Bir soruya cevap yaz (örn: "Bugün iyiyim, teşekkürler")
2. "Cevabı Analiz Et" butonuna tıkla
3. **Beklenen:**
   - "NLP Tutarlılık Skoru" paneli görünür:
     - NLP Skoru (0-10)
     - Semantik Uyum
     - Belirsizlik
     - Kaçamaklık
     - Uzunluk Skoru
   - Eğer yüz stres skoru varsa:
     - "Duygu-İçerik Uyumu" paneli görünür
     - Uyumlu/Uyumsuz durumu
     - Yüz stres seviyesi
     - Metin duygusal tonu

---

### 6. Duygu-İçerik Uyumu Testi
1. Yüz stres skoru yüksekken (örneğin 8-9)
2. Pozitif bir cevap yaz (örn: "Çok mutluyum!")
3. "Cevabı Analiz Et" butonuna tıkla
4. **Beklenen:**
   - "⚠️ Uyumsuzluk Tespit Edildi" uyarısı görünür
   - Uyum skoru düşük olur

---

### 7. Otomatik Metrik Gönderimi
1. Kamera ve mikrofon aktif olduğunda
2. **Beklenen:**
   - Her 5 saniyede bir metrikler backend'e gönderilir
   - Backend terminalinde `incoming metrics payload` logları görünür
   - Frontend console'da `Backend onayı` mesajları görünür

---

### 8. Ses Kaydı ve STT
1. "🎤 Ses Kaydı Başlat" butonuna tıkla
2. 5-10 saniye konuş
3. "⏹️ Kaydı Durdur ve Gönder" butonuna tıkla
4. **Beklenen:**
   - Transkript ekranda görünür (şimdilik mock: "STT placeholder...")
   - Backend `/stt` endpoint'ine istek gönderilir

---

## 🔍 Kontrol Noktaları

### Backend Terminal
- ✅ `Backend listening on http://localhost:4000` mesajı
- ✅ `socket connected: [socket-id]` mesajları
- ✅ `incoming metrics payload` logları
- ✅ Hata mesajı yok

### Frontend Console (F12)
- ✅ `WebSocket bağlantısı kuruldu` mesajı
- ✅ `Session oluşturuldu: [session-id]` mesajı
- ✅ `Backend onayı: { ok: true, ... }` mesajları
- ✅ Hata mesajı yok

### Veritabanı
```bash
cd backend
npx prisma studio
```
- ✅ Session kayıtları var
- ✅ Question kayıtları var (20 soru)
- ✅ Answer kayıtları var (metrikler ve NLP skorları ile)

---

## 🐛 Sorun Giderme

### Backend Başlamıyor
- Port 4000 kullanımda mı? `netstat -ano | findstr :4000`
- Node modules kurulu mu? `npm install`
- TypeScript hatası var mı? `npm run build`

### Frontend Başlamıyor
- Port 3000 kullanımda mı?
- Vite cache temizle: `rm -rf node_modules/.vite`

### WebSocket Bağlanmıyor
- Backend çalışıyor mu? Health check yap
- CORS hatası var mı? Backend console'u kontrol et

### Kamera/Mikrofon Çalışmıyor
- HTTPS gerekiyor (localhost hariç)
- Tarayıcı izinleri kontrol et
- Başka uygulama kullanıyor mu?

### NLP Analizi Çalışmıyor
- Backend endpoint'e ulaşıyor mu? Network tab'da kontrol et
- Request body doğru mu? Console'da kontrol et

---

## ✅ Test Checklist

- [ ] Backend health check başarılı
- [ ] Frontend açılıyor
- [ ] Consent modal görünüyor
- [ ] Kamera/mikrofon izni veriliyor
- [ ] Video stream görünüyor
- [ ] WebSocket bağlantısı kuruluyor
- [ ] Yüz analizi çalışıyor (landmark'lar görünüyor)
- [ ] Ses analizi çalışıyor (metrikler güncelleniyor)
- [ ] Soru akışı başlatılıyor (20 soru yükleniyor)
- [ ] NLP analizi çalışıyor (cevap analiz ediliyor)
- [ ] Duygu-içerik uyumu çalışıyor (uyumsuzluk tespit ediliyor)
- [ ] Otomatik metrik gönderimi çalışıyor
- [ ] Veritabanı kayıtları oluşuyor
- [ ] Session metrikleri görüntüleniyor

---

**Son Güncelleme:** 30 Kasım 2025

