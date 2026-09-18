
const $=id=>document.getElementById(id);
const canvas=$("canvas");
const ctx=canvas.getContext("2d",{alpha:false});
let img=new Image(), imgReady=false, cfg=null, raf=null;

function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

function parsePrompt(text){
  const t=(text||"").toLowerCase();
  const durationMatch=t.match(/(\d{1,2})\s*(sec|secunde|s)\b/);
  const duration=durationMatch?clamp(Number(durationMatch[1]),3,15):Number($("duration").value||10);

  let zoom=0.055;
  if(/fără zoom|no zoom/.test(t)) zoom=0;
  else if(/zoom.*(mai mare|puternic|rapid)/.test(t)) zoom=.10;
  else if(/zoom.*(lent|ușor|subtil|încet)/.test(t)) zoom=.045;

  let rise=0;
  if(/ridic|în sus|upward|rise/.test(t)) rise=.05;
  if(/foarte ușor|foarte lent|subtil/.test(t)) rise=Math.min(rise,.035);

  let pan=0;
  if(/dreapta|right/.test(t)) pan=.025;
  if(/stânga|stanga|left/.test(t)) pan=-.025;

  return {
    duration,
    fps:Number($("fps").value||30),
    zoom,
    rise,
    pan,
    clouds:!/fără nori|nu.*nori|no clouds/.test(t) && /nori|cloud/.test(t),
    water:!/fără apă|nu.*ap[aă]|no water/.test(t) && /apă|apa|water|râu|rau|river|reflex/.test(t),
    glow:!/fără lumin|no glow/.test(t),
    subjectStill:/băiatul.*(nu|nemișcat|nemiscat|fix)|subject.*still|frozen/.test(t),
    textFixed:/text|scris|citat/.test(t) && /(fix|rămân|raman|permanent|final|nu.*modific)/.test(t)
  }
}

function showCfg(c){
  const items=[
    `${c.duration}s`,
    `${c.fps} FPS`,
    c.zoom?`zoom ${Math.round(c.zoom*100)}%`:"fără zoom",
    c.rise?"camera ↑":"camera fixă",
    c.pan>0?"pan →":c.pan<0?"pan ←":"fără pan",
    c.clouds?"nori ✓":"nori –",
    c.water?"apă ✓":"apă –"
  ];
  $("chips").innerHTML=items.map(x=>`<span class="chip">${x}</span>`).join("");
}

function fitCover(sw,sh,dw,dh,scale=1){
  const z=Math.max(dw/sw,dh/sh)*scale;
  return {w:sw*z,h:sh*z}
}

function wrapText(text,maxChars=30){
  const words=text.trim().split(/\s+/).filter(Boolean);
  const lines=[];let line="";
  for(const w of words){
    const test=line?line+" "+w:w;
    if(test.length>maxChars && line){lines.push(line);line=w}else line=test;
  }
  if(line)lines.push(line);
  return lines;
}

function drawQuote(){
  const q=$("quote").value.trim(); if(!q)return;
  const W=canvas.width,H=canvas.height;
  const size=Number($("quoteSize").value);
  const cy=H*Number($("quoteY").value);
  const lines=wrapText(q,30);
  const lh=size*1.25,start=cy-(lines.length-1)*lh/2;
  ctx.save();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`600 ${size}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle="#fff";
  ctx.shadowColor="rgba(0,0,0,.8)";ctx.shadowBlur=9;ctx.shadowOffsetY=2;
  lines.forEach((line,i)=>ctx.fillText(line,W/2,start+i*lh,W*.86));
  ctx.restore();
}

function drawCloudEffect(p){
  const W=canvas.width,H=canvas.height;
  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.globalAlpha=.032;
  const drift=Math.sin(p*Math.PI*2)*12;
  ctx.translate(drift,0);
  const g=ctx.createLinearGradient(0,0,W,0);
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(.45,"rgba(255,255,255,.75)");
  g.addColorStop(.55,"rgba(255,255,255,.5)");
  g.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=g;
  ctx.fillRect(-40,H*.05,W+80,H*.27);
  ctx.restore();
}

function drawWaterEffect(p){
  const W=canvas.width,H=canvas.height;
  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.globalAlpha=.03;
  for(let i=0;i<14;i++){
    const y=H*.60+i*20;
    const w=W*(.16+.36*Math.abs(Math.sin(i*1.37+p*4.5)));
    const x=(W-w)/2+Math.sin(i*2+p*7)*7;
    ctx.fillStyle="rgba(255,215,160,.75)";
    ctx.fillRect(x,y,w,1.2);
  }
  ctx.restore();
}

function drawGlow(p){
  const W=canvas.width,H=canvas.height;
  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.globalAlpha=.035+.02*Math.sin(p*Math.PI);
  const g=ctx.createRadialGradient(W*.52,H*.32,0,W*.52,H*.32,W*.5);
  g.addColorStop(0,"rgba(255,182,115,.9)");
  g.addColorStop(1,"rgba(255,182,115,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.restore();
}

function drawFrame(progress){
  if(!imgReady)return;
  cfg=cfg||parsePrompt($("prompt").value);
  const p=ease(clamp(progress,0,1));
  const W=canvas.width,H=canvas.height;
  ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);

  const zoom=1.03+cfg.zoom*p;
  const size=fitCover(img.naturalWidth,img.naturalHeight,W,H,zoom);
  const x=(W-size.w)/2 + W*cfg.pan*p;
  const y=(H-size.h)/2 - H*cfg.rise*p;
  ctx.drawImage(img,x,y,size.w,size.h);

  if(cfg.clouds)drawCloudEffect(p);
  if(cfg.water)drawWaterEffect(p);
  if(cfg.glow)drawGlow(p);
  drawQuote();
}

$("imageInput").addEventListener("change",e=>{
  const f=e.target.files?.[0];if(!f)return;
  const url=URL.createObjectURL(f);
  img.onload=()=>{
    imgReady=true;URL.revokeObjectURL(url);
    cfg=parsePrompt($("prompt").value);
    $("duration").value=String(cfg.duration);
    showCfg(cfg);
    drawFrame(0);
    $("previewBtn").disabled=false;
    $("exportBtn").disabled=false;
    $("status").textContent="Imagine încărcată. Poți face preview.";
    $("status").className="status good";
  };
  img.src=url;
});

$("interpretBtn").addEventListener("click",()=>{
  cfg=parsePrompt($("prompt").value);
  $("duration").value=String(cfg.duration);
  showCfg(cfg); if(imgReady)drawFrame(0);
  $("status").textContent="Robotul a interpretat instrucțiunea.";
  $("status").className="status good";
});

$("fps").addEventListener("change",()=>{cfg=parsePrompt($("prompt").value);showCfg(cfg)});
$("duration").addEventListener("change",()=>{cfg=parsePrompt($("prompt").value);cfg.duration=Number($("duration").value);showCfg(cfg)});

function preview(){
  if(!imgReady)return;
  cfg=parsePrompt($("prompt").value);
  cfg.duration=Number($("duration").value);
  cancelAnimationFrame(raf);
  const start=performance.now(),dur=cfg.duration*1000;
  const step=now=>{
    const p=(now-start)/dur;
    drawFrame(p);
    if(p<1)raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);
}
$("previewBtn").addEventListener("click",preview);

async function exportVideo(){
  if(!imgReady)return;
  cfg=parsePrompt($("prompt").value);
  cfg.duration=Number($("duration").value);
  cfg.fps=Number($("fps").value);

  if(!canvas.captureStream || typeof MediaRecorder==="undefined"){
    $("status").textContent="Safari-ul tău nu permite export direct din canvas. Folosește Screen Recording pe iPhone pentru această versiune.";
    $("status").className="status warn";
    return;
  }

  const stream=canvas.captureStream(cfg.fps);
  const candidates=[
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  let mime="";
  for(const m of candidates){
    try{if(MediaRecorder.isTypeSupported(m)){mime=m;break}}catch{}
  }

  let recorder;
  try{
    recorder=mime?new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9000000}):new MediaRecorder(stream);
  }catch(e){
    $("status").textContent="Browserul nu poate porni exportul video. Folosește Screen Recording sau un browser desktop.";
    $("status").className="status warn";
    return;
  }

  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>{
    $("status").textContent="A apărut o eroare la export.";
    $("status").className="status warn";
  };
  recorder.onstop=()=>{
    const type=recorder.mimeType||mime||"video/webm";
    const ext=type.includes("mp4")?"mp4":"webm";
    const blob=new Blob(chunks,{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`cinematic_${cfg.fps}fps_${Date.now()}.${ext}`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    $("status").textContent=`Export terminat: ${ext.toUpperCase()} • ${cfg.fps} FPS`;
    $("status").className="status good";
  };

  $("status").textContent=`Export ${cfg.fps} FPS… ține pagina deschisă.`;
  $("status").className="status";
  $("exportBtn").disabled=true;
  recorder.start(250);

  const start=performance.now(),dur=cfg.duration*1000;
  await new Promise(resolve=>{
    const step=now=>{
      const p=(now-start)/dur;
      drawFrame(p);
      if(p<1)requestAnimationFrame(step);else resolve();
    };
    requestAnimationFrame(step);
  });

  await new Promise(r=>setTimeout(r,250));
  recorder.stop();
  $("exportBtn").disabled=false;
}
$("exportBtn").addEventListener("click",exportVideo);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}
