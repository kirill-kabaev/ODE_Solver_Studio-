import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client lazily or when key is present
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Symbolic ODE Solver API Endpoint
app.post("/api/solve-ode", async (req, res) => {
  try {
    const { equation, cauchy, options } = req.body;

    if (!equation || typeof equation !== "string" || equation.trim().length === 0) {
      return res.status(400).json({ error: "Пожалуйста, введите дифференциальное уравнение." });
    }

    const ai = getAI();

    const systemPrompt = `Ты — ведущий мировой профессор высшей математики и компьютерной алгебры, специализирующийся на дифференциальных уравнениях и математической физике.
Твоя задача — провести строгое, исчерпывающее, пошаговое символьное решение заданного обыкновенного дифференциального уравнения (ОДУ) ЛЮБОГО порядка и типа.

Пользователь может ввести уравнение в любом виде, например:
- y' = 2xy
- dy/dx + 2y = e^(-x)
- y'' - 5y' + 6y = 0
- y'' + 4y = sin(2x)
- x^2 * y'' + x * y' - y = 0
- y' = (x + y)/(x - y)
- y' + y/x = y^2 * ln(x)
- (2xy + 3)dx + (x^2 - 1)dy = 0
- y''' - y'' = x
- Cauchy условия: y(x0) = y0, y'(x0) = yp0

Строго следуй схеме JSON:
{
  "dimensionMode": "2D" или "3D",
  "equationNormalizedLatex": "Канонический вид уравнения в LaTeX",
  "equationType": "Тип ДУ (например: 3D Уравнение теплопроводности Фурье / Линейное ОДУ 2-го порядка)",
  "order": 1 или 2 или 3,
  "methodUsed": "Название метода (например: Метод Фурье / Метод характеристического уравнения)",
  "independentVar": "x" или "(x, y, z, t)",
  "dependentVar": "y" или "T" или "u" или "Phi",
  "generalSolutionLatex": "Общее решение в LaTeX формате",
  "generalSolutionPlain": "Общее решение в читаемом виде для копирования",
  "particularSolutionLatex": "Частное решение задачи Коши y(x) = ... (если были заданы начальные условия, иначе пустая строка или опустить)",
  "particularSolutionPlain": "Частное решение y(x) в виде простого текста (если Коши)",
  "constantsValues": { "C1": "1", "C2": "2" },
  "steps": [
    {
      "stepNumber": 1,
      "title": "Краткий емкий заголовок шага (например: Составление характеристического уравнения)",
      "explanation": "Подробное понятное математическое объяснение на русском языке",
      "latex": "k^2 - 5k + 6 = 0 \\implies (k-2)(k-3)=0",
      "details": "Дополнительные пояснения при необходимости",
      "badge": "Характеристическое уравнение"
    }
  ],
  "verification": {
    "isVerified": true,
    "explanation": "Подстановка общего решения в исходное дифференциальное уравнение для проверки тождества",
    "lhsLatex": "L[y] = (y)'' - 5(y)' + 6(y)",
    "rhsLatex": "0",
    "resultLatex": "0 \\equiv 0 \\quad (Тождество верно)"
  },
  "plotConfig": {
    "derivativeJs": "return 5*y - 6*x;",
    "solutionCurveJs": "return c * Math.exp(2*x) + Math.exp(3*x);",
    "particularCurveJs": "return 1 * Math.exp(2*x) + 2 * Math.exp(3*x);",
    "xDomain": [-5, 5],
    "yDomain": [-5, 5],
    "singularities": ["x = 0"]
  },
  "field3DConfig": {
    "scalarFieldJs": "return Math.exp(-0.2*t) * Math.sin(x) * Math.cos(y) * Math.cos(z);",
    "colorMap": "inferno",
    "xDomain": [-5, 5],
    "yDomain": [-5, 5],
    "zDomain": [-5, 5],
    "sliceZ": 0,
    "unitLabel": "Поле u(x,y,z)"
  },
  "notes": ["Полезные математические замечания, особые точки, область определения"]
}

ВАЖНО:
- В шагах (steps) сделай минимум 3-7 детальных логических шагов, чтобы решение было наглядно видно построчно от начала до конца.
- Если уравнение 3D (содержит частные производные ∂, ∇², координаты x,y,z,t или 3D системы Лоренца), обязательно укажи "dimensionMode": "3D" и заполни "field3DConfig".
- В конце обязательно сформулируй ясную аналитическую формулу.
- Формулы LaTeX должны быть валидными (используй правильное экранирование обратных слэшей в JSON).
- Убедись, что производная и решение математически абсолютно точны.`;

    const userPrompt = `Реши следующее дифференциальное уравнение символьно и пошагово:
Уравнение: "${equation}"
${cauchy?.x0 !== undefined && cauchy?.x0 !== "" ? `Начальные условия (Задача Коши): y(${cauchy.x0}) = ${cauchy.y0}${cauchy.yp0 !== undefined && cauchy.yp0 !== "" ? `, y'(${cauchy.x0}) = ${cauchy.yp0}` : ""}${cauchy.z0 !== undefined && cauchy.z0 !== "" ? `, z(${cauchy.x0}) = ${cauchy.z0}` : ""}` : "Без начальных условий (найти общее решение)"}
Пользовательские опции: ${JSON.stringify(options || {})}`;

    // Fast, modern and responsive Gemini models in optimal order
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
    let responseText: string | null = null;
    let lastError: any = null;

    const MAX_ROUNDS = 2; // Keep attempts crisp so it doesn't hang indefinitely
    for (let round = 0; round < MAX_ROUNDS && !responseText; round++) {
      for (const modelName of candidateModels) {
        try {
          const result = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  dimensionMode: { type: Type.STRING },
                  equationNormalizedLatex: { type: Type.STRING },
                  equationType: { type: Type.STRING },
                  order: { type: Type.INTEGER },
                  methodUsed: { type: Type.STRING },
                  independentVar: { type: Type.STRING },
                  dependentVar: { type: Type.STRING },
                  generalSolutionLatex: { type: Type.STRING },
                  generalSolutionPlain: { type: Type.STRING },
                  particularSolutionLatex: { type: Type.STRING },
                  particularSolutionPlain: { type: Type.STRING },
                  constantsValues: {
                    type: Type.OBJECT,
                    properties: {
                      C1: { type: Type.STRING },
                      C2: { type: Type.STRING },
                      C3: { type: Type.STRING },
                    },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        latex: { type: Type.STRING },
                        details: { type: Type.STRING },
                        badge: { type: Type.STRING },
                      },
                      required: ["stepNumber", "title", "explanation", "latex"],
                    },
                  },
                  verification: {
                    type: Type.OBJECT,
                    properties: {
                      isVerified: { type: Type.BOOLEAN },
                      explanation: { type: Type.STRING },
                      lhsLatex: { type: Type.STRING },
                      rhsLatex: { type: Type.STRING },
                      resultLatex: { type: Type.STRING },
                    },
                  },
                  plotConfig: {
                    type: Type.OBJECT,
                    properties: {
                      derivativeJs: { type: Type.STRING },
                      solutionCurveJs: { type: Type.STRING },
                      particularCurveJs: { type: Type.STRING },
                      xDomain: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                      },
                      yDomain: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                      },
                      singularities: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                  },
                  field3DConfig: {
                    type: Type.OBJECT,
                    properties: {
                      scalarFieldJs: { type: Type.STRING },
                      colorMap: { type: Type.STRING },
                      sliceZ: { type: Type.NUMBER },
                      unitLabel: { type: Type.STRING },
                      fieldType: { type: Type.STRING },
                      timeDefault: { type: Type.NUMBER },
                    },
                  },
                  notes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  "equationNormalizedLatex",
                  "equationType",
                  "order",
                  "methodUsed",
                  "generalSolutionLatex",
                  "steps",
                ],
              },
            },
          });

          if (result.text) {
            responseText = result.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Round ${round + 1}] Model ${modelName} status:`, err?.message || err);
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Не удалось получить ответ от моделей Gemini. Попробуйте еще раз или переключитесь на CPU/GPU.");
    }

    const parsed = JSON.parse(responseText);
    parsed.equationInput = equation;

    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("ODE Solver Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Ошибка при символьном решении дифференциального уравнения.",
    });
  }
});

// Vite / static file middleware
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production bundled dist/server.cjs, __dirname is already the dist folder
    // Or if run directly from workspace root, use process.cwd()/dist
    const distPath = fs.existsSync(path.join(__dirname, "index.html"))
      ? __dirname
      : path.join(process.cwd(), "dist");

    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Error: dist/index.html not found. Please run 'npm run build' first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CAS Server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
