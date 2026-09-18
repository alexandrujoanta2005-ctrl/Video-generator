
const $ = (id)=>document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d", {alpha:false});
let img = new Image();
let imgReady = false;
let running = false;
let rafId = null;
let currentCfg = null;

const defaultCfg = {
  duration:10, fps:30,
  zoomStart:1.03, zoomEnd:1.08,
  rise:0.045, panX:0,
  clouds:true, water:true, glow:true,
  cloudStrength:0.012, waterStrength:0.010,
  keepSubject:true, keepText:true
};

function clamp(v,a,b){ return Math.min(b,Math.max(a,v)); }
function easeInOut(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }

function parsePrompt(text){
  const t = (text||"").toLowerCase();
  const cfg = {...defaultCfg};
  const dur = t.match(/(\d{1,2})\s*(sec|secunde|s)\b/);
  if(dur) cfg.duration = clamp(parseInt(dur[1]),3,20);

  if(/fără zoom|no zoom/.test(t)){ cfg.zoomStart=1.02; cfg.zoomEnd=1.02; }
  else if(/zoom.*(foarte lent|ușor|încet|slow)/.test(t)){ cfg.zoomEnd=1.055; }
  else if(/zoom/.test(t)){ cfg.zoomEnd=1.09; }

  if(/ridic|în sus|upward|rise/.test(t)) cfg.rise = 0.055;
  if(/foarte ușor|foarte lent|subtil/.test(t)) cfg.rise = Math.min(cfg.rise,0.04);

  if(/spre dreapta|right/.test(t)) cfg.panX = 0.025;
  if(/spre stânga|left/.test(t)) cfg.panX = -0.025;

  cfg.clouds = !/fără nori|nu.*nori|no clouds/.test(t);
  cfg.water = !/fără apă|nu.*ap[aă]|no water/.test(t);
  cfg.glow = !/fără lumin|no glow/.test(t);

  if(/nori.*(încet|lent|ușor|subtil)/.test(t)) cfg.cloudStrength = 0.008;
  if(/ap[aă].*(ușor|subtil|încet|reflexii)/.test(t)) cfg.waterStrength = 0.008;

  cfg.keepSubject = $("keepSubject").checked || /băiatul.*(nu|nemișcat|fix|still|frozen)/.test(t);
  cfg.keepText = $("keepText").checked || /text|scris/.test(t);

  return cfg;
}

function fitCover(sw,sh,dw,dh,scale=1){
  const base = Math.max(dw/sw, dh/sh) * scale;
  return {w:sw*base,h:sh*base};
}

function drawFrame(progress, cfg){
  if(!imgReady) return;
  const t = easeInOut(clamp(progress,0,1));
  const W=canvas.width,H=canvas.height;
  ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H);

  const zoom = cfg.zoomStart + (cfg.zoomEnd-cfg.zoomStart)*t;
  const size = fitCover(img.naturalWidth,img.naturalHeight,W,H,zoom);
  const risePx = -H*cfg.rise*t;
  const panPx = W*cfg.panX*t;
  const x = (W-size.w)/2 + panPx;
  const y = (H-size.h)/2 + risePx;
  ctx.drawImage(img,x,y,size.w,size.h);

  // Subtle ambient overlays that do not rewrite pixels/text.
  if(cfg.clouds){
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = "screen";
    const drift = Math.sin(t*Math.PI*2)*W*cfg.cloudStrength;
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,"rgba(255,255,255,0)");
    grad.addColorStop(.5,"rgba(255,255,255,.7)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.translate(drift,0);
    ctx.fillStyle=grad;
    ctx.fillRect(-W*0.1,H*0.03,W*1.2,H*0.28);
    ctx.restore();
  }

  if(cfg.water){
    ctx.save();
    ctx.globalAlpha = 0.028;
    ctx.globalCompositeOperation = "screen";
    const y0=H*0.58;
    for(let i=0;i<12;i++){
      const yy=y0+i*H*0.026;
      const w=W*(0.20+0.45*Math.abs(Math.sin((i+1)*1.7+t*4)));
      const xx=(W-w)/2 + Math.sin(i+t*6)*W*cfg.waterStrength;
      ctx.fillStyle="rgba(255,220,170,.65)";
      ctx.fillRect(xx,yy,w,1.2);
    }
    ctx.restore();
  }

  if(cfg.glow){
    ctx.save();
    ctx.globalAlpha = 0.04 + 0.025*Math.sin(t*Math.PI);
    const g=ctx.createRadialGradient(W*.52,H*.36,0,W*.52,H*.36,W*.48);
    g.addColorStop(0,"rgba(255,190,120,.8)");
    g.addColorStop(1,"rgba(255,190,120,0)");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
}

function renderStill(){ drawFrame(0,currentCfg||defaultCfg); }

$("imageInput").addEventListener("change",(e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  const url=URL.createObjectURL(f);
  img.onload=()=>{
    imgReady=true; URL.revokeObjectURL(url);
    $("previewBtn").disabled=false; $("exportBtn").disabled=false;
    currentCfg=parsePrompt($("prompt").value);
    $("duration").value=currentCfg.duration;
    renderStill();
    $("status").textContent="Imagine încărcată. Poți aplica instrucțiunea.";
    $("status").className="status ok";
  };
  img.src=url;
});

$("applyBtn").addEventListener("click",()=>{
  currentCfg=parsePrompt($("prompt").value);
  currentCfg.duration=clamp(parseInt($("duration").value||currentCfg.duration),3,20);
  currentCfg.fps=parseInt($("fps").value);
  showCfg(currentCfg);
  renderStill();
  $("status").textContent="Instrucțiunea a fost interpretată.";
  $("status").className="status ok";
});

function showCfg(c){
  const chips=[];
  chips.push(`Durată: ${c.duration}s`);
  chips.push(`Zoom: ${c.zoomEnd>c.zoomStart ? "lent" : "fix"}`);
  chips.push(`Mișcare sus: ${c.rise>0 ? "da" : "nu"}`);
  chips.push(`Nori: ${c.clouds ? "da" : "nu"}`);
  chips.push(`Apă: ${c.water ? "da" : "nu"}`);
  chips.push(`Subiect: ${c.keepSubject ? "fix" : "liber"}`);
  chips.push(`Text: ${c.keepText ? "fix" : "liber"}`);
  $("parsed").innerHTML=chips.map(x=>`<span class="chip">${x}</span>`).join("");
}

function runPreview(){
  if(!imgReady || running) return;
  currentCfg=currentCfg||parsePrompt($("prompt").value);
  currentCfg.duration=clamp(parseInt($("duration").value||currentCfg.duration),3,20);
  running=true; $("stopBtn").disabled=false; $("previewBtn").disabled=true;
  const start=performance.now();
  const dur=currentCfg.duration*1000;
  const step=(now)=>{
    const p=(now-start)/dur;
    drawFrame(p,currentCfg);
    if(running && p<1) rafId=requestAnimationFrame(step);
    else { running=false; $("stopBtn").disabled=true; $("previewBtn").disabled=false; drawFrame(1,currentCfg); }
  };
  rafId=requestAnimationFrame(step);
}

$("previewBtn").addEventListener("click",runPreview);
$("stopBtn").addEventListener("click",()=>{
  running=false; if(rafId) cancelAnimationFrame(rafId);
  $("stopBtn").disabled=true; $("previewBtn").disabled=false;
});

async function exportVideo(){
  if(!imgReady) return;
  currentCfg=currentCfg||parsePrompt($("prompt").value);
  currentCfg.duration=clamp(parseInt($("duration").value||currentCfg.duration),3,20);
  currentCfg.fps=parseInt($("fps").value);

  const stream = canvas.captureStream ? canvas.captureStream(currentCfg.fps) : null;
  if(!stream || typeof MediaRecorder === "undefined"){
    $("exportStatus").textContent="Browserul nu poate înregistra canvas-ul. Pe iPhone poți folosi Screen Recording sau deschide proiectul într-un browser desktop.";
    $("exportStatus").className="status warn";
    return;
  }

  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  let mime="";
  for(const m of candidates){
    try{ if(MediaRecorder.isTypeSupported(m)){ mime=m; break; } }catch(e){}
  }

  let recorder;
  try{
    recorder = mime ? new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000}) : new MediaRecorder(stream);
  }catch(err){
    $("exportStatus").textContent="Nu pot porni exportul video în acest browser: "+err.message;
    $("exportStatus").className="status warn";
    return;
  }

  const chunks=[];
  recorder.ondataavailable=e=>{ if(e.data?.size) chunks.push(e.data); };
  recorder.onerror=e=>{
    $("exportStatus").textContent="Eroare la export.";
    $("exportStatus").className="status warn";
  };
  recorder.onstop=()=>{
    const type = recorder.mimeType || mime || "video/webm";
    const blob=new Blob(chunks,{type});
    const ext=type.includes("mp4") ? "mp4" : "webm";
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`cinematic_${Date.now()}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    $("exportStatus").textContent=`Export terminat (${ext.toUpperCase()}).`;
    $("exportStatus").className="status ok";
  };

  recorder.start(250);
  $("exportStatus").textContent="Generez video… ține aplicația deschisă.";
  $("exportStatus").className="status";
  $("exportBtn").disabled=true;

  const start=performance.now(), dur=currentCfg.duration*1000;
  await new Promise(resolve=>{
    const step=(now)=>{
      const p=(now-start)/dur;
      drawFrame(p,currentCfg);
      if(p<1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  await new Promise(r=>setTimeout(r,250));
  recorder.stop();
  $("exportBtn").disabled=false;
}

$("exportBtn").addEventListener("click",exportVideo);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
showCfg(defaultCfg);
