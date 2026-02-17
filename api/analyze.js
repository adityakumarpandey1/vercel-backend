// // app.use(express.json({ limit: "2mb" }));
// // require("dotenv").config();
// // const express = require("express");
// // const cors = require("cors");
// // const multer = require("multer");
// // const pdf = require("pdf-parse");
// // const mammoth = require("mammoth");
// // const fs = require("fs");
// // const OpenAI = require("openai");
// // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// require("dotenv").config();

// const express = require("express");
// const cors = require("cors");
// const multer = require("multer");
// const pdf = require("pdf-parse");
// const mammoth = require("mammoth");
// const fs = require("fs");
// const OpenAI = require("openai");

// /* =========================
//    APP INITIALIZATION
// ========================= */

// const app = express();

// /* =========================
//    MIDDLEWARE (ORDER MATTERS)
// ========================= */

// app.use(cors());
// app.use(express.json({ limit: "2mb" })); // ✅ AFTER app is created

// /* =========================
//    OPENAI
// ========================= */

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// console.log("OPENAI KEY LOADED:", !!process.env.OPENAI_API_KEY);

// /* =========================
//    FILE UPLOAD CONFIG
// ========================= */

// const upload = multer({
//   dest: "uploads/",
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype === "application/pdf" ||
//       file.mimetype.includes("word")
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only PDF or DOCX files allowed"));
//     }
//   }
// });

// /* =========================
//    ATS SCORING ENGINE
// ========================= */

// function scoreResume(text) {
//   const lower = text.toLowerCase();

//   let score = 0;
//   const matched = [];
//   const missing = [];
//   const flags = {};

//   /* ---------- KEYWORDS (35) ---------- */

//   const keywordWeights = {
//     javascript: 6,
//     node: 6,
//     express: 5,
//     react: 6,
//     mongodb: 5,
//     sql: 5,
//     "rest api": 5,
//     aws: 5,
//     docker: 4,
//     git: 3
//   };

//   let keywordScore = 0;

//   for (const key in keywordWeights) {
//     if (lower.includes(key)) {
//       keywordScore += keywordWeights[key];
//       matched.push(key);
//     } else {
//       missing.push(key);
//     }
//   }

//   flags.lowKeywords = keywordScore < 15;
//   score += Math.min(keywordScore, 35);

//   /* ---------- SECTIONS (20) ---------- */

//   const sections = [
//     { name: "experience", weight: 6 },
//     { name: "skills", weight: 6 },
//     { name: "projects", weight: 4 },
//     { name: "education", weight: 4 }
//   ];

//   sections.forEach(sec => {
//     if (lower.includes(sec.name)) {
//       score += sec.weight;
//     } else {
//       flags[`missing_${sec.name}`] = true;
//     }
//   });

//   /* ---------- EXPERIENCE QUALITY (15) ---------- */

//   const roles = [
//     "intern",
//     "engineer",
//     "developer",
//     "software",
//     "full stack",
//     "backend",
//     "frontend"
//   ];

//   const roleHits = roles.filter(r => lower.includes(r)).length;

//   if (roleHits >= 4) score += 15;
//   else if (roleHits >= 2) score += 10;
//   else if (roleHits >= 1) score += 5;
//   else flags.weakExperience = true;

//   /* ---------- METRICS (10) ---------- */

//   const metrics = lower.match(/\b\d+(\+|%|x)?\b|\$\d+/g) || [];

//   if (metrics.length >= 5) score += 10;
//   else if (metrics.length >= 2) score += 6;
//   else {
//     score += 2;
//     flags.noMetrics = true;
//   }

//   /* ---------- ACTION VERBS (10) ---------- */

//   const verbs = [
//     "built",
//     "developed",
//     "designed",
//     "implemented",
//     "optimized",
//     "led",
//     "created",
//     "improved",
//     "automated"
//   ];

//   const verbHits = verbs.filter(v => lower.includes(v)).length;

//   if (verbHits >= 5) score += 10;
//   else if (verbHits >= 2) score += 6;
//   else {
//     score += 2;
//     flags.weakVerbs = true;
//   }

//   /* ---------- ATS SAFETY (10) ---------- */

//   const atsRedFlags = ["table", "icon", "graphic", "image", "textbox", "|"];
//   const hasFormattingIssues = atsRedFlags.some(f => lower.includes(f));

//   if (hasFormattingIssues) {
//     score += 4;
//     flags.formattingIssue = true;
//   } else {
//     score += 10;
//   }

//   score = Math.max(0, Math.min(Math.round(score), 100));

//   return { score, matched, missing, flags };
// }

// /* =========================
//    SUGGESTION ENGINE
// ========================= */

// function generateSuggestions(flags, score) {
//   const suggestions = [];

//   if (flags.lowKeywords)
//     suggestions.push("Resume lacks many core technical keywords");

//   if (flags.missing_experience)
//     suggestions.push('Add a clear "Experience" section');

//   if (flags.missing_education)
//     suggestions.push('Add an "Education" section');

//   if (flags.noMetrics)
//     suggestions.push("Quantify achievements using numbers, %, or scale");

//   if (flags.weakVerbs)
//     suggestions.push("Use strong action verbs to start bullet points");

//   if (flags.formattingIssue)
//     suggestions.push("Avoid tables, icons, or complex formatting (ATS issue)");

//   if (flags.weakExperience)
//     suggestions.push("Add clearer role titles and experience descriptions");

//   if (suggestions.length === 0) {
//     if (score >= 80)
//       suggestions.push("Strong ATS-optimized resume");
//     else
//       suggestions.push("Resume is ATS-friendly but can be optimized further");
//   }

//   return suggestions;
// }

// /* =========================
//    ANALYZE RESUME API
// ========================= */

// app.post("/analyze", upload.single("resume"), async (req, res) => {
//   try {
//     let text = "";

//     if (req.file.mimetype === "application/pdf") {
//       const data = await pdf(fs.readFileSync(req.file.path));
//       text = data.text;
//     } else {
//       const result = await mammoth.extractRawText({ path: req.file.path });
//       text = result.value;
//     }

//     fs.unlink(req.file.path, () => {}); // cleanup

//     const analysis = scoreResume(text);
//     const suggestions = generateSuggestions(analysis.flags, analysis.score);

//     res.json({
//       score: analysis.score,
//       matchedKeywords: analysis.matched,
//       missingKeywords: analysis.missing,
//       suggestions,
//       resumeText: text
//     });

//   } catch (err) {
//     res.status(500).json({ error: "Resume analysis failed" });
//   }
// });

// /* =========================
//    JOB DESCRIPTION MATCHING
// ========================= */

// app.post("/match-jd", (req, res) => {
//   const { resumeText = "", jdText = "" } = req.body;

//   if (!resumeText || !jdText) {
//     return res.json({ matchScore: 0 });
//   }

//   const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/));
//   const jdWords = new Set(jdText.toLowerCase().split(/\W+/));

//   let matched = 0;
//   jdWords.forEach(w => {
//     if (w.length > 3 && resumeWords.has(w)) matched++;
//   });

//   const matchScore = Math.min(
//     Math.round((matched / jdWords.size) * 100),
//     100
//   );

//   res.json({ matchScore });
// });

// /* =========================
//    Rewrite
// ========================= */
// app.post("/rewrite", async (req, res) => {
//   try {
//     console.log("REWRITE BODY:", req.body); // 👈 ADD THIS

//     const { resumeText } = req.body;

//     if (!resumeText || resumeText.length < 100) {
//       return res.status(400).json({ error: "Invalid resume text" });
//     }

//     const prompt = `
// Rewrite the resume below to be ATS-optimized.

// Rules:
// - Keep experience truthful
// - Do NOT add fake skills
// - Improve clarity and action verbs
// - Quantify impact where possible
// - Use bullet points
// - Make it recruiter-friendly

// Resume:
// ${resumeText}
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.4
//     });

//     res.json({
//       rewrittenResume: response.choices[0].message.content
//     });

//   } catch (err) {
//   console.error("AI REWRITE ERROR:", err);

//   if (err.code === "insufficient_quota") {
//     return res.status(402).json({
//       error: "OpenAI quota exceeded. Please add billing or try later."
//     });
//   }

//   res.status(500).json({ error: "AI rewrite failed" });
// }
// });

// /* =========================
//    SERVER
// ========================= */

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () =>
//   console.log(`🚀 ATS Backend running on port ${PORT}`)
// );


const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "ATS Backend is running on Vercel 🚀",
  });
});

module.exports = app;