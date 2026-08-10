import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return Response.json(
        { error: "No message received" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // =========================================================
    // CURRENT DATE & TIME - INDIA
    // =========================================================

    const timeZone = "Asia/Kolkata";

    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const currentDate = dateFormatter.format(now);
    const currentTime = timeFormatter.format(now);

    // =========================================================
    // NORMALIZE USER MESSAGE
    // =========================================================

    const normalizedMessage = message
      .toLowerCase()
      .trim()
      .replace(/[?!.,]/g, "");

    // =========================================================
    // DATE / TIME QUESTIONS
    // Handle these directly instead of asking Gemini.
    // =========================================================

    const dateQuestions = [
      "what is today's date",
      "what is todays date",
      "what date is it today",
      "what day is today",
      "what day is it today",
      "today's date",
      "todays date",
      "today date",
      "current date",
      "date today",
      "today",
    ];

    const timeQuestions = [
      "what time is it",
      "what is the current time",
      "what time is it now",
      "current time",
      "time now",
      "what is the time",
    ];

    const tomorrowQuestions = [
      "what is tomorrow's date",
      "what is tomorrows date",
      "what date is tomorrow",
      "tomorrow date",
      "date tomorrow",
    ];

    const yesterdayQuestions = [
      "what was yesterday's date",
      "what was yesterdays date",
      "what date was yesterday",
      "yesterday date",
      "date yesterday",
    ];

    // Check for current date
    if (dateQuestions.includes(normalizedMessage)) {
      return Response.json({
        response: `Today is ${currentDate}.`,
      });
    }

    // Check for current time
    if (timeQuestions.includes(normalizedMessage)) {
      return Response.json({
        response: `The current time in India is ${currentTime}.`,
      });
    }

    // =========================================================
    // TOMORROW
    // =========================================================

    if (tomorrowQuestions.includes(normalizedMessage)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowDate = dateFormatter.format(tomorrow);

      return Response.json({
        response: `Tomorrow is ${tomorrowDate}.`,
      });
    }

    // =========================================================
    // YESTERDAY
    // =========================================================

    if (yesterdayQuestions.includes(normalizedMessage)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayDate = dateFormatter.format(yesterday);

      return Response.json({
        response: `Yesterday was ${yesterdayDate}.`,
      });
    }

    // =========================================================
    // GEMINI AI
    // =========================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    const systemInstruction = `
You are My AI Assistant.

Current date:
${currentDate}

Current time in India:
${currentTime}

Timezone:
Asia/Kolkata (Indian Standard Time)

Important instructions:

- The current date above is authoritative.
- The current time above is authoritative.
- If the user asks a date-related question, use the supplied current date.
- If the user asks about today's date, do not guess from your training data.
- If the user asks about the current time, use the supplied current time.
- Do not claim that the current year is 2024 or any previous year unless the supplied date actually says so.
- For normal questions, answer naturally and helpfully.
- Format your answers using Markdown when appropriate.
- Use headings for longer explanations.
- Use bullet points or numbered lists when useful.
- Use code blocks when showing programming code.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}

User's message:
${message}`,
            },
          ],
        },
      ],
    });

    return Response.json({
      response: response.text,
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return Response.json(
      {
        error: "Failed to get response from Gemini",
      },
      { status: 500 }
    );
  }
}
