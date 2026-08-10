import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // =====================================================
    // VALIDATE MESSAGE
    // =====================================================

    if (!message || typeof message !== "string") {
      return Response.json(
        {
          error: "No message received",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // GEMINI API KEY
    // =====================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // INDIA DATE & TIME
    // =====================================================

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

    // =====================================================
    // NORMALIZE MESSAGE
    // =====================================================

    const normalizedMessage = message
      .toLowerCase()
      .trim()
      .replace(/[?!.,]/g, "");

    // =====================================================
    // TODAY
    // =====================================================

    const asksForToday =
      normalizedMessage === "today" ||
      normalizedMessage.includes("today's date") ||
      normalizedMessage.includes("todays date") ||
      normalizedMessage.includes("what is today's date") ||
      normalizedMessage.includes("what is todays date") ||
      normalizedMessage.includes("what date is it today") ||
      normalizedMessage.includes("what day is today") ||
      normalizedMessage.includes("what day is it today") ||
      normalizedMessage === "current date" ||
      normalizedMessage.includes("date today");

    if (asksForToday) {
      return Response.json({
        response: `## Today's Date

Today is **${currentDate}**.

📍 **Timezone:** Asia/Kolkata (IST)`,
      });
    }

    // =====================================================
    // CURRENT TIME
    // =====================================================

    const asksForTime =
      normalizedMessage === "time" ||
      normalizedMessage === "time now" ||
      normalizedMessage.includes("current time") ||
      normalizedMessage.includes("what time is it") ||
      normalizedMessage.includes("what is the current time") ||
      normalizedMessage.includes("what time is it now");

    if (asksForTime) {
      return Response.json({
        response: `## Current Time

The current time in India is **${currentTime}**.

📍 **Timezone:** Asia/Kolkata (IST)`,
      });
    }

    // =====================================================
    // TOMORROW
    // =====================================================

    const asksForTomorrow =
      normalizedMessage.includes("tomorrow's date") ||
      normalizedMessage.includes("tomorrows date") ||
      normalizedMessage.includes("what date is tomorrow") ||
      normalizedMessage === "tomorrow" ||
      normalizedMessage.includes("date tomorrow");

    if (asksForTomorrow) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowDate = dateFormatter.format(tomorrow);

      return Response.json({
        response: `## Tomorrow

Tomorrow is **${tomorrowDate}**.`,
      });
    }

    // =====================================================
    // YESTERDAY
    // =====================================================

    const asksForYesterday =
      normalizedMessage.includes("yesterday's date") ||
      normalizedMessage.includes("yesterdays date") ||
      normalizedMessage.includes("what date was yesterday") ||
      normalizedMessage === "yesterday" ||
      normalizedMessage.includes("date yesterday");

    if (asksForYesterday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayDate = dateFormatter.format(yesterday);

      return Response.json({
        response: `## Yesterday

Yesterday was **${yesterdayDate}**.`,
      });
    }

    // =====================================================
    // GEMINI
    // =====================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are My AI Assistant.

Current date in India:
${currentDate}

Current time in India:
${currentTime}

Timezone:
Asia/Kolkata (IST)

IMPORTANT RULES:

- Use the date and time above for date-related questions.
- Do not assume the current year from your training data.
- Do not give outdated dates such as 2024.
- Answer the user's question naturally.
- Use Markdown formatting for longer answers.
- Use headings when useful.
- Use bullet points for lists.
- Use numbered lists for instructions.
- Use bold text for important information.
- Use code blocks when showing programming code.

User's message:

${message}
`;

    // =====================================================
    // GEMINI MODEL
    // =====================================================

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const answer = response.text;

    if (!answer) {
      return Response.json(
        {
          error:
            "Gemini returned an empty response.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      response: answer,
    });
  } catch (error) {
    console.error("=================================");
    console.error("GEMINI API ERROR");
    console.error(error);
    console.error("=================================");

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    const lowerError = errorMessage.toLowerCase();

    // =====================================================
    // 429 QUOTA / RATE LIMIT
    // =====================================================

    if (
      lowerError.includes("429") ||
      lowerError.includes("too many requests") ||
      lowerError.includes("resource_exhausted") ||
      lowerError.includes("quota") ||
      lowerError.includes("rate limit")
    ) {
      return Response.json(
        {
          error:
            "⚠️ Gemini API quota or rate limit has been reached.",
          details: errorMessage,
        },
        { status: 429 }
      );
    }

    // =====================================================
    // API KEY ERROR
    // =====================================================

    if (
      lowerError.includes("api key") ||
      lowerError.includes("unauthorized") ||
      lowerError.includes("permission denied") ||
      lowerError.includes("forbidden")
    ) {
      return Response.json(
        {
          error:
            "🔑 Gemini API authentication failed. Check your GEMINI_API_KEY in Vercel.",
          details: errorMessage,
        },
        { status: 401 }
      );
    }

    // =====================================================
    // MODEL ERROR
    // =====================================================

    if (
      lowerError.includes("model") &&
      (
        lowerError.includes("not found") ||
        lowerError.includes("unsupported") ||
        lowerError.includes("invalid")
      )
    ) {
      return Response.json(
        {
          error:
            "🤖 The selected Gemini model is unavailable for this API project.",
          details: errorMessage,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // OTHER ERROR
    // =====================================================

    return Response.json(
      {
        error:
          "❌ Gemini could not process your request.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
