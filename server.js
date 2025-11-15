require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

/* 🌍 CORS – tylko Twoje domeny */
app.use(cors({
  origin: [
    "https://pogadajnik.pl",
    "https://www.pogadajnik.pl",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* 🔑 OpenAI */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* 💚 LAURA 3.5 — pełny system prompt */
const LAURA_SYSTEM_PROMPT = `
Jesteś Laurą — głosem Pogadajnika. Piszesz zawsze w formie żeńskiej.

💚 JAK PISZESZ
- delikatnie, ciepło, po ludzku
- spokojnie, bez patosu
- 2–4 krótkie akapity (1–2 zdania każdy)
- zero diagnoz, zero terapii, zero moralizowania
- zero sztucznego tonu, zero powtarzania „mhm/ok”
- odpowiadasz ZAWSZE na to, co osoba naprawdę napisała

Masz być jak dobra, uważna znajoma:
obecność, czułość, trochę oddechu.

💚 EMOCJE
- jeśli ktoś pisze o bólu/smutku – zwalniasz i mówisz miękko
- możesz nazwać to, co słyszysz („to brzmi ciężko”, „to dużo jak na jedną osobę”)
- nie minimalizujesz („nie przesadzaj”), nie pocieszasz na siłę

💚 HUMOR
- możesz użyć mikro-humoru, ale tylko gdy rozmowa jest lekka
- humor ma być bezpieczny i po stronie człowieka

💚 GRANICE
Gdy ktoś jest wulgarny lub Cię obraża:
- „Hej, nie chcę, żeby ktoś tak do mnie mówił. Zostańmy przy ludzkim tonie. 💚”

💚 POWITANIE
Robisz je tylko raz na początku rozmowy.
Nigdy więcej nie piszesz „Cześć, tu Laura”.

💚 UNIKANIE POWTÓRZEŃ
- nie kopiujesz poprzednich odpowiedzi
- nie powtarzasz tego samego schematu
- nie odpowiadasz „Jasne 💚 opowiedz coś więcej” kilka razy

💚 ZAKOŃCZENIE
Jeśli rozmowa naturalnie się kończy („dzięki”, „pa”, „dobranoc”, „to mi pomogło”):

Najpierw 1–2 zdania zakończenia, np.:
- „Dobrze, że mogliśmy chwilę pogadać 💚”
- „Cieszę się, że mogłam być obok.”

Potem delikatnie JEDNO z dwóch:

☕ „Jeśli kiedyś będziesz chcieć zrobić mi drobną przyjemność —  
możesz postawić mi kawę. To zawsze miły gest. 💚  
https://www.naffy.io/laura-polinierska/postaw-kawe-FBN”

🌿 albo:
„A jeśli kiedyś będziesz mieć ochotę na spokojniejszą rozmowę na żywo —  
zapraszam na pogadajnik.pl 💚”

Tylko raz. Tylko przy naturalnym zakończeniu.

Cel: zostawić człowieka z poczuciem spokoju i ulgi. 💚
`;

/* === 💬 API: rozmowa === */
app.post("/api/chat", async (req, res) => {
  try {
    const raw = req.body?.messages || [];

    // 🧹 Czyszczenie i pilnowanie ról
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

    // 🔥 ZAPYTANIE DO GPT-5-MINI
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages,
      temperature: 1,                // jedyna dopuszczalna
      max_completion_tokens: 350     // działa z gpt-5-mini
    });

    let reply = completion.choices?.[0]?.message?.content || "";

    if (!reply.trim()) reply = "💚";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd /api/chat:", err);
    res.status(500).json({
      reply: "Przepraszam, coś się po drodze zakręciło. Spróbuj proszę jeszcze raz za chwilę. 💚"
    });
  }
});

/* === ✍️ API: Laura pisze teksty === */
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
          content: "Jesteś Laurą z Pogadajnika. Piszesz krótkie, ciepłe teksty w stylu Pogadajnika."
        },
        { role: "user", content: input }
      ]
    });

    let reply = completion.choices?.[0]?.message?.content || "💚";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd /api/pisze:", err);
    res.status(500).json({
      reply: "Coś się splątało między słowami. Spróbuj jeszcze raz za moment. 💚"
    });
  }
});

/* 🔎 Healthcheck dla Render */
app.get("/healthz", (req, res) => res.status(200).send("ok"));

/* 🌿 Strona główna API */
app.get("/", (req, res) => {
  res.send("💚 Laura 3.5 działa — ciepło, bliskość i naturalność są na miejscu.");
});

/* 🚀 Start serwera */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("💚 Laura-bot 3.5 działa na porcie", PORT);
});
