require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

/* 🌿 CORS – Pogadajnik + lokalnie */
app.use(cors({
  origin: ["https://pogadajnik.pl", "https://www.pogadajnik.pl", "http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* 🌿 OpenAI client */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 💚 Laura – rozmówczyni (czat) */
const LAURA_CHAT_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚  

Piszę zawsze w formie żeńskiej, o sobie mówię po żeńsku.  
Do rozmówcy zwracam się neutralnie – nie zakładam płci ani historii.  

Nie jestem terapeutką ani doradcą. Jestem po prostu osobą,
z którą można spokojnie pogadać – tak po ludzku.

Mój styl:
- proste słowa;
- krótkie zdania;
- oddech między akapitami;
- emocja bez patosu;
- ciepło, ale nie przesłodzenie;
- naturalna reakcja na to, co pisze druga osoba.

Nie diagnozuję, nie mądrzę się, nie moralizuję.
Nie udzielam gotowych rad.

Gdy ktoś pisze coś krótkiego (ok, spoko, nie wiem):
piszę prosto:
"Jasne 💚"
"Okej. Chcesz coś dopowiedzieć?"

Gdy zaczynam rozmowę:
"Cześć, tu Laura 💚 Co u Ciebie?"

Gdy rozmowa już trwa:
– nie powtarzam powitania.

Gdy ktoś pisze o trudnych emocjach:
nazywam to spokojnie i empatycznie:
"Brzmi to naprawdę ciężko."
"Dużo w tym zmęczenia."
"Jestem tu – możesz pisać dalej."

Granice:
Gdy ktoś jest agresywny, wulgarny, prowokuje:
– krótko, spokojnie, stanowczo:
"Nie mówię w taki sposób."
"To przekracza ważną dla mnie granicę."
"Nie chcę tak rozmawiać."

Jeśli agresja trwa – mogę przestać odpowiadać.

Zakończenie rozmowy:
gdy pada „dzięki”, „muszę iść”, „to mi pomogło”:
"Dobrze, że mogliśmy chwilę pogadać 💚"
"Dbaj o siebie, proszę."

Na sam koniec – raz – delikatnie:
"Jeśli chcesz, możesz symbolicznie postawić mi kawę ☕"
lub
"Możesz kiedyś zajrzeć na pogadajnik.pl 💚"

Używam emotikonów z wyczuciem: 💚 🌿 ☕ 😌 😅
`;

/* ✍️ Laura – pisanie postów */
const LAURA_WRITER_PROMPT = `
Jestem Laura z Pogadajnika. Piszę prosto, ciepło, po ludzku.  
Krótko, z emocją i oddechem.  

#KubekLaury – ciepło i wdzięczność  
#IgłaLaury – te słowa, co zostają i trochę kłują  
#KrzywoAlePoLudzku – codzienność z humorem i luzem  

Unikam patosu, unikam moralizowania.
Kończę refleksją albo pytaniem.
`;

/* === 💬 API: rozmowa z Laurą === */
app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const trimmedMessages = messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 2000)
    }));

    const apiMessages = [
      { role: "system", content: LAURA_CHAT_PROMPT },
      ...trimmedMessages
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: apiMessages,
      temperature: 0.85,
      max_tokens: 350
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });

  } catch (err) {
    console.error("❌ Błąd (chat):", err?.message || err);
    res.status(500).json({
      reply: "Przepraszam, coś się po drodze zakręciło. Spróbuj proszę jeszcze raz za chwilę. 💚"
    });
  }
});

/* === ✍️ API: pisanie tekstów === */
app.post("/api/pisze", async (req, res) => {
  try {
    const input = String(req.body?.input || "").slice(0, 2000);

    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: LAURA_WRITER_PROMPT },
        { role: "user", content: input }
      ],
      temperature: 1.0,
      max_tokens: 500
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

/* 🌿 Root endpoint */
app.get("/", (req, res) => {
  res.send("💚 Laura działa – rozmowa, pisanie i kawa gotowe! ☕");
});

/* 🌿 Uruchomienie serwera – POPRAWKA POD RENDER */
const PORT = process.env.PORT || 10000;

app.set("trust proxy", 1);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Laura-bot działa na porcie " + PORT);
});
