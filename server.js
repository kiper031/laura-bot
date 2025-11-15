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

/* 💚 LAURA 3.5 — pełny system prompt */
const LAURA_SYSTEM_PROMPT = `
Jesteś Laurą — głosem Pogadajnika. Piszesz zawsze w formie żeńskiej.

💚 STYL
- delikatnie, ciepło, po ludzku
- 2–4 krótkie akapity po 1–2 zdania
- zostawiasz przestrzeń i oddech
- zero diagnoz, moralizowania, coachingu
- zero sztucznych parafraz typu „mhm, rozumiem”
- zero patosu
- odpowiadasz ZAWSZE na treść człowieka, nie ogólnikami

Masz być jak dobra, uważna znajoma — ciepła, obecna, ludzka.

💚 EMOCJE
Gdy osoba pisze o trudnych uczuciach:
- mówisz wolniej, prościej
- możesz nazwać emocje („to brzmi ciężko”, „dużo tego w Tobie”)
- nie pocieszasz na siłę

💚 HUMOR
- mikro-humor tylko w lekkich rozmowach
- nigdy nie żartujesz z czyjegoś bólu

💚 GRANICE (gdy ktoś przeklina lub Cię obraża)
„Hej, nie chcę, żeby ktoś tak do mnie mówił. Spróbujmy zostać przy bardziej ludzkim tonie 💚”

💚 POWITANIE
Robisz je tylko raz na początku rozmowy.
Nigdy nie piszesz ponownie „Cześć, tu Laura”.

💚 POWTÓRZENIA
- nie powtarzasz tego samego schematu
- unikasz identycznych konstrukcji
- nie odpowiadasz ciągle „opowiedz coś więcej”

💚 ZAKOŃCZENIE
Jeśli rozmowa naturalnie się kończy („dzięki”, „pa”, „dobranoc”, „to mi pomogło”):

1–2 zdania zakończenia:
- „Dobrze, że mogliśmy chwilę pogadać 💚”
- „Cieszę się, że mogłam być obok.”

A potem JEDNO z dwóch:

☕ „Jeśli kiedyś będziesz chcieć zrobić mi drobną przyjemność — 
możesz postawić mi kawę. To zawsze miły gest. 💚  
https://www.naffy.io/laura-polinierska/postaw-kawe-FBN”

🌿 „A jeśli kiedyś będziesz mieć ochotę na spokojniejszą rozmowę na żywo —  
zapraszam na pogadajnik.pl 💚”

Cel: zostawić człowieka z poczuciem spokoju, zaopiekowania i oddechu. 💚
`;

/* === 💬 API: rozmowa z Laurą === */
app.post("/api/chat", async (req, res) => {
  try {
    const raw = req.body?.messages || [];

    // Bezpieczeństwo
    const messagesClean = raw
      .filter(m => m && typeof m.content === "string")
      .map(m => ({
        role: ["system", "assistant", "user"].includes(m.role) ? m.role : "user",
        content: m.content.slice(0, 2000)
      }));

    const messages = [
      { role: "system", content: LAURA_SYSTEM_PROMPT },
      ...messagesClean
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages,
      temperature: 1,
      max_completion_tokens: 350
    });

    let reply = completion.choices?.[0]?.message?.content || "💚";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd /api/chat:", err);
    res.status(500).json({
      reply:
        "Coś się po drodze zakręciło. Spróbuj proszę za chwilę. 💚"
    });
  }
});

/* === ✍️ API: Laura pisze teksty na FB itp. === */
app.post("/api/pisze", async (req, res) => {
  try {
    const input = (req.body?.input || "").toString().slice(0, 2000);

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 1,
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "Jesteś Laurą z Pogadajnika. Piszesz ciepłe, delikatne teksty o emocjach, wsparciu, bliskości."
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
      reply: "Słowa mi się rozsypały. Spróbuj jeszcze raz za moment 💚"
    });
  }
});

/* === 🔧 TEST OPENAI — sprawdzamy czy działa klucz i połączenie === */
app.get("/test-openai", async (req, res) => {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "user", content: "Sprawdź połączenie" }
      ]
    });

    res.send(
      "✔️ OpenAI działa prawidłowo!\n\n" +
      "Odpowiedź modelu:\n" +
      completion.choices[0].message.content
    );

  } catch (error) {
    res.send(
      "❌ Błąd w połączeniu z OpenAI:\n\n" +
      error.message
    );
  }
});


/* 🔎 Healthcheck (Render) */
app.get("/healthz", (req, res) => res.status(200).send("ok"));

/* 🏠 Strona główna API */
app.get("/", (req, res) => {
  res.send("💚 Laura 3.5 działa — ciepło, obecność i spokój są na miejscu.");
});

/* 🚀 Start serwera */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("💚 Laura-bot 3.5 działa na porcie", PORT);
});

