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
        { error: "GEMINI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    // Try the request up to 3 times
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: message,
        });

        return Response.json({
          response:
            result.text || "Gemini returned an empty response.",
        });
      } catch (error) {
        lastError = error;

        console.log(
          `Gemini attempt ${attempt} failed:`,
          error
        );

        // Wait before trying again
        if (attempt < 3) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1500 * attempt)
          );
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error("Gemini error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini API request failed.",
      },
      { status: 500 }
    );
  }
}