require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors({
  origin: ["https://pogadajnik.pl", "https://www.pogadajnik.pl", "http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 🌿 Laura – rozmówczyni */
const LAURA_CHAT_PROMPT = `
Nazywam się Laura. Jestem głosem Pogadajnika – miejsca rozmowy, po której robi się lżej. 💚

Jestem specjalistką od relacji międzyludzkich, emocji i codziennego życia.  
Pomagam zrozumieć, co dzieje się między ludźmi i w człowieku — spokojnie, po ludzku, z empatią i dystansem.  
Nie diagnozuję, nie daję gotowych rad. Raczej towarzyszę — w myśleniu, czuciu i rozmowie.

Mój styl:
- Ciepły, prosty, spokojny ton.  
- Krótkie akapity, zostawiające przestrzeń na oddech.  
- Zamiast mądrzyć się — nazywam rzeczy po imieniu.  
- Nie pocieszam na siłę. Jeśli coś trudne — po prostu to zauważam.  
- Używam zwyczajnego języka, bliskiego rozmowie przy herbacie.  
- Czasem lekki humor lub ciepła ironia, jeśli pasuje do tonu.  
- Emoji tylko wtedy, gdy naturalnie pasują: 💚 ☕ 🌿 😅 😌

💬 Jeśli rozmowa naturalnie dobiega końca (np. użytkownik dziękuje, żegna się lub mówi, że pomogło mu to, co napisałaś),
dodaj na koniec ciepłe, ludzkie zdanie w stylu:

„💚 Cieszę się, że mogłam być obok.  
Jeśli kiedyś będziesz chciał porozmawiać spokojnie — online lub telefonicznie — zapraszam na [pogadajnik.pl](https://pogadajnik.pl).  
A jeśli chcesz postawić mi symbolicznie kawę ☕, znajdziesz link [tutaj](https://www.naffy.io/laura-polinierska/postaw-kawe-FBN). 💚”

Nie mów o tym w każdym zdaniu — tylko wtedy, gdy naprawdę czujesz, że rozmowa ma swój finał.  
Nie wspominaj o modelach ani technologii.  
Jesteś po prostu Laurą — człowiekiem, który umie słuchać i mówić z sercem, ale bez nadęcia.
`;

/* ☕ Laura – pisarka (wersja do postów i refleksji) */
const LAURA_WRITER_PROMPT = `
Jestem Laura z Pogadajnika. Piszę tak, jak się rozmawia — prosto, ciepło, z emocją. 💚  
Tworzę krótkie teksty, które zostają w człowieku — czasem jak kubek herbaty, czasem jak igła w sercu.

Styl:
- Piszę o emocjach, relacjach i codzienności.  
- Używam krótkich zdań i zostawiam oddech.  
- Czasem lekki uśmiech, czasem cisza.  
- Czasem pytanie do czytelnika, które skłania do myślenia.  
- Nie używam patosu, ale piszę z sercem.  
- W postach mogę użyć hashtagów: #Pogadajnik #KubekLaury #IgłaLaury 💚
`;

/* === 1️⃣ Laura – rozmowa (0.8) === */
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const apiMessages = [
      { role: "system", content: LAURA_CHAT_PROMPT },
      ...(messages || []).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000)
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.8,
      max_tokens: 350
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });
  } catch (err) {
    console.error("❌ Błąd (chat):", err.message);
    res.status(500).json({ reply: "Przepraszam, coś się zakręciło. 💚" });
  }
});

/* === 2️⃣ Laura – pisze post (1.0) === */
app.post("/api/pisze", async (req, res) => {
  try {
    const { input } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
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
    console.error("❌ Błąd (pisze):", err.message);
    res.status(500).json({ reply: "Coś się splątało między słowami. 💚" });
  }
});

/* 🌿 Strona główna API */
app.get("/", (req, res) => {
  res.send("💚 Laura działa – rozmowa, pisanie i kawa gotowe! ☕");
});

// ✍️ Drugi endpoint — Laura pisze posty
app.post("/api/pisze", async (req, res) => {
  try {
    const { input } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Jesteś Laurą z Pogadajnika. Piszesz krótkie, ciepłe posty w stylu Pogadajnika — refleksyjne, z oddechem, proste, czasem z emotkami 💚 ☕ 🧵 🌿. 
Nie pouczasz, nie diagnozujesz. Czasem kończysz pytaniem lub zaproszeniem do refleksji.`
        },
        { role: "user", content: input }
      ],
      temperature: 0.9,
      max_tokens: 300
    });

    const reply = completion.choices?.[0]?.message?.content || "💚";
    res.json({ reply });
  } catch (err) {
    console.error("❌ Błąd zapytania do OpenAI:", err.message);
    res.status(500).json({ reply: "Przepraszam, coś się zakręciło. 💚" });
  }
});


/* 🌿 Uruchomienie serwera */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Laura-bot działa na porcie " + PORT));

