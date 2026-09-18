
import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { fal } from "@fal-ai/client";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const outputDir = path.join(__dirname, "outputs");
fs.mkdirSync(outputDir, { recursive: true });

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/outputs", express.static(outputDir, {
  maxAge: "1h",
  setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=3600")
}));
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function dataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseRobot(text = "") {
  const t = text.toLowerCase();
  const durationMatch = t.match(/(\d{1,2})\s*(sec|secunde|s)\b/);
  const duration = durationMatch ? clamp(Number(durationMatch[1]), 3, 15) : 8;

  let camera = "slow cinematic push-in";
  if (/ridic|în sus|upward|rise/.test(t)) camera = "very slow upward camera rise";
  if (/spre dreapta|right/.test(t)) camera += ", subtle rightward drift";
  if (/spre stânga|left/.test(t)) camera += ", subtle leftward drift";
  if (/orbit|în jur|se învârt/.test(t)) camera = "very slow subtle camera orbit";
  if (/fără zoom|no zoom/.test(t)) camera += ", no zoom";
  else if (/zoom/.test(t)) camera += ", very gentle slow zoom";

  const clouds = /nori|cloud/.test(t);
  const water = /apă|apa|râu|rau|river|water|reflex/.test(t);
  const lights = /lumini|lights|oraș|oras|city/.test(t);
  const subjectStill = /băiatul.*(nu|nemișcat|fix)|subject.*still|frozen/.test(t);
  const textFixed = /text|scris|citat/.test(t) && /(fix|rămân|raman|permanent|final|nu.*modific)/.test(t);

  let motion = [];
  if (clouds) motion.push("clouds drift slowly and naturally");
  if (water) motion.push("water and reflections move subtly");
  if (lights) motion.push("distant city lights shimmer very softly");
  if (!motion.length) motion.push("only subtle environmental motion");

  let safeguards = [];
  if (subjectStill) safeguards.push("the main person remains completely still with unchanged pose and identity");
  if (textFixed) safeguards.push("do not alter any visible text in the source image");
  safeguards.push("avoid warping, morphing, face changes, extra limbs, flicker, unstable geometry");

  return {
    duration,
    camera,
    motion: motion.join(", "),
    safeguards: safeguards.join(", ")
  };
}

function buildPrompt(userPrompt, parsed) {
  return [
    userPrompt.trim(),
    `Camera: ${parsed.camera}.`,
    `Environment: ${parsed.motion}.`,
    `Preservation: ${parsed.safeguards}.`,
    "Cinematic, realistic, smooth continuous motion, stable composition, natural lighting, no sudden cuts."
  ].filter(Boolean).join(" ");
}

async function downloadToLocal(url, ext = "mp4") {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Nu am putut descărca rezultatul AI (${resp.status}).`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const name = `${Date.now()}_${crypto.randomBytes(5).toString("hex")}.${ext}`;
  const filePath = path.join(outputDir, name);
  fs.writeFileSync(filePath, buf);
  return `/outputs/${name}`;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.FAL_KEY),
    version: "3.0.0"
  });
});

app.post("/api/robot/parse", (req, res) => {
  const prompt = String(req.body?.prompt || "");
  const parsed = parseRobot(prompt);
  res.json({ parsed, aiPrompt: buildPrompt(prompt, parsed) });
});

app.post("/api/ai-video", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.FAL_KEY) {
      return res.status(400).json({
        error: "Lipsește FAL_KEY. Safe Motion funcționează fără cheie, dar AI Motion are nevoie de cheia fal.ai pe server."
      });
    }
    if (!req.file) return res.status(400).json({ error: "Alege o imagine." });

    fal.config({ credentials: process.env.FAL_KEY });

    const userPrompt = String(req.body.prompt || "");
    const model = String(req.body.model || "kling");
    const parsed = parseRobot(userPrompt);
    const durationRequested = Number(req.body.duration || parsed.duration);
    const prompt = buildPrompt(userPrompt, parsed);
    const image = dataUri(req.file);

    let endpoint;
    let input;

    if (model === "pika") {
      endpoint = "fal-ai/pika/v2.2/image-to-video";
      const duration = durationRequested >= 8 ? "10" : "5";
      input = {
        image_url: image,
        prompt,
        duration,
        resolution: String(req.body.resolution || "720p"),
        negative_prompt: "warping, morphing, text corruption, extra limbs, unstable face, flicker, low quality, blur"
      };
    } else {
      endpoint = "fal-ai/kling-video/v3/standard/image-to-video";
      const duration = String(clamp(Math.round(durationRequested), 3, 15));
      input = {
        start_image_url: image,
        prompt,
        duration,
        generate_audio: req.body.generateAudio === "true",
        negative_prompt: "warping, morphing, text corruption, extra limbs, unstable face, flicker, blur, low quality",
        cfg_scale: 0.5
      };
    }

    const result = await fal.subscribe(endpoint, {
      input,
      logs: true
    });

    const remoteUrl = result?.data?.video?.url;
    if (!remoteUrl) throw new Error("Modelul nu a returnat un URL video.");

    const localUrl = await downloadToLocal(remoteUrl, "mp4");

    res.json({
      ok: true,
      videoUrl: localUrl,
      remoteUrl,
      model,
      parsed,
      prompt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Eroare la generarea video." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cinematic AI Studio: http://localhost:${PORT}`);
});
