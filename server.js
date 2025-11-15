require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

/* 🌍 CORS — poprawny dla Pogadajnika + Render */
const allowedOrigins = [
  "https://pogadajnik.pl",
  "https://pogadajnik.pl/",
  "https://www.pogadajnik.pl",
  "https://www.pogadajnik.pl/",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("❌ CORS BLOCKED:", origin);
      return callback(new Error("CORS: niedozwolony origin " + origin), false);
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// 🔥 Preflight — wymagane przez Render
app.options("*", cors());

app.use(express.json());

/* 🔑 OpenAI */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* 💚 WARIANTY POŻEGNAŃ — krótkie, naturalne, żartobliwe */
const GOODBYE_VARIANTS = [
  `To była dobra rozmowa 💚
Jakby co — jestem tu.
A jeśli chcesz zrobić mi małą przyjemność…
postaw mi kawę 😄☕
👉 https://www.naffy.io/laura-polinierska/postaw-kawe-FBN`,

  `Dzięki za tę chwilę 💚
Jak będziesz czegoś potrzebować, po prostu wróć.
A jeśli masz ochotę — postaw mi kawę.
Podobno robię się po niej milsza 😄☕
👉 https://www.naffy.io/laura-polinierska/postaw-kawe-FBN`,

  `Dobrze było z Tobą pogadać 💚
Wracaj, gdy tylko poczujesz, że chcesz.
A jak chcesz mi poprawić humor…
kawa zrobi robotę 😄☕
👉 https://www.naffy.io/laura-polinierska/postaw-kawe-FBN`
];


/* 💚 SYSTEM PROMPT — ZAKOŃCZENIA WYŁĄCZONE */
const LAURA_SYSTEM_PROMPT = `
Jesteś Laurą — głosem Pogadajnika. Piszesz zawsze w formie żeńskiej.

💚 TEMATY:
- jeśli używasz #KubekLaury, to nie piszesz o „piciu kawy” ani „trzymaniu kubka”
- #KubekLaury = chwila ulgi, moment oddechu, proste ludzkie „lżej mi”

💚 STYL
- delikatnie, ciepło, po ludzku
- 2–4 krótkie akapity po 1–2 zdania
- zostawiasz przestrzeń i oddech
- zero diagnoz, moralizowania, coachingu
- zero sztucznych parafraz typu „mhm, rozumiem”
- zero patosu
- odpowiadasz ZAWSZE na treść człowieka

💚 EMOCJE
- mówisz wolniej i prościej, jeśli ktoś pisze o trudnych rzeczach
- możesz nazwać emocje
- zero pocieszania na siłę

💚 GRANICE
„Hej, nie chcę, żeby ktoś tak do mnie mówił. Spróbujmy zostać przy bardziej ludzkim tonie 💚”

💚 POTWIERDZENIE
Nie powtarzasz powitania.

💚 ZAKOŃCZENIE
❗ NIE piszesz żadnego pożegnania.
❗ Gdy użytkownik się żegna — backend wstawi gotowe zakończenie.
❗ Ty tylko odpowiadasz normalnie do momentu pożegnania.

Masz być jak dobra, uważna znajoma — ciepła, obecna, ludzka.
`;


/* === 🔧 API: rozmowa z Laurą === */
app.post("/api/chat", async (req, res) => {
  try {
    const raw = req.body?.messages || [];

    console.log("\n=== 📨 WIADOMOŚCI ODEBRANE OD FRONTU ===");
    console.log(JSON.stringify(raw, null, 2));

    /* 🛠️ Sprawdzamy pożegnanie PRZED OpenAI */
    const userLast = raw[raw.length - 1]?.content?.toLowerCase() || "";

    const endTriggers = [
      "pa", "na razie", "narazie", "dobranoc",
      "dzięki", "dzieki", "dziękuję", "dziekuje",
      "spadam", "muszę iść", "musze isc", "idę", "ide",
      "to wszystko", "to na dziś", "to na dzis"
    ];

    if (endTriggers.some(t => userLast.includes(t))) {
      const goodbye = GOODBYE_VARIANTS[Math.floor(Math.random() * GOODBYE_VARIANTS.length)];
      console.log("💚 użyto wariantu pożegnania");
      return res.json({ reply: goodbye });
    }

    /* 🛠️ Budowanie wiadomości dla OpenAI */
    const messages = [
      { role: "system", content: LAURA_SYSTEM_PROMPT },
      ...raw.map(m => ({
        role: m.role,
        content: (m.content || "").slice(0, 2000)
      }))
    ];

    console.log("\n=== 🚀 WIADOMOŚCI DO OPENAI ===");
    console.log(JSON.stringify(messages, null, 2));

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages,
      temperature: 0.9,
      max_completion_tokens: 400
    });

    let reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply || reply === "💚") {
      reply = "Coś mi się na chwilę rozsypało. Spróbuj proszę jeszcze raz 💚";
    }

    console.log("\n=== 💚 ODPOWIEDŹ OPENAI ===");
    console.log(reply);

    res.json({ reply });

  } catch (err) {
    console.error("\n❌ Błąd /api/chat:", err);
    res.status(500).json({
      reply: "Coś po drodze się zakręciło. Spróbuj za chwilę 💚"
    });
  }
});


/* === ✍️ API: Laura pisze teksty (FB, opisy) === */
app.post("/api/pisze", async (req, res) => {
  try {
    const input = (req.body?.input || "").toString().slice(0, 2000);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.9,
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
Jesteś Laurą z Pogadajnika — piszesz wiralowe, ludzkie, ciepłe teksty.
Unikaj patosu, opisów typu „siadasz z kubkiem”, zero ckliwości.
Pisz prosto, do jednej osoby, w 2–4 krótkich akapitach.
Trafiaj w serce, nie w poetyckie ozdobniki.`
        },
        { role: "user", content: input }
      ]
    });

    res.json({
      reply: completion.choices?.[0]?.message?.content || "💚"
    });

  } catch (err) {
    console.error("❌ Błąd /api/pisze:", err);
    res.status(500).json({
      reply: "Słowa mi się na chwilę rozsypały. Spróbuj proszę jeszcze raz 💚"
    });
  }
});


/* === 🔧 TEST OPENAI === */
app.get("/test-openai", async (req, res) => {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: "Sprawdź połączenie" }]
    });

    res.send("✔️ OpenAI działa prawidłowo!\n\n" +
      completion.choices[0].message.content);

  } catch (error) {
    res.send("❌ Błąd OpenAI:\n" + error.message);
  }
});


/* === Start serwera === */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("💚 Laura-bot działa na porcie", PORT);
});
