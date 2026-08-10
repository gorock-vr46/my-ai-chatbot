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

    // India Standard Time
    const timeZone = "Asia/Kolkata";

    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const currentDate = dateFormatter.format(now);
    const currentTime = timeFormatter.format(now);

    // Normalize the user's question
    const normalizedMessage = message
      .toLowerCase()
      .trim()
      .replace(/[?!.,]/g, "");

    // =====================================================
    // DATE QUESTIONS
    // =====================================================

    const asksForToday =
      normalizedMessage.includes("today's date") ||
      normalizedMessage.includes("todays date") ||
      normalizedMessage.includes("what is today's date") ||
      normalizedMessage.includes("what is todays date") ||
      normalizedMessage.includes("what date is it today") ||
      normalizedMessage.includes("what day is today") ||
      normalizedMessage.includes("what day is it today") ||
      normalizedMessage === "today";

    if (asksForToday) {
      return Response.json({
        response: `Today is **${currentDate}**.`,
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
      normalizedMessage.includes("time now");

    if (asksForTime) {
      return Response.json({
        response: `The current time in India is **${currentTime}**.`,
      });
    }

    // =====================================================
    // TOMORROW
    // =====================================================

    const asksForTomorrow =
      normalizedMessage.includes("tomorrow's date") ||
      normalizedMessage.includes("tomorrows date") ||
      normalizedMessage.includes("what date is tomorrow") ||
      normalizedMessage.includes("date tomorrow");

    if (asksForTomorrow) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowDate = dateFormatter.format(tomorrow);

      return Response.json({
        response: `Tomorrow is **${tomorrowDate}**.`,
      });
    }

    // =====================================================
    // YESTERDAY
    // =====================================================

    const asksForYesterday =
      normalizedMessage.includes("yesterday's date") ||
      normalizedMessage.includes("yesterdays date") ||
      normalizedMessage.includes("what date was yesterday") ||
      normalizedMessage.includes("date yesterday");

    if (asksForYesterday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayDate = dateFormatter.format(yesterday);

      return Response.json({
        response: `Yesterday was **${yesterdayDate}**.`,
      });
    }

    // =====================================================
    // GEMINI
    // =====================================================

    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const prompt = `
You are My AI Assistant.

The current date in India is:
${currentDate}

The current time in India is:
${currentTime}

Timezone: Asia/Kolkata (IST)

Use the date and time above when answering date-related questions.

User's message:
${message}

Answer the user's question clearly and helpfully.

For longer answers, use Markdown formatting:
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use bold text for important information.
- Use code blocks for programming code.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return Response.json({
      response: response.text,
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get response from Gemini",
      },
      { status: 500 }
    );
  }
}
