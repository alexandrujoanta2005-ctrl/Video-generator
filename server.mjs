import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { fal } from "@fal-ai/client";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

dotenv.config();
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
const PORT=Number(process.env.PORT||3000);
const outputDir=path.join(__dirname,"outputs");
fs.mkdirSync(outputDir,{recursive:true});

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use("/outputs",express.static(outputDir,{maxAge:"1h"}));
app.use(express.static(path.join(__dirname,"public")));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}});

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dataUri=f=>`data:${f.mimetype};base64,${f.buffer.toString("base64")}`;

function parseRobot(text=""){
  const t=text.toLowerCase();
  const dm=t.match(/(\d{1,2})\s*(sec|secunde|s)\b/);
  const duration=dm?clamp(Number(dm[1]),3,15):8;
  let camera="slow cinematic push-in";
  if(/ridic|în sus|upward|rise/.test(t)) camera="very slow upward camera rise";
  if(/dreapta|right/.test(t)) camera+=", subtle rightward drift";
  if(/stânga|stanga|left/.test(t)) camera+=", subtle leftward drift";
  if(/orbit|în jur|in jur/.test(t)) camera="very slow subtle camera orbit";
  if(/fără zoom|fara zoom|no zoom/.test(t)) camera+=", no zoom";
  else if(/zoom/.test(t)) camera+=", very gentle slow zoom";
  const clouds=/nori|cloud/.test(t);
  const water=/apă|apa|râu|rau|river|water|reflex/.test(t);
  const lights=/lumini|lights|oraș|oras|city/.test(t);
  const subjectStill=/băiatul.*(nu|nemișcat|nemiscat|fix)|subject.*still|frozen/.test(t);
  const motion=[];
  if(clouds) motion.push("clouds drift slowly and naturally");
  if(water) motion.push("water and reflections move subtly and realistically");
  if(lights) motion.push("distant city lights shimmer very softly");
  if(!motion.length) motion.push("only subtle environmental motion");
  const safeguards=[];
  if(subjectStill) safeguards.push("the main person remains completely still with unchanged pose and identity");
  safeguards.push("preserve composition, avoid warping, morphing, face changes, extra limbs, flicker and unstable geometry");
  return {duration,camera,motion:motion.join(", "),safeguards:safeguards.join(", ")};
}
function buildPrompt(userPrompt,p){
  return [userPrompt.trim(),`Camera: ${p.camera}.`,`Environment: ${p.motion}.`,`Preservation: ${p.safeguards}.`,`Cinematic, photorealistic, smooth continuous motion, stable subject, natural lighting, no sudden cuts.`].filter(Boolean).join(" ");
}
async function download(url,ext="mp4"){
  const r=await fetch(url); if(!r.ok) throw new Error(`Nu am putut descărca rezultatul AI (${r.status}).`);
  const buf=Buffer.from(await r.arrayBuffer());
  const name=`${Date.now()}_${crypto.randomBytes(5).toString("hex")}.${ext}`;
  const p=path.join(outputDir,name); fs.writeFileSync(p,buf); return p;
}
function transcodeFPS(inputPath,fps){
  return new Promise((resolve,reject)=>{
    if(!ffmpegPath) return reject(new Error("FFmpeg nu este disponibil pe server."));
    const out=path.join(outputDir,`${Date.now()}_${crypto.randomBytes(5).toString("hex")}_${fps}fps.mp4`);
    // 60 fps uses motion interpolation. 30 fps uses ordinary resampling.
    const vf=fps>=50 ? `minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` : `fps=${fps}`;
    const args=['-y','-i',inputPath,'-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a','192k',out];
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err=''; p.stderr.on('data',d=>err+=d.toString().slice(-4000));
    p.on('error',reject);
    p.on('close',code=>code===0?resolve(out):reject(new Error(`FFmpeg a eșuat (${code}). ${err.slice(-500)}`)));
  });
}

app.get('/api/health',(req,res)=>res.json({ok:true,aiConfigured:Boolean(process.env.FAL_KEY),ffmpeg:Boolean(ffmpegPath),version:'4.0.0'}));
app.post('/api/robot/parse',(req,res)=>{const prompt=String(req.body?.prompt||'');const parsed=parseRobot(prompt);res.json({parsed,aiPrompt:buildPrompt(prompt,parsed)});});

app.post('/api/ai-video',upload.single('image'),async(req,res)=>{
  try{
    if(!process.env.FAL_KEY) return res.status(400).json({error:'Lipsește FAL_KEY. Safe Motion merge fără cheie, dar AI Motion are nevoie de cheia fal.ai pe server.'});
    if(!req.file) return res.status(400).json({error:'Alege o imagine.'});
    fal.config({credentials:process.env.FAL_KEY});
    const userPrompt=String(req.body.prompt||'');
    const model=String(req.body.model||'kling');
    const targetFps=[24,30,60].includes(Number(req.body.fps))?Number(req.body.fps):60;
    const parsed=parseRobot(userPrompt);
    const durationRequested=Number(req.body.duration||parsed.duration);
    const prompt=buildPrompt(userPrompt,parsed);
    const image=dataUri(req.file);
    let endpoint,input;
    if(model==='pika'){
      endpoint='fal-ai/pika/v2.2/image-to-video';
      input={image_url:image,prompt,duration:durationRequested>=8?'10':'5',resolution:String(req.body.resolution||'720p'),negative_prompt:'warping, morphing, text corruption, extra limbs, unstable face, flicker, blur, low quality'};
    } else {
      endpoint='fal-ai/kling-video/v3/standard/image-to-video';
      input={start_image_url:image,prompt,duration:String(clamp(Math.round(durationRequested),3,15)),generate_audio:req.body.generateAudio==='true',negative_prompt:'warping, morphing, text corruption, extra limbs, unstable face, flicker, blur, low quality',cfg_scale:0.5};
    }
    const result=await fal.subscribe(endpoint,{input,logs:true});
    const remote=result?.data?.video?.url; if(!remote) throw new Error('Modelul nu a returnat un URL video.');
    const raw=await download(remote,'mp4');
    let final=raw;
    if(targetFps===60){
      try{ final=await transcodeFPS(raw,60); }catch(e){ console.warn('60fps fallback:',e.message); final=raw; }
    }
    const localUrl=`/outputs/${path.basename(final)}`;
    res.json({ok:true,videoUrl:localUrl,remoteUrl:remote,model,targetFps,parsed,prompt});
  }catch(err){console.error(err);res.status(500).json({error:err?.message||'Eroare la generarea video.'});}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Cinematic AI Studio v4: http://localhost:${PORT}`));
