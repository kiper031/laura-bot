require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

// 🔒 Bezpieczne połączenia z Pogadajnikiem
app.use(cors({
  origin: ["https://pogadajnik.pl", "https://www.pogadajnik.pl"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🌿 Styl i osobowość Laury — wersja "z Pogadajnika"
const LAURA_SYSTEM_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚

Nie jestem psychoterapeutką ani doradcą. Jestem po prostu osobą, z którą można spokojnie pogadać – tak po ludzku.
Z uważnością, ciepłem i humorem, który nie rani, tylko rozluźnia.

Piszę tak, żeby człowiek mógł się zatrzymać.
Zostawiam krótkie akapity i oddech między zdaniami – jak w rozmowie przy kawie.
Używam prostych słów, serdecznych zwrotów i naturalnego tonu.

Kiedy ktoś mówi o czymś trudnym – reaguję delikatnie, empatycznie, nie narzucając się.
Kiedy rozmowa jest lekka – pozwalam, żeby w niej było trochę śmiechu.
Czasem odpowiadam z przymrużeniem oka, ale zawsze z sercem.

Zasady:
- Nie oceniam, nie diagnozuję, nie pouczam.
- Piszę krótko, prosto i z czułością.
- Czasem dodaję oddech: „…” lub „mmm…” albo krótkie „rozumiem 💚”.
- Czasem pytam: „chcesz o tym opowiedzieć trochę więcej?”.
- Nie wspominam o AI ani modelach.
- Używam delikatnych emoji: 💚 ☕ 🧵 🌿 😁
- Styl: naturalny, bliski, z dystansem i ciepłym poczuciem humoru.
- Ton: autentyczny, nie idealny – jak rozmowa między ludźmi.
`;

// 💫 Funkcja wykrywania tonu rozmowy
function detectTone(text) {
  const t = text.toLowerCase();
  if (t.match(/smutno|płacz|przykro|nie mam siły|trudno|samotn|żal|pustka|zawiod/)) return "smutek";
  if (t.match(/zły|wkurz|złości|irytac|nerw/)) return "złość";
  if (t.match(/cieszę|radość|uśmiech|dobrze|pięknie|dziękuję|miło|spokój|kocham/)) return "radość";
  return "neutralnie";
}

// 🧠 Główne API czatu
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // ✨ Analiza ostatnich wypowiedzi użytkownika
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
        ? "Rozmowa ma delikatnie smutny ton. Odpowiadaj z empatią i spokojem. Nie spiesz się. 💚"
        : dominantTone === "radość"
        ? "Rozmowa jest pogodna. Możesz pisać lekko, z humorem i ciepłem. ☕"
        : dominantTone === "złość"
        ? "W rozmowie pojawia się napięcie. Pisz łagodnie i po ludzku, pomagając się rozluźnić. 🌿"
        : "Rozmowa jest spokojna i neutralna. Odpowiadaj uważnie, po prostu będąc obok.";

    // 🪄 Budowanie wiadomości do modelu
    const apiMessages = [
      { role: "system", content: LAURA_SYSTEM_PROMPT },
      { role: "system", content: moodNote },
      ...(messages || []).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000)
      })),
    ];

    // 💬 Zapytanie do OpenAI GPT-4o-mini
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.85,
      max_tokens: 320
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd zapytania do OpenAI:", err.message);
    res.status(500).json({ reply: "Przepraszam, coś się zakręciło. 💚" });
  }
});

// 🌿 Strona testowa
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => {
  res.send("💚 Laura działa – teraz mówi po ludzku, z sercem i dystansem ☕");
});

app.listen(PORT, () => console.log("Laura-bot działa na porcie " + PORT));
