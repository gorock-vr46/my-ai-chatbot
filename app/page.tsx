```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // =========================================================
  // CURSOR ANIMATION
  // =========================================================

  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;

    if (!cursor) return;

    const moveCursor = (event: MouseEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };

    window.addEventListener("mousemove", moveCursor);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  // =========================================================
  // LOAD CHAT HISTORY
  // =========================================================

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

  // =========================================================
  // SAVE CHAT HISTORY
  // =========================================================

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

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  async function sendMessage(customMessage?: string) {
    const userMessage = (customMessage ?? input).trim();

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

      // Useful for debugging Vercel/API problems
      console.log("API response:", data);
      console.log("API status:", response.status);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `API request failed with status ${response.status}`
        );
      }

      if (!data?.response) {
        throw new Error(
          "The API returned successfully, but no response was received."
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
      console.error("Chat request failed:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      let assistantMessage =
        `⚠️ **Something went wrong**\n\n${errorMessage}`;

      // =====================================================
      // GEMINI 429 / QUOTA ERROR
      // =====================================================

      if (
        errorMessage.includes("429") ||
        errorMessage
          .toLowerCase()
          .includes("too many requests") ||
        errorMessage
          .toLowerCase()
          .includes("resource_exhausted") ||
        errorMessage.toLowerCase().includes("quota") ||
        errorMessage.toLowerCase().includes("rate limit")
      ) {
        assistantMessage =
          "⚠️ **Gemini API limit reached**\n\n" +
          "The Gemini API has reached its current request or quota limit. " +
          "Please wait a while and try again.";
      }

      // =====================================================
      // API KEY ERROR
      // =====================================================

      if (
        errorMessage
          .toLowerCase()
          .includes("api key") ||
        errorMessage
          .toLowerCase()
          .includes("unauthorized") ||
        errorMessage
          .toLowerCase()
          .includes("permission denied")
      ) {
        assistantMessage =
          "🔑 **Gemini API authentication problem**\n\n" +
          "Please check that your `GEMINI_API_KEY` is correctly configured in Vercel.";
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: assistantMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // ENTER KEY
  // =========================================================

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // =========================================================
  // CLEAR CHAT
  // =========================================================

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  // =========================================================
  // COPY RESPONSE
  // =========================================================

  async function copyMessage(
    content: string,
    index: number
  ) {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex(null);
      }, 1500);
    } catch (error) {
      console.error("Could not copy message:", error);
    }
  }

  // =========================================================
  // QUICK QUESTIONS
  // =========================================================

  const quickQuestions = [
    "What is artificial intelligence?",
    "Give me 5 project ideas",
    "Explain machine learning",
    "What is biotechnology?",
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Animated Cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/60 bg-blue-400/10 shadow-[0_0_20px_rgba(59,130,246,0.45)]"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-6 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              🤖 My AI Assistant
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Powered by Gemini
            </p>
          </div>

          <button
            onClick={clearChat}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
          >
            Clear Chat
          </button>

        </header>

        {/* =================================================
            CHAT AREA
        ================================================= */}

        <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl backdrop-blur">

          {messages.length === 0 && (
            <div className="flex min-h-[500px] items-center justify-center text-center">

              <div className="max-w-xl">

                <div className="mb-5 text-6xl">
                  🤖
                </div>

                <h2 className="text-3xl font-bold">
                  Hello! 👋
                </h2>

                <p className="mt-3 text-slate-400">
                  I'm your AI assistant. Ask me anything and
                  I'll try my best to help you.
                </p>

                {/* Quick Questions */}

                <div className="mt-8 grid gap-3 sm:grid-cols-2">

                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-left text-sm text-slate-300 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-white"
                    >
                      {question}
                    </button>
                  ))}

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              MESSAGES
          ================================================= */}

          <div className="space-y-5">

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
                  className={`group relative max-w-[90%] rounded-2xl px-5 py-4 shadow-lg sm:max-w-[80%] ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-700 bg-slate-800/90 text-slate-100"
                  }`}
                >

                  {/* Message Header */}

                  <div className="mb-2 flex items-center gap-2 text-xs font-medium opacity-70">

                    {message.role === "user" ? (
                      <>
                        <span>👤</span>
                        <span>You</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>My AI</span>
                      </>
                    )}

                  </div>

                  {/* Message Content */}

                  {message.role === "assistant" ? (
                    <div className="prose prose-invert max-w-none text-sm leading-7">

                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                      >
                        {message.content}
                      </ReactMarkdown>

                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                  )}

                  {/* Copy Button */}

                  {message.role === "assistant" && (
                    <button
                      onClick={() =>
                        copyMessage(
                          message.content,
                          index
                        )
                      }
                      className="mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 opacity-0 transition-all duration-200 hover:bg-slate-700 hover:text-white group-hover:opacity-100"
                    >
                      {copiedIndex === index
                        ? "✓ Copied"
                        : "Copy"}
                    </button>
                  )}

                </div>

              </div>

            ))}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
              <div className="flex justify-start">

                <div className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-slate-400">

                  <div className="flex items-center gap-2">

                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />

                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{
                        animationDelay: "150ms",
                      }}
                    />

                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{
                        animationDelay: "300ms",
                      }}
                    />

                    <span className="ml-2 text-sm">
                      AI is thinking...
                    </span>

                  </div>

                </div>

              </div>
            )}

            <div ref={chatEndRef} />

          </div>

        </section>

        {/* =================================================
            INPUT
        ================================================= */}

        <div className="mt-4">

          <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl">

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
              onClick={() => sendMessage()}
              disabled={
                loading ||
                !input.trim()
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium transition-all duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
```
