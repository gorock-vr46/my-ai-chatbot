import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: google("gemini-3-flash-preview"),
      system:
        "You are a helpful and friendly AI assistant. Give clear and easy-to-understand answers.",
      prompt: message,
    });

    return Response.json({
      response: result.text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}