# 🧪 Test Rehberi

## Test Senaryoları

### 1. Servis Kontrolü ✅

**Backend Health Check:**
```bash
curl http://localhost:4000/health
```
Beklenen: `{"status":"ok"}`

---

### 2. WebSocket Bağlantısı ✅

**Adımlar:**
1. Frontend'i aç: http://localhost:3000
2. Consent modal'da "İzin Ver ve Devam Et" butonuna tıkla
3. Tarayıcı izin ister → İzin ver
4. Sağ üstte "🟢 Bağlı" durumu görünmeli

**Kontrol:**
- Backend terminalinde: `socket connected: [socket-id]` mesajı
- Frontend console (F12): `WebSocket bağlantısı kuruldu`

---

### 3. Kamera/Mikrofon Erişimi ✅

**Adımlar:**
1. Consent modal'da izin ver
2. Video stream görünmeli (ayna görüntüsü)
3. Mikrofon aktif olmalı

**Kontrol:**
- Tarayıcı izinleri kontrol et (🔒 → Site Ayarları)
- Video element'te stream görünmeli

---

### 4. Ses Kaydı ve STT ✅

**Adımlar:**
1. "🎤 Ses Kaydı Başlat" butonuna tıkla
2. Buton "⏹️ Kaydı Durdur ve Gönder" olarak değişmeli
3. 5-10 saniye konuş (örn: "Merhaba, bu bir test kaydıdır")
4. "⏹️ Kaydı Durdur ve Gönder" butonuna tıkla
5. Transkript ekranda görünmeli

**Kontrol:**
- Backend terminalinde: STT request logu
- Frontend'de transkript kutusu görünmeli
- Console'da STT response logu

**Beklenen Response:**
```json
{
  "transcript": "STT placeholder: Whisper integration pending",
  "confidence": 0.85,
  "sessionId": null,
  "questionId": null
}
```

---

### 5. Metrik Gönderme ✅

**Adımlar:**
1. "Test Metrikleri Gönder" butonuna tıkla
2. Backend'e metrikler gönderilmeli

**Kontrol:**
- Backend terminalinde: `incoming metrics payload` logu
- Frontend console: `Backend onayı: { ok: true, ... }`

**Gönderilen Metrikler:**
```json
{
  "questionId": 1,
  "faceMetrics": {
    "stressScore": 5.2,
    "eyeBlinkRate": 3.1,
    "headMovement": 7.8
  },
  "voiceMetrics": {
    "pitchVariability": 4.5,
    "speechRate": 6.2
  },
  "timestamps": {
    "questionStart": "2025-11-30T...",
    "answerStart": "2025-11-30T..."
  }
}
```

---

### 6. Veritabanı İşlemleri ✅

**Session Oluşturma:**
```bash
curl -X POST http://localhost:4000/sessions \
  -H "Content-Type: application/json"
```

**Soru Ekleme:**
```bash
curl -X POST http://localhost:4000/sessions/[SESSION_ID]/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Bugün nasılsın?",
    "category": "duygusal_tepkiler",
    "questionNumber": 1
  }'
```

**Kontrol:**
- Prisma Studio ile veritabanını görüntüle:
```bash
cd backend
npx prisma studio
```

---

## Sorun Giderme

### Backend Başlamıyor
- Port 4000 kullanımda mı? `netstat -ano | findstr :4000`
- Node modules kurulu mu? `npm install`

### Frontend Başlamıyor
- Port 3000 kullanımda mı?
- Vite cache temizle: `rm -rf node_modules/.vite`

### WebSocket Bağlanmıyor
- Backend çalışıyor mu? Health check yap
- CORS hatası var mı? Backend console'u kontrol et
- Firewall engelliyor mu?

### Kamera/Mikrofon Çalışmıyor
- HTTPS gerekiyor (localhost hariç)
- Tarayıcı izinleri kontrol et
- Başka uygulama kullanıyor mu?

### STT Çalışmıyor
- Audio blob oluşuyor mu? Console'da kontrol et
- Backend endpoint'e ulaşıyor mu? Network tab'da kontrol et
- Base64 encoding doğru mu?

---

## Test Checklist

- [ ] Backend health check başarılı
- [ ] Frontend açılıyor
- [ ] Consent modal görünüyor
- [ ] Kamera/mikrofon izni veriliyor
- [ ] Video stream görünüyor
- [ ] WebSocket bağlantısı kuruluyor
- [ ] Ses kaydı başlatılıyor
- [ ] Ses kaydı durduruluyor
- [ ] STT response alınıyor
- [ ] Transkript görüntüleniyor
- [ ] Metrikler gönderiliyor
- [ ] Backend metrikleri alıyor
- [ ] Veritabanı session oluşturuyor
- [ ] Veritabanı question ekliyor

---

**Son Güncelleme:** 30 Kasım 2025

