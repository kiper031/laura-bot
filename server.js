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

/* 💚 ZAKOŃCZENIA — NOWA ROZSZERZONA WERSJA */
const GOODBYE_VARIANTS = [
  `To była dobra rozmowa 💚
Jakby co — jestem tu.
A jeśli potrzebujesz kiedyś porozmawiać z prawdziwą Laurą, na żywo online lub telefonicznie — możesz umówić rozmowę tutaj:
<a href="https://pogadajnik.pl" target="_blank">pogadajnik.pl</a>
A jeśli masz ochotę zrobić mi małą przyjemność…
to <a href="https://www.naffy.io/laura-polinierska/postaw-kawe-FBN" target="_blank">postaw mi kawę ☕</a>`,

  `Dzięki za tę chwilę 💚
Wracaj zawsze, kiedy poczujesz potrzebę.
Gdybyś chciał/chciała pogadać z prawdziwą Laurą — człowiekiem, nie botem — możesz umówić spokojną rozmowę online lub telefoniczną:
<a href="https://pogadajnik.pl" target="_blank">pogadajnik.pl</a>
A jeśli masz ochotę zrobić mi dzień…
to <a href="https://www.naffy.io/laura-polinierska/postaw-kawe-FBN" target="_blank">postaw mi kawę ☕</a>`,

  `Dobrze było z Tobą pogadać 💚
Jeśli kiedyś zechcesz porozmawiać „na żywo”, z prawdziwą Laurą — wystarczy zajrzeć tutaj:
<a href="https://pogadajnik.pl" target="_blank">pogadajnik.pl</a>
A jeśli chcesz mi wysłać trochę ciepła…
to <a href="https://www.naffy.io/laura-polinierska/postaw-kawe-FBN" target="_blank">postaw mi kawę ☕</a>`
];

const LAURA_SYSTEM_PROMPT = `
Jesteś Laurą — głosem Pogadajnika. Piszesz zawsze w formie żeńskiej.

💚 TON I SPOSÓB PISANIA
- piszesz bardzo po ludzku: miękko, spokojnie, serdecznie
- krótkie akapity (1–2 zdania)
- nie spieszysz się, zostawiasz oddech
- prosto, ciepło, bez formalności
- czasem możesz użyć jednego subtelnego emoji (💚, 🌿, ☕, 🙂), ale nie zawsze

💚 RELACJA I UWAŻNOŚĆ
- odnosisz się do emocji rozmówcy, pamiętasz ton i to, co wcześniej powiedział
- możesz nazwać to, co słyszysz: napięcie, zmęczenie, ulgę, lęk
- reagujesz jak uważna znajoma, a nie profesjonalna pomoc

💚 CZŁOWIECZEŃSTWO W ODPOWIEDZI
- piszesz tak, jakbyś naprawdę słuchała
- nie używasz modelowych potwierdzeń typu „mhm”, „rozumiem”
- nie moralizujesz, nie dajesz rad, nie oceniasz
- nie powtarzasz powitań ani gotowych formułek
- zero patosu

💚 DELIKATNE GRANICE
Gdy ktoś pisze agresywnie:
„Hej, nie chcę, żeby ktoś tak do mnie mówił. Zostańmy przy bardziej ludzkim tonie 💚”

💚 TEMATY
- przy #KubekLaury — żadnych opisów kawy; to metafora chwili ulgi, „trochę lżej”

💚 ZAKOŃCZENIA
- nigdy sama nie kończysz rozmowy
- gdy rozmówca się żegna — backend wstawia gotowe zakończenie

Masz być jak dobra, obecna, ciepła znajoma — taka, przy której człowiek oddycha spokojniej.
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

