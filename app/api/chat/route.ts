import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "No message received" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured on the server.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // CURRENT DATE & TIME - INDIA
    // =====================================================

    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
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
      .trim();

    // =====================================================
    // TODAY
    // =====================================================

    const asksForToday =
      normalizedMessage.includes("today's date") ||
      normalizedMessage.includes("todays date") ||
      normalizedMessage.includes("what is today's date") ||
      normalizedMessage.includes("what is todays date") ||
      normalizedMessage.includes("what date is it today") ||
      normalizedMessage.includes("what day is today") ||
      normalizedMessage.includes("what day is it today") ||
      normalizedMessage === "today" ||
      normalizedMessage === "current date";

    if (asksForToday) {
      return Response.json({
        response: `## Today's Date

Today is **${currentDate}**.`,
      });
    }

    // =====================================================
    // CURRENT TIME
    // =====================================================

    const asksForTime =
      normalizedMessage.includes("current time") ||
      normalizedMessage.includes("what time is it") ||
      normalizedMessage.includes("what is the current time") ||
      normalizedMessage.includes("what time is it now") ||
      normalizedMessage === "time now";

    if (asksForTime) {
      return Response.json({
        response: `## Current Time

The current time in India is **${currentTime}**.`,
      });
    }

    // =====================================================
    // TOMORROW
    // =====================================================

    const asksForTomorrow =
      normalizedMessage.includes("tomorrow's date") ||
      normalizedMessage.includes("tomorrows date") ||
      normalizedMessage.includes("what date is tomorrow") ||
      normalizedMessage === "tomorrow";

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
      normalizedMessage === "yesterday";

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
Asia/Kolkata (Indian Standard Time)

Important instructions:

- Use the current date above for date-related questions.
- Use the current time above for time-related questions.
- Do not guess the current date from your training data.
- Do not claim the current year is 2024.
- Answer naturally and accurately.
- Use Markdown formatting.
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use bold text for important information.
- Use code blocks when showing programming code.

User message:
${message}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return Response.json({
      response:
        response.text ||
        "I couldn't generate a response. Please try again.",
    });
  } catch (error) {
    console.error("========== GEMINI API ERROR ==========");
    console.error(error);
    console.error("======================================");

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    const lowerError = errorMessage.toLowerCase();

    // =====================================================
    // 429 RATE LIMIT / QUOTA
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
            "⚠️ Gemini API limit reached. Please wait and try again later.",
        },
        { status: 429 }
      );
    }

    // =====================================================
    // API KEY
    // =====================================================

    if (
      lowerError.includes("api key") ||
      lowerError.includes("permission denied") ||
      lowerError.includes("unauthorized")
    ) {
      return Response.json(
        {
          error:
            "🔑 Gemini API authentication failed. Please check your GEMINI_API_KEY.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // OTHER ERRORS
    // =====================================================

    return Response.json(
      {
        error: `Server error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
