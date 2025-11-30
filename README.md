# 🎯 Davranışsal Tutarsızlık Analiz Uygulaması

## Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Kurulum

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd frontend
npm install
```

### Çalıştırma

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
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health

## Proje Yapısı

```
AiProject/
├── backend/          # Node.js + Express + Socket.IO
├── frontend/         # React + TypeScript + Vite
└── SUNUM.md          # Detaylı sunum dosyası
```

## Özellikler

✅ Kamera ve mikrofon erişimi  
✅ Real-time WebSocket bağlantısı  
✅ Ses kaydı ve STT prototipi  
✅ Veritabanı şeması (Prisma + SQLite)  
✅ Kullanıcı rızası modalı  

## Detaylı Bilgi

Sunum için `SUNUM.md` dosyasına bakın.

