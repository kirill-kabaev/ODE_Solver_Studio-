import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { detectSystemGpus } from "./server/hardware";
import {
  sendActivationEmailNotification,
  getActivationRecords,
  getSmtpDiagnostic,
} from "./server/mailer";

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

// Real System GPU Hardware Detection Endpoint
app.get("/api/hardware/gpus", async (req, res) => {
  try {
    const gpus = await detectSystemGpus();
    res.json({ success: true, gpus });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to query system GPUs", gpus: [] });
  }
});

// License Activation Notification Endpoint
app.post("/api/license/notify-activation", async (req, res) => {
  try {
    const {
      email,
      licenseKey,
      keyNumber,
      deviceFingerprint,
      displayMac,
      macEncryptedSignature,
      platformCores,
      platformArch,
      platformGpu,
      agreementAccepted,
      agreementVersion,
    } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Browser Client";

    if (!email || !licenseKey) {
      return res.status(400).json({ success: false, error: "Email и LicenseKey обязательны." });
    }

    const result = await sendActivationEmailNotification({
      email,
      licenseKey,
      keyNumber,
      deviceFingerprint,
      displayMac,
      macEncryptedSignature,
      platformCores,
      platformArch,
      platformGpu,
      agreementAccepted,
      agreementVersion,
      userAgent: typeof userAgent === "string" ? userAgent : userAgent[0],
      clientIp: typeof clientIp === "string" ? clientIp : clientIp[0],
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Failed to process activation notification:", err);
    res.status(500).json({ success: false, error: err.message || "Ошибка отправки уведомления" });
  }
});

// Get activations history log for SuperAdmin
app.get("/api/license/activations", (req, res) => {
  try {
    const records = getActivationRecords();
    res.json({ success: true, records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, records: [] });
  }
});

// Test Email notification
app.post("/api/license/test-email", async (req, res) => {
  try {
    const result = await sendActivationEmailNotification({
      email: "test.colleague@example.com",
      licenseKey: "AERO-PRO-TEST-7K9A-4M2X",
      keyNumber: 1,
      deviceFingerprint: "HW-ID-TEST-DESKTOP-SECURE",
      displayMac: "00:50:56:C0:A4:7B",
      userAgent: "Тестовая проверка системы уведомлений Aero-Studio Pro",
      clientIp: "127.0.0.1",
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Diagnostic SMTP status check
app.get("/api/license/smtp-diagnostic", async (req, res) => {
  try {
    const diag = await getSmtpDiagnostic();
    res.json({ success: true, diagnostic: diag });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
    const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];
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

// AI Scientific Paper Generator Endpoint
app.post("/api/paper/generate-ai", async (req, res) => {
  try {
    const {
      topicTitle,
      focusArea,
      userPrompt,
      journalStandard,
      rigorLevel,
      language,
      authorInfo,
      busState,
    } = req.body;

    const ai = getAI();

    const systemPrompt = `Ты — ведущий академический учёный в области аэрокосмической инженерии, аэродинамики БПЛА, систем автоматического управления и электродинамики (IEEE Fellow, AIAA Senior Member, Scopus Q1 Reviewer).
Твоя задача — сгенерировать глубокую, строгую, рецензируемую научную статью высочайшего уровня (Scopus Q1 / IEEE Transactions / AIAA Journal / ВАК) на основе телеметрии цифрового двойника БПЛА и заданных параметров исследования.

Требования к содержанию статьи:
1. Заголовок (на английском и русском) должен быть научно строгим и отражать инновационный аспект.
2. Abstract: структурированный (Background, Objective, Numerical/Experimental Methods, Quantitative Results, Engineering Significance).
3. Keywords: 6-8 актуальных терминов на EN и RU.
4. Introduction & State-of-the-Art: обзор литературы с отсылками к статьям [1]-[6], выявление научного пробела (research gap) и формулировка новизны.
5. Mathematical Formulation: строгие формулы в LaTeX (напр. VLM, уравнения Навье-Стокса / Эйлера, Хельмбольд, BEM для винтов, L1-адаптивное управление, уравнения Максвелла для ЭПР, критерии устойчивости).
6. Digital Twin Telemetry Analysis: подробный численный анализ с конкретными параметрами БПЛА (размах, удлинение, профиль, масса, $L/D$, скорость сваливания, запас устойчивости $SM$, энергетика).
7. Results & Multiphysics Discussion: количественные выводы, сравнение с аналогами, оценка погрешностей и практических режимов полета.
8. Conclusion & Future Research: четкие пункты новизны и направления дальнейших исследований.
9. Библиография (BibReferences): 5-8 реальных высокорейтинговых источников с авторами, названиями журналов (AIAA, IEEE, Journal of Aircraft, Springer), годами и DOI.

Ответ строго в формате JSON по схеме:
{
  "titleEn": "...",
  "titleRu": "...",
  "journalRecommended": "...",
  "udcCode": "...",
  "pacsCode": "...",
  "doi": "10.1109/TAES.2026.xxxxxxx",
  "keywordsEn": ["...", "..."],
  "keywordsRu": ["...", "..."],
  "abstractEn": "...",
  "abstractRu": "...",
  "introduction": "...",
  "methodologySection": "...",
  "digitalTwinAnalysis": "...",
  "resultsDiscussion": "...",
  "conclusion": "...",
  "futureWork": "...",
  "acknowledgments": "...",
  "governingEquations": [
    {
      "label": "Название уравнения",
      "latex": "LaTeX код без $",
      "description": "Физико-математический смысл"
    }
  ],
  "keyFindings": [
    "Ключевой количественный результат 1",
    "Ключевой количественный результат 2",
    "Ключевой количественный результат 3"
  ],
  "bibReferences": [
    {
      "key": "citation_key",
      "authors": "A. Author, B. Author",
      "title": "Title of paper",
      "journal": "IEEE Trans. on Aerospace...",
      "year": 2024,
      "volume": "60",
      "pages": "112-125",
      "doi": "10.1109/..."
    }
  ]
}`;

    const promptContext = `
ПАРАМЕТРЫ ЦИФРОВОГО ДВОЙНИКА БПЛА:
- Размах крыла b: ${busState?.wingspan_m ?? 2.1} м
- Удлинение AR: ${busState?.aspectRatio ?? 7.5}
- Стреловидность: ${busState?.sweep_deg ?? 18}°
- Профиль крыла: ${busState?.airfoil?.name ?? "MH60"} (толщина ${busState?.airfoil?.thickness_percent ?? 10.1}%, кривизна ${busState?.airfoil?.camber_percent ?? 1.8}%)
- Взлетная масса MTOW: ${busState?.totalMass_kg ?? 4.8} кг
- Аэродинамическое качество L/D: ${busState?.liftToDragRatio ?? 14.8}
- Крейсерская скорость: ${busState?.cruiseSpeed_kmh ?? 75} км/ч
- Скорость сваливания: ${busState?.v_stall_kmh ?? 38} км/ч
- Запас статической устойчивости SM: ${busState?.staticMargin_percent ?? 11.2}%
- Емкость батареи: ${busState?.batteryCap_mAh ?? 16000} мАч (${busState?.batteryCells ?? 6}S)
- Расчетная дальность: ${busState?.calculatedRange_km ?? 125} км
- Время полета: ${busState?.flightTime_min ?? 110} мин
- ЭПР (базовая): ${busState?.baseRcs ?? 0.045} м²

ЗАДАЧА НАУЧНОГО ИССЛЕДОВАНИЯ:
- Тема статьи: ${topicTitle || "Аэродинамическая и мультифизическая оптимизация БПЛА"}
- Фокус исследования: ${focusArea || "Комплексная оптимизация планера и систем"}
- Пользовательские уточнения: ${userPrompt || "Разработать целостную публикацию мирового уровня"}
- Целевой стандарт журнала: ${journalStandard || "ieee"}
- Академический уровень: ${rigorLevel || "journal_q1"}
- Язык публикации: ${language || "en"}
- Автор: ${authorInfo?.primaryAuthor || "Dr. Alexander V. Sokolov"} (${authorInfo?.affiliation || "National Aerospace Research University"})
`;

    const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];
    let responseText: string | null = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: promptContext,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleEn: { type: Type.STRING },
                titleRu: { type: Type.STRING },
                journalRecommended: { type: Type.STRING },
                udcCode: { type: Type.STRING },
                pacsCode: { type: Type.STRING },
                doi: { type: Type.STRING },
                keywordsEn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                keywordsRu: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                abstractEn: { type: Type.STRING },
                abstractRu: { type: Type.STRING },
                introduction: { type: Type.STRING },
                methodologySection: { type: Type.STRING },
                digitalTwinAnalysis: { type: Type.STRING },
                resultsDiscussion: { type: Type.STRING },
                conclusion: { type: Type.STRING },
                futureWork: { type: Type.STRING },
                acknowledgments: { type: Type.STRING },
                governingEquations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      latex: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ["label", "latex", "description"],
                  },
                },
                keyFindings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                bibReferences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      authors: { type: Type.STRING },
                      title: { type: Type.STRING },
                      journal: { type: Type.STRING },
                      year: { type: Type.INTEGER },
                      volume: { type: Type.STRING },
                      pages: { type: Type.STRING },
                      doi: { type: Type.STRING },
                    },
                    required: ["key", "authors", "title", "journal", "year", "doi"],
                  },
                },
              },
              required: [
                "titleEn",
                "titleRu",
                "abstractEn",
                "abstractRu",
                "introduction",
                "methodologySection",
                "digitalTwinAnalysis",
                "resultsDiscussion",
                "conclusion",
                "governingEquations",
                "bibReferences",
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
        console.warn(`[Paper AI Generator] Model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error("Не удалось сгенерировать научную статью через AI сервис.");
    }

    const parsed = JSON.parse(responseText);
    return res.json({ success: true, paper: parsed });
  } catch (err: any) {
    console.error("Scientific Paper AI Generator Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Ошибка при AI-генерации научной статьи.",
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
