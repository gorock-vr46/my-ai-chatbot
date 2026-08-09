"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    setMessages((oldMessages) => [
      ...oldMessages,
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
        throw new Error(data.error);
      }

      setMessages((oldMessages) => [
        ...oldMessages,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      setMessages((oldMessages) => [
        ...oldMessages,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              🤖 My AI Chatbot
            </h1>

            <p className="mt-1 text-slate-400">
              Your personal AI assistant
            </p>
          </div>

          <button
            onClick={clearChat}
            className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
          >
            Clear
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">

          {messages.length === 0 && (
            <div className="flex min-h-[500px] items-center justify-center text-center">
              <div>
                <div className="text-6xl">🤖</div>

                <h2 className="mt-4 text-2xl font-semibold">
                  Hello! 👋
                </h2>

                <p className="mt-2 text-slate-400">
                  Ask me anything.
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600"
                    : "bg-slate-800"
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
                AI is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 resize-none bg-transparent px-3 py-3 outline-none"
              rows={1}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>

          </div>

          <p className="mt-2 text-center text-xs text-slate-500">
            Press Enter to send
          </p>
        </div>

      </div>
    </main>
  );
}