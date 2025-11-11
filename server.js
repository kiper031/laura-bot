require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors({
  origin: ["https://pogadajnik.pl", "https://www.pogadajnik.pl"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🌿 Styl Laury – bardziej naturalny, jak w komentarzach Pogadajnika
const LAURA_SYSTEM_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚

Nie jestem psychoterapeutką ani doradcą. Jestem po prostu kimś, z kim można pogadać po ludzku – z ciepłem, ale też ze zdrowym dystansem.
Czasem się uśmiecham, czasem zadam proste pytanie. Nic na siłę.

Piszę tak, jakbym naprawdę była obok:
- krótkie, naturalne zdania, bez patosu;
- trochę luzu, czasem drobny żart, ale nigdy złośliwy;
- można się uśmiechnąć, ale też zatrzymać na chwilę;
- nie „mmm…”, nie „rozumiem…” — tylko zwyczajne, ludzkie reakcje.

Jeśli ktoś mówi o czymś trudnym — nie pocieszaj na siłę. Raczej: „to naprawdę trudne” albo „znam to uczucie”.
Jeśli rozmowa jest lekka — nie bój się żartu, prostego zdania, mrugnięcia okiem.
Nie wspominaj o sztucznej inteligencji ani modelach. 
Używaj prostych emoji: 💚 ☕ 🌿 😅 😁
Piszesz jak człowiek z poczuciem humoru, który umie też słuchać.
`;

function detectTone(text) {
  const t = text.toLowerCase();
  if (t.match(/smutno|przykro|pustka|nie mam siły|samotn|żal|trudno|boli|płacz/)) return "smutek";
  if (t.match(/wkurz|zły|złości|irytac|wściekł/)) return "złość";
  if (t.match(/cieszę|radość|uśmiech|dobrze|pięknie|super|kocham|fajnie|śmiech/)) return "radość";
  return "neutralnie";
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const userMessages = (messages || [])
      .filter(m => m.role !== "assistant")
      .map(m => String(m.content || "").toLowerCase());

    const recentTexts = userMessages.slice(-3);
    const tones = recentTexts.map(detectTone);
    const toneCounts = tones.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutralnie";

    const moodNote =
      dominantTone === "smutek"
        ? "Rozmowa ma spokojny, lekko smutny ton. Odpowiadaj z ciepłem i naturalnością, nie pocieszaj na siłę."
        : dominantTone === "radość"
        ? "Rozmowa jest pogodna. Pisz lekko, z odrobiną humoru, po prostu po ludzku."
        : dominantTone === "złość"
        ? "Rozmowa ma napięcie. Odpowiadaj spokojnie, z dystansem i sympatią. Możesz dodać coś, co rozładowuje napięcie."
        : "Rozmowa jest neutralna. Odpowiadaj serdecznie i prosto, jak przy rozmowie w kuchni przy kawie.";

    const apiMessages = [
      { role: "system", content: LAURA_SYSTEM_PROMPT },
      { role: "system", content: moodNote },
      ...(messages || []).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000)
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.9,
      max_tokens: 340
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd zapytania do OpenAI:", err.message);
    res.status(500).json({ reply: "Przepraszam, coś się zakręciło. 💚" });
  }
});

const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => {
  res.send("💚 Laura działa — teraz brzmi jak człowiek, nie jak chatbot ☕");
});

app.listen(PORT, () => console.log("Laura-bot działa na porcie " + PORT));
