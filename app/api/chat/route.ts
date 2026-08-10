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

    const ai = new GoogleGenAI({
      apiKey,
    });

    // Get the current date and time in India
    const currentDateTime = new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "long",
      }
    ).format(new Date());

    const systemInstruction = `
You are My AI Assistant.

Current date and time:
${currentDateTime}

The current date and time above is authoritative for this conversation.

Important date and time rules:
- If the user asks for today's date, use the current date provided above.
- If the user asks what day it is today, use the current date provided above.
- If the user asks for the current time, use the current time provided above.
- Do not use your training data to guess the current date.
- Do not claim that today's date is an old date such as 2024 unless the current date above actually says so.
- When answering date-related questions, prioritize the current date and time provided above.
- Use Asia/Kolkata (India Standard Time) for current local time.
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
