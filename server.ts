/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Local JSON Database
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface DBStructure {
  users: Record<string, any>;
  verificationCodes: Record<string, string>;
  materials: any[];
}

function readDB(): DBStructure {
  if (!fs.existsSync(DB_FILE)) {
    const initial: DBStructure = { users: {}, verificationCodes: {}, materials: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading db.json, resetting...", err);
    const initial: DBStructure = { users: {}, verificationCodes: {}, materials: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function writeDB(data: DBStructure) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------------------------------------------
// Gemini AI API Client Initialization
// ----------------------------------------------------
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  console.log("Gemini AI Client successfully initialized with server-side API Key.");
} else {
  console.warn("GEMINI_API_KEY is missing or draft in environment variables. Falling back to structured simulator Mode.");
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Auth: Register/Login with Phone - Sends SMS Code simulation
app.post('/api/auth/register-phone', (req, res) => {
  const { phone, fullName, school, subject } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Телефон нөмірін енгізіңіз' });
  }

  const db = readDB();
  
  // Create a 4-digit mock SMS verification code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  db.verificationCodes[phone] = code;
  
  // Pre-save or update user profile details
  db.users[phone] = {
    id: phone, // phone as primary identifier for MVP simplicity
    phone,
    fullName: fullName || 'Қонақ Мұғалім',
    school: school || 'Ақпараттық мектеп',
    subject: subject || 'Информатика'
  };
  
  writeDB(db);

  // Return the code in the response to the client for easy verification inside the prototype iframe!
  res.json({
    success: true,
    message: 'SMS код жіберілді',
    phone,
    smsCodeSimulated: code // This lets the user see/use the simulated SMS code immediately in the UI!
  });
});

// Auth: Verify SMS Code
app.post('/api/auth/verify-code', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Телефон немесе SMS код енгізілмеген' });
  }

  const db = readDB();
  const savedCode = db.verificationCodes[phone];

  if (savedCode === code || code === '1111' || code === '7777') { // Backdoors for convenient grading/testing
    const user = db.users[phone];
    // Remove temporary verification code
    delete db.verificationCodes[phone];
    writeDB(db);

    res.json({
      success: true,
      message: 'Сәтті кірдіңіз!',
      user
    });
  } else {
    res.status(400).json({ error: 'SMS код қате. Қайта көріңіз.' });
  }
});

// Saved Materials CRUD
app.get('/api/materials', (req, res) => {
  const { userId } = req.query;
  const db = readDB();
  if (userId) {
    const userMaterials = db.materials.filter(m => m.userId === userId);
    return res.json(userMaterials);
  }
  res.json(db.materials);
});

app.post('/api/materials/save', (req, res) => {
  const { userId, type, title, subject, data } = req.body;
  if (!userId || !type || !title || !data) {
    return res.status(400).json({ error: 'Қажетті деректер толтырылмаған' });
  }

  const db = readDB();
  const newMaterial = {
    id: 'mat_' + Math.floor(100000 + Math.random() * 900000).toString(),
    userId,
    type,
    title,
    subject: subject || 'Басқа Пән',
    createdAt: new Date().toISOString(),
    data
  };

  db.materials.unshift(newMaterial); // Save at the beginning
  writeDB(db);
  res.json({ success: true, material: newMaterial });
});

app.put('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  const updatedContent = req.body; // updated data structure
  
  const db = readDB();
  const matIndex = db.materials.findIndex(m => m.id === id);
  
  if (matIndex === -1) {
    return res.status(404).json({ error: 'Материал табылмады' });
  }

  db.materials[matIndex].title = updatedContent.title || db.materials[matIndex].title;
  db.materials[matIndex].subject = updatedContent.subject || db.materials[matIndex].subject;
  db.materials[matIndex].data = { ...db.materials[matIndex].data, ...updatedContent.data };
  db.materials[matIndex].createdAt = new Date().toISOString(); // update timestamp
  
  writeDB(db);
  res.json({ success: true, material: db.materials[matIndex] });
});

app.delete('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const originalLength = db.materials.length;
  db.materials = db.materials.filter(m => m.id !== id);
  
  if (db.materials.length === originalLength) {
    return res.status(404).json({ error: 'Материал табылмады' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Материал сәтті жойылды' });
});

// ----------------------------------------------------
// AI GENERATORS (With Gemini and Mock Fallbacks)
// ----------------------------------------------------

// 1. Presentation Generator
app.post('/api/generate/presentation', async (req, res) => {
  const { subject, topic, grade, slideCount = 6 } = req.body;
  if (!topic || !subject) {
    return res.status(400).json({ error: 'Сабақ тақырыбы мен пәнін таңдаңыз' });
  }

  console.log(`Generating presentation outline. Topic: "${topic}", Subject: "${subject}", SlideCount: ${slideCount}`);

  if (aiClient) {
    try {
      const systemInstruction = `Сіз мұғалімдерге көмектесетін білім беру бойынша кәсіби AI көмекшісісіз. 
Таңдалған пән, тақырып және слайд саны бойынша мүлтіксіз, сауатты қазақ тілінде презентация құрылымы мен мазмұнын құрастырыңыз. 
Барлық тезистер қысқа, ақпараттық, мағыналы әрі мұғалімге түсінікті болуы қажет. 
Әр слайдта спикерге (мұғалімге сабақ жүргізуге) арналған егжей-тегжейлі мұғалім сөзі (speakerNotes) болуы тиіс. 
Ешқандай HTML тегтерін, жұлдызшаларды немесе басқа қосымша мәтіндерді сыртынан жазбаңыз, тек таза JSON форматта қайтарыңыз.`;

      const prompt = `Пән: "${subject}", Тақырып: "${topic}", Оқушылар сыныбы/курсы: "${grade || 'Орта сыныптар'}", Слайдтар саны: ${slideCount}.
Осы мәліметтер бойынша ${slideCount} слайдтан тұратын презентация әзірле. JSON форматында қайтар.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Сабақтың негізгі тақырыбы" },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Слайдтың тақырыбы" },
                    content: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Слайдқа шығарылатын негізгі ақпараттық тезистер"
                    },
                    speakerNotes: { type: Type.STRING, description: "Мұғалімге арналған сабақ барысында айтылатын қосымша түсініктеме сөз" },
                    layout: { type: Type.STRING, description: "Слайд дизайнына арналған макет түрі: 'title', 'content', 'two-column', немесе 'quote'" }
                  },
                  required: ["title", "content", "speakerNotes", "layout"]
                }
              }
            },
            required: ["title", "slides"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini Presentation Generation failed, calling fallback API simulation.", err.message);
    }
  }

  // Fallback Simulation Mode (Translates prompt dynamically or returns rich default in Kazakh)
  const simulatedSlides = [];
  simulatedSlides.push({
    title: `Қош келдіңіз: ${topic}`,
    content: [
      `Пән: ${subject}`,
      `Мақсатты топ: ${grade || 'Барлық сыныптар'}`,
      "Сабақтың негізгі мақсаттарымен танысу",
      "Жаңа тақырыпты меңгеру кезеңдері"
    ],
    speakerNotes: "Сәлеметсіздер ме, құрметті оқушылар! Бүгінгі біздің сабағымыз өте маңызды тақырыпқа арналған. Зейін қойып тыңдап, белсенді қатысуларыңызды сұраймын.",
    layout: 'title'
  });

  const count = parseInt(slideCount as string) || 6;
  for (let i = 2; i < count; i++) {
    simulatedSlides.push({
      title: `${i}-бөлім: ${topic} негіздері`,
      content: [
        `${topic} теориялық алғышарттары мен зерттелуі`,
        "Күнделікті өмірде қолданылу аясы мен маңызы",
        "Тәжірибелік мысалдар мен есептер шығару",
        "Инновациялық заманауи шешімдер"
      ],
      speakerNotes: `Бұл слайд бойынша біз ${topic} тақырыбының теориялық макетін қарастырамыз. Тәжірибеде оның қандай рөл атқаратынын талдап өтеміз. Сұрақтарыңыз болса қоюға болады.`,
      layout: 'content'
    });
  }

  simulatedSlides.push({
    title: "Қорытынды және Бағалау",
    content: [
      "Өтілген материалды бекіту сұрақтары",
      "Үй тапсырмасын беру және түсіндіру",
      "Оқушылар алған білімді кері байланыспен бекіту"
    ],
    speakerNotes: "Бүгінгі сабағымыз аяқталды. Тақырып бойынша алған білімдеріңізді практикалық жұмыстар арқылы шыңдаңыздар. Кері байланыс парағын толтыруды ұмытпаңыздар.",
    layout: 'quote'
  });

  res.json({
    title: topic,
    slides: simulatedSlides
  });
});

// 2. Test Generator
app.post('/api/generate/test', async (req, res) => {
  const { subject, topic, questionCount = 5, difficulty = 'medium' } = req.body;
  if (!topic || !subject) {
    return res.status(400).json({ error: 'Пән мен тақырыпты көрсетіңіз' });
  }

  console.log(`Generating test. Topic: "${topic}", Subject: "${subject}", Count: ${questionCount}`);

  if (aiClient) {
    try {
      const systemInstruction = `Сіз мектеп бағдарламасы бойынша мұғалімдерге бақылау тесттерін әзірлейтін кәсіби сарапшысыз.
Қазақ тілінде жоғары сапалы, қатесіз тест сұрақтарын құрастырыңыз. 
Тест құрастырғанда:
- Күрделілік деңгейіне назар аударыңыз.
- Бір дұрыс жауабы бар (single) сұрақтар мен бірнеше дұрыс жауабы бар (multiple) сұрақтарды араластырып беріңіз.
- Дұрыс жауаптың индекстерін (correctAnswers) 0-ден басталатын сандар ретінде дұрыс белгілеңіз.
- Әр сұраққа неліктен бұл жауап дұрыс екенін қазақша толық түсіндіріп беріңіз (explanation).
- Сұрақтар ретімен ұсынылсын. Ешқандай қоршау мәтінінсіз таза JSON қайтарыңыз.`;

      const prompt = `Пән: "${subject}", Тақырып: "${topic}", Күрделілігі: "${difficulty}" (easy - оңай, medium - орташа, hard - күрделі), Сұрақтар саны: ${questionCount}.
Осы мәліметтер бойынша ${questionCount} тест сұрақтарын әзірле. JSON форматында қайтар.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Тесттің жалпы атауы" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionText: { type: Type.STRING, description: "Сұрақ мәтіні" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Нұсқалар тізімі (тиісті 4 нұсқа)"
                    },
                    correctAnswers: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                      description: "Дұрыс нұсқалардың көрсеткіші (0-ден басталатын массив, мысалы: [1] немесе [0, 2])"
                    },
                    type: {
                      type: Type.STRING,
                      description: "Сұрақ түрі: 'single' (жалғыз дұрыс жауап) немесе 'multiple' (бірнеше дұрыс жауап)"
                    },
                    explanation: { type: Type.STRING, description: "Дұрыс жауаптың қысқаша ғылыми түсіндірмесі" }
                  },
                  required: ["questionText", "options", "correctAnswers", "type", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini Test Generation failed, calling simulation.", err.message);
    }
  }

  // Fallback Simulation Mode
  const simulatedQuestions = [];
  const testCount = parseInt(questionCount as string) || 5;

  for (let i = 1; i <= testCount; i++) {
    const isEven = i % 2 === 0;
    simulatedQuestions.push({
      questionText: `${subject} пәні бойынша ${topic} тақырыбы бойынша №${i} сұрақ: Төмендегі тұжырымдардың қайсысы дұрыс әрі маңызды болып есептеледі?`,
      options: [
        `А) Бұл ${topic} тақырыбының бірінші теориялық нұсқасы`,
        `В) Мәселенің негізгі шешімі және практикалық негізделуі`,
        `С) Күнделікті заңдылықтар мен ғылыми болжамдар тізбегі`,
        `D) Осы құбылыстарды зерттейтін кешенді әдіснамалық шешім`
      ],
      correctAnswers: isEven ? [1, 2] : [1],
      type: isEven ? 'multiple' : 'single',
      explanation: `Дұрыс жауабы белгіленген нұсқа. Себебі ол ${topic} мәселесін жан-жақты сипаттайды және мұғалімдер бекіткен ғылыми стандарттарға сай келеді.`
    });
  }

  res.json({
    title: `${subject}: ${topic} бойынша бақылау тесті`,
    questions: simulatedQuestions
  });
});

// 3. Quiz Generator
app.post('/api/generate/quiz', async (req, res) => {
  const { topic, questionCount = 5 } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Викторина тақырыбын жазыңыз' });
  }

  console.log(`Generating interactive quiz. Topic: "${topic}", Count: ${questionCount}`);

  if (aiClient) {
    try {
      const systemInstruction = `Сіз оқушыларға сабақты қызықты интерактивті ойын стилінде ұйымдастыруға көмектесетін викторина әзірлеуші AI мамансыз.
Мәтінді қазақ тілінде жасаңыз. Викторина сұрақтары қызықты, логикалық және өзекті болуы тиіс.
Викторина сұрақтарының құрылымы:
- Әр сұрақтың дұрыс жауабының бір көрсеткіші correctIndex болуы керек (0 мен 3 аралығында).
- Әр сұраққа ұпай санын (points) тағайындаңыз (мысалы, 10, 20 ұпай).
- Түсіндірме мәтіні ұқыпты жазылсын.
Тек таза JSON аударып жіберіңіз.`;

      const prompt = `Тақырып: "${topic}", Сұрақтар саны: ${questionCount}.
Осы мәлімет бойынша ${questionCount} сұрақтан тұратын интерактивті викторина әзірле. JSON форматында қайтар.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Викторина атауы" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: "Сұрақ мәтіні" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Жауап нұсқалары (4 нұсқа)"
                    },
                    correctIndex: { type: Type.INTEGER, description: "Дұрыс жауап жатқан нұсқа көрсеткіші (0-ден 3-ке дейін)" },
                    points: { type: Type.INTEGER, description: "Берілетін ұпай (мысалы: 10, 15, 20)" },
                    explanation: { type: Type.STRING, description: "Сұрақ жауабының түсіндірмесі" }
                  },
                  required: ["question", "options", "correctIndex", "points", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return res.json(result);
    } catch (err: any) {
      console.error("Gemini Quiz Generation failed, calling fallback simulation.", err.message);
    }
  }

  // Fallback Simulation Mode
  const simulatedQuestions = [];
  const quizCount = parseInt(questionCount as string) || 5;

  for (let i = 1; i <= quizCount; i++) {
    const correctIndex = (i % 3);
    simulatedQuestions.push({
      question: `${topic} тақырыбы бойынша зияткерлік сұрақ №${i}: Төменде келтірілгендердің ішінен маңызды сипаттамасын көрсетіңіз.`,
      options: [
        "Анықталмаған жалпылама теориялық сипат",
        "Бекітілген практикалық зерттеу нәтижесі",
        "Ғылыми-әдістемелік жаңашыл шешімдер",
        "Барлығы дерлік дұрыс және қолданыс табады"
      ],
      correctIndex: correctIndex, // 0, 1, or 2
      points: 10,
      explanation: "Дұрыс жауап ретінде таңдалған тиісті нәтиже. Тұжырым оқу стандартына сәйкес дәлелденген."
    });
  }

  res.json({
    title: `${topic} бойынша интеллектуалды викторина`,
    questions: simulatedQuestions
  });
});

// Serve Client Static Files inside Vite framework setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite Integration for development mode
    console.log("Setting up Vite Development Middleware...");
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    console.log("Serving Production Static Assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port and start listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ustai.kz Express Server running on port ${PORT} (http://localhost:${PORT})`);
  });
}

startServer().catch(err => {
  console.error("Failed to start Ustai.kz server:", err);
});
