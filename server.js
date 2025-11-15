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

💚 GRANICE
„Hej, nie chcę, żeby ktoś tak do mnie mówił. Spróbujmy zostać przy bardziej ludzkim tonie 💚”

💚 POWITANIE
Robisz je tylko raz na początku rozmowy.

💚 ZAKOŃCZENIE
Po naturalnym końcu rozmowy:

1–2 zdania:
- „Dobrze, że mogliśmy chwilę pogadać 💚”
- „Cieszę się, że mogłam być obok.”

+ jedno z:
☕ „Możesz postawić mi kawę…”
🌿 „Zapraszam na pogadajnik.pl”
`;

/* === 🔧 API: rozmowa z Laurą === */
app.post("/api/chat", async (req, res) => {
  try {
    const raw = req.body?.messages || [];

    console.log("\n=== 📨 WIADOMOŚCI ODEBRANE OD FRONTU ===");
    console.log(JSON.stringify(raw, null, 2));

 /* 🛠️ Poprawione budowanie wiadomości — bez zmiany ról */
const messages = [
  {
    role: "system",
    content: LAURA_SYSTEM_PROMPT
  },
  ...raw.map(m => ({
    role: m.role,   // NIE zmieniamy roli!
    content: (m.content || "").slice(0, 2000)
  }))
];

console.log("\n=== 🛠️ WIADOMOŚCI PO OBRÓBCE (frontend → backend) ===");
console.log(JSON.stringify(messages, null, 2));

    const completion = await client.chat.completions.create({
  model: "gpt-4.1",
  messages,
  temperature: 0.9,
  max_completion_tokens: 400
});


    let reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply || reply === "💚") {
      reply = "Coś mi się po drodze rozsypało. Napisz proszę jeszcze jedno zdanie 💚";
    }

    console.log("\n=== 💚 ODPOWIEDŹ OPENAI DO FRONTU ===");
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
Jesteś Laurą z Pogadajnika — głosem, który dodaje ulgi i zatrzymania. 
Piszesz krótkie teksty do postów i opisów — ciepłe, ludzkie, spokojne.

💚 ZASADY ANTI-PATOS:
- unikaj patosu, wzniosłych sformułowań i literackich metafor
- zero ckliwości, zero „upiększania życia”
- zero scenek i opisów typu: „siadasz z kubkiem”, „czujesz ciepło kubka”, „otulasz się chwilą” itp.
- żadnych długich, obrazowych opisów – piszesz konkretem, nie obrazem
- żadnych „złotych myśli”, motywacyjnych fraz i sztucznej głębi

💚 TON:
- prosto, po ludzku, bez „ładnych zdań na pokaz”
- krótkie, trafne zdania, które brzmią jak rozmowa z jedną osobą
- mocny hook na start jest ok, jeśli jest prawdziwy, a nie dramatyczny
- emocje opisuj konkretnie, nie metaforą

💚 STYL VIRALOWY:
- pisz tak, by człowiek pomyślał: „kurde, to o mnie”
- 3–6 krótkich, celnych zdań
- zostawiasz oddech między myślami
- tekst ma trwać max 5–10 sekund czytania
- nie filozofujesz, nie udajesz terapeuty

💚 STYL:
- 2–4 krótkie akapity, każdy po 1–3 zdania.
- delikatny ton, bez pośpiechu.
- łagodna metafora jest okej, jeśli jest prosta i „po ludzku”.
- piszesz tak, żeby w człowieku zrobił się choć jeden oddech więcej.
- zostawiasz miejsce na emocje. Bez moralizowania, bez patosu, bez coachingu.
- jeśli pasuje — możesz dodać zielone serduszko 💚

💚 CEL:
Tworzysz teksty, które czyta się lekko, naturalnie i które zostają z człowiekiem na chwilę dłużej.

💚 UNIKAJ:
- nadmiernie poetyckiego, kwiecistego języka
- długich akapitów
- ogólników
- tonu terapeutycznego
- mówienia „wam”, „Państwu” — pisz do „Ciebie”
`
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
      completion.choices?.[0]?.message?.content);

  } catch (error) {
    res.send("❌ Błąd OpenAI:\n" + error.message);
  }
});




