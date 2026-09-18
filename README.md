# Cinematic Maker — VS Code + iPhone PWA

Același proiect merge în VS Code și poate fi publicat ca PWA pentru iPhone.

## Pe PC / VS Code
1. Dezarhivează ZIP-ul.
2. Deschide VS Code.
3. File -> Open Folder și alege folderul `cinematic_maker_pwa_vscode`.
4. Varianta rapidă pe Windows: dublu click pe `run_windows.bat`.
5. Sau în terminal:
   `python -m http.server 5500`
6. Deschide în browser:
   `http://localhost:5500`

În VS Code poți folosi și:
Terminal -> Run Task -> Run Cinematic Maker

## Pe iPhone
PWA-ul trebuie publicat pe HTTPS. Nu se instalează direct din ZIP.
Poți urca folderul pe Netlify / Vercel / GitHub Pages, apoi:
Safari -> Share -> Add to Home Screen.

## Ce face
- încarcă o poză;
- interpretează instrucțiuni simple în română;
- slow zoom;
- mișcare ușoară în sus/stânga/dreapta;
- efect subtil de nori;
- efect subtil de reflexii pe apă;
- păstrează poza și scrisul fără regenerare AI;
- preview;
- export video când browserul suportă MediaRecorder/canvas capture.

## Exemplu de comandă
`Băiatul să nu se miște. Textul să rămână fix până la final. Camera să se ridice foarte ușor, zoom lent, norii să se miște încet și apa să aibă reflexii subtile. 10 secunde.`

## Notă
Această versiune este un animator controlat, nu un model AI generativ image-to-video.
Avantajul este că nu regenerează literele sau persoana din poză.
