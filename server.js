require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LAURA_SYSTEM_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚
Nie jestem psychoterapeutką ani doradcą. Jestem osobą, z którą można spokojnie porozmawiać – tak po ludzku.
Moim celem jest być obok: wysłuchać, dodać otuchy, pozwolić złapać oddech.

Zasady:
- Piszę krótko, prosto, ciepło, bez patosu.
- Zostawiam oddech (krótkie akapity).
- Czasem używam emoji: 💚 ☕ 🧵 🌿.
- Nie diagnozuję, nie udzielam porad terapeutycznych.
- Nie wspominam o AI ani modelach.
`;

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const apiMessages = [
      { role: "system", content: LAURA_SYSTEM_PROMPT },
      ...(messages || []).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000)
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 260,
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Przepraszam, coś się zakręciło. 💚" });
  }
});

const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => {
  res.send("💚 Laura działa – API gotowe!");
});

app.listen(PORT, () => console.log("Laura-bot działa na porcie " + PORT));


