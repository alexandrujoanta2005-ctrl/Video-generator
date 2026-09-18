# Cinematic AI Studio v4 — iPhone FULL + 60 FPS

Versiune făcută pentru iPhone/PWA și VS Code.

## Ce are
- interfață simplificată pentru iPhone
- robot cu instrucțiuni în română
- AI Motion: Kling 3 / Pika 2.2 prin fal.ai
- Safe Motion fără API
- 30 FPS sau 60 FPS
- pentru AI Motion, serverul încearcă interpolare la 60 FPS cu FFmpeg
- citat separat, fix peste video
- PWA instalabilă din Safari
- export/download video

## Important despre 60 FPS
AI-ul poate genera la propriul FPS intern. Opțiunea 60 FPS din aplicație face post-procesare/interpolare pentru un clip mai fluid. Nu înseamnă că modelul AI a generat nativ fiecare cadru la 60 FPS.

## Pe PC / VS Code
1. Instalează Node.js 20+.
2. Deschide folderul în VS Code.
3. Copiază `.env.example` ca `.env`.
4. Pune `FAL_KEY=...` în `.env` pentru AI Motion.
5. Rulează `npm install` și `npm start`.
6. Deschide `http://localhost:3000`.

## Pe iPhone
AI Motion are nevoie de server online. Publică proiectul pe un host Node/Docker, de exemplu Render/Railway/Fly.io.
Pe Render există `render.yaml` în proiect. Adaugi `FAL_KEY` ca secret/env var.
După publicare: deschizi linkul în Safari -> Share -> Add to Home Screen.

## Flux recomandat pentru citate
Pentru rezultate curate: folosește la AI o imagine fără text și pune citatul în câmpul `Citat separat`. Astfel AI-ul nu poate strica literele.
