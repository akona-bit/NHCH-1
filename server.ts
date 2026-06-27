import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for AI Matrix Generation with HIGH thinking level
  app.post("/api/generate-matrix", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const { prompt, knowledgeNodes } = req.body;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const contents = `You are an expert exam matrix generator. Based on the following knowledge nodes, generate an exam matrix indicating the number of questions for each cognitive level (nb: Nhận biết, th: Thông hiểu, vd: Vận dụng, vdc: Vận dụng cao) for each node.

Knowledge Nodes:
${JSON.stringify(knowledgeNodes, null, 2)}

User Request:
${prompt || 'Distribute 40 questions evenly across the provided nodes, weighting more towards NB and TH.'}

Return your answer purely as a JSON object where the keys are the node IDs (ma_kien_thuc) and values are objects like {"nb": 2, "th": 1, "vd": 0, "vdc": 0}. Do not include markdown formatting like \`\`\`json. Only output JSON.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (genError: any) {
        console.log("Generation failed with gemini-2.5-flash, trying fallback to gemini-2.0-flash. Error:", genError.message);
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config: {
              responseMimeType: "application/json"
            }
          });
        } catch (flashError: any) {
          throw flashError;
        }
      }

      let jsonStr = response.text || "{}";
      // Ensure we clean any possible markdown if model includes it despite instructions
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      const matrixData = JSON.parse(jsonStr);
      
      res.json({ result: matrixData });

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate matrix" });
    }
  });

  // API route for AI Question Generation with HIGH thinking level
  app.post("/api/generate-question", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const { prompt, stimulus, contextNodes } = req.body;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const contents = `You are an expert educational content creator. Generate a high-quality multiple-choice question based on the following context.
  
  Stimulus (Ngữ liệu):
  ${stimulus || "None"}
  
  Knowledge Focus:
  ${JSON.stringify(contextNodes, null, 2)}
  
  User Request:
  ${prompt || 'Create a challenging question that requires critical thinking.'}

  CRITICAL INSTRUCTION:
  You MUST strictly generate a question that assesses the exact concepts described in the "Knowledge Focus" provided above. The content, context, and options of the question must be tightly coupled to these knowledge nodes.
  
  Return your answer purely as a JSON object with the following structure:
  {
    "content": "The question text, use markdown/LaTeX if needed",
    "cognitiveLevel": 2, // 1: Nhận biết, 2: Thông hiểu, 3: Vận dụng, 4: Vận dụng cao
    "answers": [
      { "content": "Option A text", "isCorrect": true },
      { "content": "Option B text", "isCorrect": false },
      { "content": "Option C text", "isCorrect": false },
      { "content": "Option D text", "isCorrect": false }
    ]
  }
  Do not include markdown formatting like \`\`\`json. Only output JSON.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (genError: any) {
        console.log("Generation failed with gemini-2.5-flash, trying fallback to gemini-2.0-flash. Error:", genError.message);
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config: {
              responseMimeType: "application/json"
            }
          });
        } catch (flashError: any) {
          throw flashError;
        }
      }

      let jsonStr = response.text || "{}";
      // Ensure we clean any possible markdown if model includes it despite instructions
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      const questionData = JSON.parse(jsonStr);
      
      res.json({ result: questionData });

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate question" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
