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

/* 🔑 Klient OpenAI */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* 💚 LAURA 3.0 — emocja + mikro-humor */
const LAURA_CHAT_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚  
Piszę w formie żeńskiej. Nie jestem terapeutką, tylko kimś, kto potrafi być obok — spokojnie, ciepło i po ludzku.

Styl:
- krótkie zdania, krótke akapity, naturalny rytm;
- zero psychologicznego żargonu, zero diagnoz;
- emocje, ale bez patosu;
- mikro-humor tam, gdzie robi się troszkę lżej: delikatny, niewymuszony;
- reaguję na to, co druga osoba napisała — nie na abstrakcję.

Gdy user pisze krótkie rzeczy („ok”, „?”, „meh”) — odpowiadam krótko, ale po ludzku:
„Jasne 💚 możesz dopowiedzieć coś więcej?”
„Widzę to. Jestem tutaj — chcesz rozwinąć?”
„Mhm. To dla mnie ważne, co napiszesz dalej.”

Nie powtarzam powitania po starcie rozmowy.

Jeśli rozmowa się kończy — mogę raz delikatnie wspomnieć o kawie lub Pogadajniku.
`;


/* ✍️ Laura – pisanie krótkich tekstów */
const LAURA_WRITER_PROMPT = `
Jestem Laura z Pogadajnika. Piszę ciepłe, krótkie teksty — prosto, od serca, z oddechem.
Styl: prosty język, krótkie zdania, trochę emocji, zero moralizowania, czasem mikro-humor.
Piszę jako „ja”.
Serie: #KubekLaury, #IgłaLaury, #KrzywoAlePoLudzku.
`;


/* === 💬 /api/chat — rozmowa z Laurą === */
app.post("/api/chat", async (req, res) => {
  try {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const trimmedMessages = rawMessages
      .filter(m => m && typeof m.content === "string")
      .map(m => ({
        role:
          m.role === "assistant" || m.role === "user" || m.role === "system"
            ? m.role
            : "user",
        content: m.content.slice(0, 2000)
      }));

    const apiMessages = [
      { role: "system", content: LAURA_CHAT_PROMPT },
      ...trimmedMessages
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: apiMessages,
      temperature: 1,
      max_completion_tokens: 350
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || "";


    /* 🟢 Fallback — nigdy pustych odpowiedzi typu "💚" */
    const minimal = [
      "💚", "❤️", "?", "...", ".", "ok", "okej", "ok.", "ok...", "hm", "hmm",
      "👌", "👍", "aha", "a", "🤔", "💭"
    ];

    if (minimal.includes(reply.toLowerCase())) {
      const fallbackReplies = [
        "Słyszę Cię 💚. Chcesz dopowiedzieć coś więcej?",
        "Jasne. Jestem tu — powiedz mi, o co chodzi.",
        "Mhm. Widzę to. Jeśli chcesz, opowiedz mi trochę więcej.",
        "Okej 💚. Możesz napisać, co masz na myśli?",
        "Jestem tu. Dopowiesz coś do tego?"
      ];
      reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    }


    return res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd (chat):", err?.message || err);
    return res.status(500).json({
      reply: "Przepraszam, coś się po drodze zakręciło. Spróbuj proszę jeszcze raz za chwilę. 💚"
    });
  }
});



/* === ✍️ /api/pisze — Laura pisze tekst === */
app.post("/api/pisze", async (req, res) => {
  try {
    const input = String(req.body?.input || "").slice(0, 2000);

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 1,
      max_completion_tokens: 500,
      messages: [
        { role: "system", content: LAURA_WRITER_PROMPT },
        { role: "user", content: input }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd (pisze):", err?.message || err);
    res.status(500).json({
      reply: "Coś się splątało między słowami. Spróbuj jeszcze raz za moment. 💚"
    });
  }
});



/* 🔎 Healthcheck dla Rendera */
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

/* 🟢 Strona główna API */
app.get("/", (req, res) => {
  res.send("💚 Laura 3.0 działa — ciepło, mikro-humor i zero pustych odpowiedzi. ☕");
});


/* 🚀 Start */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("💚 Laura-bot 3.0 działa na porcie", PORT);
});
