import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // =========================================================
    // VALIDATE MESSAGE
    // =========================================================

    if (!message || typeof message !== "string") {
      return Response.json(
        {
          error: "No message received",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // API KEY
    // =========================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Please add it to your environment variables.",
        },
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
    // NORMALIZE MESSAGE
    // =========================================================

    const normalizedMessage = message
      .toLowerCase()
      .trim()
      .replace(/[?!.,]/g, "");

    // =========================================================
    // TODAY
    // =========================================================

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

📍 Timezone: **India Standard Time (IST)**`,
      });
    }

    // =========================================================
    // CURRENT TIME
    // =========================================================

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

📍 Timezone: **Asia/Kolkata (IST)**`,
      });
    }

    // =========================================================
    // TOMORROW
    // =========================================================

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

    // =========================================================
    // YESTERDAY
    // =========================================================

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

    // =========================================================
    // GEMINI AI
    // =========================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are My AI Assistant.

CURRENT DATE AND TIME:

Current date in India: ${currentDate}
Current time in India: ${currentTime}
Timezone: Asia/Kolkata (IST)

IMPORTANT RULES:

- Use the current date and time above for date-related questions.
- Do not assume the current year from your training data.
- Do not say the current date is 2024 or another outdated date.
- Answer naturally and accurately.
- For longer answers, use Markdown formatting.
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use bold text for important information.
- Use code blocks when showing programming code.
- Keep answers clear and useful.

USER MESSAGE:

${message}
`;

    // =========================================================
    // MODEL
    // =========================================================

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    return Response.json({
      response:
        response.text ||
        "Sorry, I couldn't generate a response. Please try again.",
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    // =========================================================
    // GET ACTUAL ERROR
    // =========================================================

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    const lowerError = errorMessage.toLowerCase();

    // =========================================================
    // RATE LIMIT / QUOTA
    // =========================================================

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
            "⚠️ Gemini API quota/rate limit reached. The current Gemini model is not accepting more requests for this project right now. Please check your Gemini API usage and rate limits.",
          details: errorMessage,
        },
        { status: 429 }
      );
    }

    // =========================================================
    // API KEY / AUTHENTICATION
    // =========================================================

    if (
      lowerError.includes("api key") ||
      lowerError.includes("permission denied") ||
      lowerError.includes("unauthorized") ||
      lowerError.includes("forbidden")
    ) {
      return Response.json(
        {
          error:
            "🔑 Gemini API authentication failed. Please check your GEMINI_API_KEY and Google AI Studio project.",
          details: errorMessage,
        },
        { status: 401 }
      );
    }

    // =========================================================
    // MODEL ERROR
    // =========================================================

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

    // =========================================================
    // GENERAL ERROR
    // =========================================================

    return Response.json(
      {
        error:
          "❌ Gemini could not process your request right now.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
```
