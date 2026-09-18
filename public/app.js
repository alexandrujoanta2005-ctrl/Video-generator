
const $ = id => document.getElementById(id);
let mode = "safe";
let img = new Image();
let imgFile = null;
let imgReady = false;
let safeCfg = null;
let safeAnim = null;
let currentAIVideoUrl = null;

const canvas = $("canvas");
const ctx = canvas.getContext("2d",{alpha:false});
const video = $("aiVideo");

function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

async function checkHealth(){
  try{
    const r=await fetch("/api/health"); const j=await r.json();
    $("aiBadge").textContent=j.aiConfigured?"AI configurat":"AI fără cheie";
    $("aiBadge").className="badge "+(j.aiConfigured?"ok":"warn");
  }catch{
    $("aiBadge").textContent="Server indisponibil"; $("aiBadge").className="badge warn";
  }
}
checkHealth();

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); mode=b.dataset.mode;
  $("model").disabled=mode!=="ai";
  if(mode==="safe"){ video.hidden=true; canvas.hidden=false; if(imgReady) drawSafe(0); }
  else { canvas.hidden=true; video.hidden=false; }
  $("status").textContent = mode==="safe" ? "Safe Motion păstrează pixelii imaginii; ideal pentru text deja pe poză." : "AI Motion generează mișcare nouă. Pentru text perfect, folosește Citat separat.";
}));

$("imageInput").addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(!f)return;
  imgFile=f;
  const url=URL.createObjectURL(f);
  img.onload=()=>{
    imgReady=true; URL.revokeObjectURL(url); drawSafe(0);
    $("previewBtn").disabled=false; $("generateBtn").disabled=false;
    $("status").textContent="Imagine încărcată.";
    $("status").className="status ok";
  };
  img.src=url;
});

async function interpret(){
  const r=await fetch("/api/robot/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:$("prompt").value})});
  const j=await r.json();
  safeCfg=j.parsed;
  showChips(j.parsed);
  $("status").textContent="Robotul a interpretat instrucțiunea.";
  $("status").className="status ok";
  return j;
}
$("interpretBtn").addEventListener("click",interpret);

function showChips(p){
  const arr=[
    `Durată ${p.duration}s`,
    p.camera,
    p.motion,
    p.safeguards.includes("person")?"subiect fix":"subiect liber"
  ];
  $("chips").innerHTML=arr.map(x=>`<span class="chip">${x}</span>`).join("");
}

function fit(sw,sh,dw,dh,scale=1){
  const z=Math.max(dw/sw,dh/sh)*scale; return {w:sw*z,h:sh*z};
}
function quoteLines(text,max=32){
  const words=(text||"").trim().split(/\s+/).filter(Boolean);
  const lines=[]; let line="";
  for(const w of words){
    const test=line?line+" "+w:w;
    if(test.length>max && line){lines.push(line);line=w}else line=test;
  }
  if(line)lines.push(line); return lines;
}
function overlayQuote(){
  const quote=$("quote").value.trim(); if(!quote)return;
  const W=canvas.width,H=canvas.height;
  const size=Number($("quoteSize").value);
  const cy=H*Number($("quoteY").value);
  const lines=quoteLines(quote,30);
  ctx.save();
  ctx.font=`600 ${size}px Georgia, serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.shadowColor="rgba(0,0,0,.75)";ctx.shadowBlur=8;ctx.shadowOffsetY=2;
  ctx.fillStyle="#fff";
  const lh=size*1.22; const start=cy-(lines.length-1)*lh/2;
  lines.forEach((l,i)=>ctx.fillText(l,W/2,start+i*lh,W*.84));
  ctx.restore();
}
function drawSafe(progress){
  if(!imgReady)return;
  const p=ease(clamp(progress,0,1));
  const W=canvas.width,H=canvas.height;
  const text=$("prompt").value.toLowerCase();
  const hasUp=/ridic|în sus|upward|rise/.test(text);
  const noZoom=/fără zoom|no zoom/.test(text);
  const z0=1.03, z1=noZoom?1.03:1.075;
  const z=z0+(z1-z0)*p;
  const s=fit(img.naturalWidth,img.naturalHeight,W,H,z);
  const x=(W-s.w)/2;
  const y=(H-s.h)/2-(hasUp?H*.04*p:0);
  ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
  ctx.drawImage(img,x,y,s.w,s.h);

  // ambient light/cloud/water illusions
  if(/nori|cloud/.test(text)){
    ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.035;
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.5,"rgba(255,255,255,.65)");g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.translate(Math.sin(p*6.28)*8,0);ctx.fillStyle=g;ctx.fillRect(-30,H*.05,W+60,H*.27);ctx.restore();
  }
  if(/apă|apa|water|river|reflex/.test(text)){
    ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.03;
    for(let i=0;i<13;i++){let yy=H*.58+i*22;let ww=W*(.18+.34*Math.abs(Math.sin(i*1.5+p*5)));ctx.fillStyle="rgba(255,210,150,.7)";ctx.fillRect((W-ww)/2+Math.sin(i+p*7)*5,yy,ww,1)}
    ctx.restore();
  }
  overlayQuote();
}

function playSafe(){
  if(!imgReady)return;
  cancelAnimationFrame(safeAnim);
  canvas.hidden=false;video.hidden=true;
  const dur=Number($("duration").value)*1000,start=performance.now();
  const step=now=>{const p=(now-start)/dur;drawSafe(p);if(p<1)safeAnim=requestAnimationFrame(step)}
  safeAnim=requestAnimationFrame(step);
}

$("previewBtn").addEventListener("click",()=>{
  if(mode==="safe") playSafe();
  else if(currentAIVideoUrl){video.play()}
});

$("generateBtn").addEventListener("click",async()=>{
  if(!imgFile){$("status").textContent="Alege mai întâi o imagine.";return}
  await interpret();
  if(mode==="safe"){
    playSafe();
    $("exportBtn").disabled=false;
    $("status").textContent="Safe Motion gata. Apasă Export cu citat.";
    $("status").className="status ok";
    return;
  }

  const fd=new FormData();
  fd.append("image",imgFile);
  fd.append("prompt",$("prompt").value);
  fd.append("duration",$("duration").value);
  fd.append("model",$("model").value);
  fd.append("resolution","720p");
  fd.append("generateAudio",$("audioToggle").checked?"true":"false");

  $("status").textContent="AI generează videoclipul… poate dura câteva minute.";
  $("status").className="status";
  $("generateBtn").disabled=true;
  try{
    const r=await fetch("/api/ai-video",{method:"POST",body:fd});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||"Eroare AI");
    currentAIVideoUrl=j.videoUrl;
    video.src=currentAIVideoUrl;
    video.hidden=false;canvas.hidden=true;
    await video.load?.();
    $("previewBtn").disabled=false;$("exportBtn").disabled=false;
    $("status").textContent="AI Motion gata.";
    $("status").className="status ok";
  }catch(e){
    $("status").textContent=e.message;
    $("status").className="status warn";
  }finally{$("generateBtn").disabled=false}
});

async function exportComposited(){
  const duration=Number($("duration").value);
  const fps=30;
  canvas.hidden=false;video.hidden=true;
  const stream=canvas.captureStream?.(fps);
  if(!stream || typeof MediaRecorder==="undefined"){
    $("status").textContent="Browserul nu poate exporta canvas-ul direct. Folosește screen recording sau exportă de pe desktop.";
    $("status").className="status warn";return;
  }
  const types=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm"];
  let mime=types.find(x=>MediaRecorder.isTypeSupported?.(x))||"";
  let rec;
  try{rec=mime?new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9000000}):new MediaRecorder(stream)}
  catch(e){$("status").textContent="Exportul nu este suportat în acest browser.";return}
  const chunks=[];rec.ondataavailable=e=>e.data?.size&&chunks.push(e.data);
  rec.onstop=()=>{
    const type=rec.mimeType||mime||"video/webm";const ext=type.includes("mp4")?"mp4":"webm";
    const blob=new Blob(chunks,{type});const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=`cinematic_${Date.now()}.${ext}`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
    $("status").textContent=`Export terminat (${ext.toUpperCase()}).`;$("status").className="status ok";
  };
  rec.start(250);

  if(mode==="safe" || !currentAIVideoUrl){
    const start=performance.now(),dur=duration*1000;
    await new Promise(resolve=>{
      const step=now=>{const p=(now-start)/dur;drawSafe(p);if(p<1)requestAnimationFrame(step);else resolve()}
      requestAnimationFrame(step);
    });
  }else{
    video.currentTime=0;await video.play();
    const start=performance.now();
    await new Promise(resolve=>{
      const step=()=>{
        if(video.ended || video.currentTime>=Math.min(duration,video.duration||duration)){resolve();return}
        const W=canvas.width,H=canvas.height;
        ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
        // cover draw
        const vw=video.videoWidth||W,vh=video.videoHeight||H,s=fit(vw,vh,W,H,1);
        ctx.drawImage(video,(W-s.w)/2,(H-s.h)/2,s.w,s.h);
        overlayQuote();
        requestAnimationFrame(step);
      }; requestAnimationFrame(step);
    });
    video.pause();
  }
  await new Promise(r=>setTimeout(r,200));rec.stop();
}

$("exportBtn").addEventListener("click",exportComposited);

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
