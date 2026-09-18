# Cinematic AI Studio v3 — FULL

Aplicație full-stack pentru VS Code + PWA pe iPhone.

## Două moduri

### Safe Motion
Funcționează fără API.
- zoom lent
- ridicare ușoară a camerei
- efect subtil de nori
- efect subtil de apă/reflexii
- păstrează imaginea originală
- poți pune citatul ca strat separat

### AI Motion
Folosește AI image-to-video prin fal.ai.
- Kling Video v3 Standard
- Pika 2.2
- primește imagine + instrucțiunea ta în română
- video generativ real
- 5–15 secunde în funcție de model

IMPORTANT: AI-ul generativ poate modifica detalii ale imaginii. Pentru ca scrisul să rămână 100% identic, NU îl pune în imaginea trimisă modelului; lipește citatul în câmpul „Citat separat”. Aplicația îl pune peste video după generare.

## Instalare în VS Code / Windows

1. Instalează Node.js 20 sau mai nou.
2. Dezarhivează ZIP-ul.
3. Deschide folderul în VS Code.
4. Copiază `.env.example` ca `.env`.
5. Pentru AI Motion, pune cheia:
   `FAL_KEY=...`
6. În terminal:
   `npm install`
   `npm start`
7. Deschide:
   `http://localhost:3000`

Pe Windows poți folosi și `run_windows.bat`.

## iPhone / PWA

Ca să o instalezi pe iPhone, serverul trebuie să fie publicat pe HTTPS.
Poți publica aplicația Node pe Render, Railway, Fly.io sau alt hosting Node/Docker.

După publicare:
Safari -> Share -> Add to Home Screen.

NU pune cheia FAL_KEY în frontend. Ea trebuie să rămână doar în `.env` pe server.

## Exemplu de comandă pentru robot

`Băiatul să nu se miște. Camera să se ridice foarte ușor în sus, zoom lent, norii să se miște încet și apa să aibă reflexii subtile. 10 secunde.`

## Flux recomandat pentru citate TikTok

1. Folosește imagine FĂRĂ citat pentru AI Motion.
2. Generează mișcarea.
3. Lipește citatul în „Citat separat”.
4. Exportă.
5. Textul nu este regenerat de AI și rămâne stabil.

## Costuri

Safe Motion este local.
AI Motion folosește un serviciu extern și consumă creditul contului fal.ai. Costul depinde de model/durată și se poate schimba.
