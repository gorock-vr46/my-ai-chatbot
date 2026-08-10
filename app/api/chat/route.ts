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

    // =====================================================
    // CURRENT DATE AND TIME - INDIA
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
    // DATE/TIME QUESTIONS
    // =====================================================

    const text = message.toLowerCase().trim();

    if (
      text.includes("today's date") ||
      text.includes("todays date") ||
      text.includes("what date is it today") ||
      text.includes("what day is today") ||
      text === "today"
    ) {
      return Response.json({
        response: `Today is **${currentDate}**.`,
      });
    }

    if (
      text.includes("current time") ||
      text.includes("what time is it") ||
      text.includes("time now")
    ) {
      return Response.json({
        response: `The current time in India is **${currentTime}**.`,
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

Current date in India:
${currentDate}

Current time in India:
${currentTime}

Timezone: Asia/Kolkata.

Answer the user's question clearly and helpfully.

Use Markdown formatting when useful:
- Headings
- Bullet points
- Numbered lists
- Bold text
- Code blocks

User question:
${message}
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
            : "Failed to get Gemini response",
      },
      { status: 500 }
    );
  }
}
