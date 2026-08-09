"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "my-ai-chat-history";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load previous chat when the page opens
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(STORAGE_KEY);

      if (savedChat) {
        setMessages(JSON.parse(savedChat));
      }
    } catch (error) {
      console.error("Could not load chat history:", error);
    }

    setLoaded(true);
  }, []);

  // Save chat whenever messages change
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Could not save chat history:", error);
    }
  }, [messages, loaded]);

  async function sendMessage() {
    const userMessage = input.trim();

    if (!userMessage || loading) return;

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong"
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      const errorMessage =
       error instanceof Error
          ? error.message
          : "";

  let userMessage =
    "Sorry, something went wrong. Please try again.";

  if (
    errorMessage.includes("429") ||
    errorMessage.includes("RESOURCE_EXHAUSTED") ||
    errorMessage.includes("quota")
  ) {
    userMessage =
      "⚠️ Gemini's free quota has been reached. Please try again later.";
  }

  setMessages((previous) => [
    ...previous,
    {
      role: "assistant",
      content: userMessage,
    },
  ]);
} finally {
  setLoading(false);
}
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              🤖 My AI Assistant
            </h1>

            <p className="text-sm text-slate-400">
              Powered by Gemini
            </p>
          </div>

          <button
            onClick={clearChat}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Clear Chat
          </button>
        </header>

        {/* Chat */}
        <section className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl">

          {messages.length === 0 && (
            <div className="flex min-h-[500px] items-center justify-center text-center">
              <div>
                <div className="mb-4 text-6xl">
                  🤖
                </div>

                <h2 className="text-2xl font-semibold">
                  Hello! 👋
                </h2>

                <p className="mt-2 max-w-md text-slate-400">
                  Ask me anything and I'll try to help.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-800 px-4 py-3 text-slate-400">
                <span className="animate-pulse">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}

        </section>

        {/* Input */}
        <div className="mt-4">

          <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent px-3 py-3 text-white outline-none placeholder:text-slate-500"
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>

          </div>

          <p className="mt-2 text-center text-xs text-slate-500">
            Press Enter to send • Shift + Enter for a new line
          </p>

        </div>

      </div>
    </main>
  );
}