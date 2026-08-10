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

  // ==================================================
  // CURSOR POSITION
  // ==================================================

  const cursorX = useRef(0);
  const cursorY = useRef(0);

  // Animated cursor elements
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorGlowRef = useRef<HTMLDivElement | null>(null);
  const cursorTrailRef = useRef<HTMLDivElement | null>(null);

  // Animation values
  const animatedX = useRef(0);
  const animatedY = useRef(0);

  // ==================================================
  // LOAD PREVIOUS CHAT
  // ==================================================

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

  // ==================================================
  // SMOOTH CURSOR ANIMATION
  // ==================================================

  useEffect(() => {
    let animationFrame: number;

    const handleMouseMove = (event: MouseEvent) => {
      cursorX.current = event.clientX;
      cursorY.current = event.clientY;
    };

    const animateCursor = () => {
      animatedX.current +=
        (cursorX.current - animatedX.current) * 0.25;

      animatedY.current +=
        (cursorY.current - animatedY.current) * 0.25;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(
          ${cursorX.current}px,
          ${cursorY.current}px,
          0
        ) translate(-50%, -50%)`;
      }

      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate3d(
          ${animatedX.current}px,
          ${animatedY.current}px,
          0
        ) translate(-50%, -50%)`;
      }

      if (cursorTrailRef.current) {
        const trailX =
          animatedX.current +
          (cursorX.current - animatedX.current) * 0.15;

        const trailY =
          animatedY.current +
          (cursorY.current - animatedY.current) * 0.15;

        cursorTrailRef.current.style.transform = `translate3d(
          ${trailX}px,
          ${trailY}px,
          0
        ) translate(-50%, -50%)`;
      }

      animationFrame = requestAnimationFrame(animateCursor);
    };

    window.addEventListener("mousemove", handleMouseMove);

    animationFrame = requestAnimationFrame(animateCursor);

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // ==================================================
  // SAVE CHAT
  // ==================================================

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

  // ==================================================
  // SEND MESSAGE
  // ==================================================

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

      // Safely read response
      let data: {
        response?: string;
        error?: string;
        details?: string;
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned status ${response.status}`
        );
      }

      // ==================================================
      // SERVER ERROR
      // ==================================================

      if (!response.ok) {
        const serverError =
          data.error ||
          data.details ||
          `Request failed with status ${response.status}`;

        const error = new Error(serverError);

        // Attach HTTP status for easier detection
        (
          error as Error & { status?: number }
        ).status = response.status;

        throw error;
      }

      // ==================================================
      // SUCCESS
      // ==================================================

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            data.response ||
            "I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("Chat request error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      const status =
        error &&
        typeof error === "object" &&
        "status" in error
          ? (error as { status?: number }).status
          : undefined;

      const lowerError = errorMessage.toLowerCase();

      let assistantMessage =
        "⚠️ **Something went wrong**\n\n" +
        "I couldn't process your request right now. Please try again.";

      // ==================================================
      // 429 - GEMINI QUOTA / RATE LIMIT
      // ==================================================

      if (
        status === 429 ||
        errorMessage.includes("429") ||
        lowerError.includes("resource_exhausted") ||
        lowerError.includes("quota") ||
        lowerError.includes("rate limit") ||
        lowerError.includes("too many requests")
      ) {
        assistantMessage =
          "⚠️ **Gemini API limit reached**\n\n" +
          "The Gemini API quota or rate limit has been reached for your API key.\n\n" +
          "Your chatbot itself is working correctly. Please wait for the quota to reset or use another available Gemini API key/model.";
      }

      // ==================================================
      // 401 - API KEY
      // ==================================================

      else if (
        status === 401 ||
        errorMessage.includes("401") ||
        lowerError.includes("api key") ||
        lowerError.includes("authentication") ||
        lowerError.includes("unauthorized")
      ) {
        assistantMessage =
          "🔑 **Gemini API authentication error**\n\n" +
          "The Gemini API key could not be authenticated. Please check your `GEMINI_API_KEY` environment variable in Vercel.";
      }

      // ==================================================
      // 403 - PERMISSION
      // ==================================================

      else if (
        status === 403 ||
        errorMessage.includes("403") ||
        lowerError.includes("permission denied") ||
        lowerError.includes("forbidden")
      ) {
        assistantMessage =
          "🔒 **Gemini API permission error**\n\n" +
          "Your API key does not currently have permission to use this Gemini API/model.";
      }

      // ==================================================
      // 404 - MODEL NOT FOUND
      // ==================================================

      else if (
        status === 404 ||
        errorMessage.includes("404") ||
        lowerError.includes("model not found") ||
        lowerError.includes("not found")
      ) {
        assistantMessage =
          "🤖 **Gemini model unavailable**\n\n" +
          "The Gemini model configured in your `route.ts` was not found or is not available for this API project.\n\n" +
          "Check the model name in `app/api/chat/route.ts`.";
      }

      // ==================================================
      // 500 - SERVER ERROR
      // ==================================================

      else if (
        status === 500 ||
        errorMessage.includes("500")
      ) {
        assistantMessage =
          "⚠️ **Server error**\n\n" +
          "The chatbot server encountered an error while processing your request. Please check the Vercel deployment logs.";
      }

      // ==================================================
      // NETWORK ERROR
      // ==================================================

      else if (
        lowerError.includes("failed to fetch") ||
        lowerError.includes("network error")
      ) {
        assistantMessage =
          "🌐 **Connection problem**\n\n" +
          "I couldn't connect to the chatbot server. Please check your internet connection and try again.";
      }

      // ==================================================
      // DISPLAY ERROR
      // ==================================================

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

  // ==================================================
  // ENTER KEY
  // ==================================================

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  // ==================================================
  // CLEAR CHAT
  // ==================================================

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  // ==================================================
  // COPY MESSAGE
  // ==================================================

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

  // ==================================================
  // SUGGESTIONS
  // ==================================================

  const suggestions = [
    "Explain artificial intelligence simply",
    "Help me write a professional resume",
    "Give me project ideas for students",
    "Explain how Gemini API works",
  ];

  return (
    <main className="min-h-screen bg-[#070b14] text-white">

      {/* ================================================== */}
      {/* CUSTOM CURSOR                                      */}
      {/* ================================================== */}

      <div
        ref={cursorTrailRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-28 w-28 rounded-full bg-violet-500/10 blur-3xl md:block"
        style={{
          willChange: "transform",
        }}
      />

      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-44 w-44 rounded-full bg-blue-500/10 blur-3xl md:block"
        style={{
          willChange: "transform",
        }}
      />

      <div
        ref={cursorDotRef}
        className="pointer-events-none fixed left-0 top-0 z-[10000] hidden h-2.5 w-2.5 rounded-full bg-blue-300 shadow-[0_0_18px_6px_rgba(59,130,246,0.45)] md:block"
        style={{
          willChange: "transform",
        }}
      />

      {/* ================================================== */}
      {/* BACKGROUND EFFECTS                                 */}
      {/* ================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />

        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.02] blur-[100px]" />
      </div>

      {/* ================================================== */}
      {/* MAIN CONTAINER                                     */}
      {/* ================================================== */}

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">

        {/* ================================================== */}
        {/* HEADER                                              */}
        {/* ================================================== */}

        <header className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">

          <div className="flex items-center gap-3">

            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl shadow-lg shadow-blue-500/20">

              <div className="absolute inset-0 rounded-2xl bg-blue-400/20 blur-md" />

              <span className="relative">
                ✨
              </span>

            </div>

            <div>
              <div className="flex items-center gap-2">

                <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                  My AI Assistant
                </h1>

                <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 sm:inline-block">
                  ONLINE
                </span>

              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">

                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                Powered by Gemini

              </div>
            </div>

          </div>

          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>

            <span className="hidden sm:inline">
              Clear
            </span>

          </button>

        </header>

        {/* ================================================== */}
        {/* CHAT AREA                                          */}
        {/* ================================================== */}

        <section className="flex-1 overflow-y-auto pb-4">

          {messages.length === 0 ? (

            <div className="flex min-h-[65vh] items-center justify-center px-2">

              <div className="w-full max-w-2xl text-center">

                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">

                  <div className="absolute inset-0 animate-pulse rounded-3xl bg-blue-500/20 blur-xl" />

                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-4xl shadow-2xl">
                    🤖
                  </div>

                </div>

                <p className="mb-2 text-sm font-medium tracking-wide text-blue-400">
                  YOUR PERSONAL AI ASSISTANT
                </p>

                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">

                  How can I help you

                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    {" "}today?
                  </span>

                </h2>

                <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
                  Ask questions, learn new concepts, generate ideas,
                  write content, or get help with your projects.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">

                  {suggestions.map((suggestion) => (

                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-blue-500/[0.06] hover:shadow-lg hover:shadow-blue-500/5"
                    >

                      <div className="mb-2 text-sm text-blue-400 transition-transform duration-200 group-hover:translate-x-1">
                        ✦
                      </div>

                      <p className="text-sm text-slate-300 transition group-hover:text-white">
                        {suggestion}
                      </p>

                    </button>

                  ))}

                </div>

              </div>

            </div>

          ) : (

            <div className="mx-auto max-w-4xl space-y-6 py-6">

              {messages.map((message, index) => (

                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  {/* AI Avatar */}

                  {message.role === "assistant" && (

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm shadow-lg shadow-blue-500/10">
                      ✨
                    </div>

                  )}

                  <div
                    className={`group max-w-[88%] sm:max-w-[78%] ${
                      message.role === "user"
                        ? "items-end"
                        : "items-start"
                    }`}
                  >

                    {/* ================================================== */}
                    {/* FORMATTED MESSAGE                                  */}
                    {/* ================================================== */}

                    <div
                      className={`rounded-2xl px-4 py-3.5 text-sm leading-7 shadow-lg transition-all duration-200 ${
                        message.role === "user"
                          ? "rounded-br-md bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-900/20"
                          : "rounded-bl-md border border-white/10 bg-white/[0.05] text-slate-200 hover:border-white/15 hover:bg-white/[0.07]"
                      }`}
                    >

                      {message.role === "assistant" ? (

                        <div className="ai-response">

                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => (
                                <h1 className="mb-4 mt-2 text-2xl font-bold tracking-tight text-white">
                                  {children}
                                </h1>
                              ),

                              h2: ({ children }) => (
                                <h2 className="mb-3 mt-5 text-xl font-bold tracking-tight text-white">
                                  {children}
                                </h2>
                              ),

                              h3: ({ children }) => (
                                <h3 className="mb-2 mt-4 text-lg font-semibold text-blue-300">
                                  {children}
                                </h3>
                              ),

                              h4: ({ children }) => (
                                <h4 className="mb-2 mt-3 text-base font-semibold text-slate-200">
                                  {children}
                                </h4>
                              ),

                              p: ({ children }) => (
                                <p className="mb-4 last:mb-0 leading-7 text-slate-200">
                                  {children}
                                </p>
                              ),

                              strong: ({ children }) => (
                                <strong className="font-semibold text-white">
                                  {children}
                                </strong>
                              ),

                              em: ({ children }) => (
                                <em className="text-slate-300">
                                  {children}
                                </em>
                              ),

                              ul: ({ children }) => (
                                <ul className="mb-4 ml-5 list-disc space-y-2 text-slate-200 marker:text-blue-400">
                                  {children}
                                </ul>
                              ),

                              ol: ({ children }) => (
                                <ol className="mb-4 ml-5 list-decimal space-y-2 text-slate-200 marker:font-semibold marker:text-blue-400">
                                  {children}
                                </ol>
                              ),

                              li: ({ children }) => (
                                <li className="pl-1 leading-7">
                                  {children}
                                </li>
                              ),

                              blockquote: ({ children }) => (
                                <blockquote className="my-4 border-l-4 border-blue-500/60 bg-blue-500/[0.05] px-4 py-3 italic text-slate-300">
                                  {children}
                                </blockquote>
                              ),

                              hr: () => (
                                <hr className="my-5 border-white/10" />
                              ),

                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-400 underline decoration-blue-400/30 underline-offset-4 transition hover:text-blue-300"
                                >
                                  {children}
                                </a>
                              ),

                              code: ({
                                children,
                                className,
                              }) => {
                                const isBlock =
                                  className?.includes(
                                    "language-"
                                  );

                                if (isBlock) {
                                  return (
                                    <code
                                      className={`${className ?? ""} block whitespace-pre-wrap break-words text-sm leading-6 text-slate-200`}
                                    >
                                      {children}
                                    </code>
                                  );
                                }

                                return (
                                  <code className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[0.9em] text-blue-300">
                                    {children}
                                  </code>
                                );
                              },

                              pre: ({ children }) => (
                                <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#050810] shadow-lg">

                                  <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-2">

                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />

                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />

                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />

                                    <span className="ml-2 text-[10px] text-slate-500">
                                      CODE
                                    </span>

                                  </div>

                                  <pre className="overflow-x-auto p-4 text-sm leading-6">
                                    {children}
                                  </pre>

                                </div>
                              ),

                              table: ({ children }) => (
                                <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
                                  <table className="w-full border-collapse text-left text-sm">
                                    {children}
                                  </table>
                                </div>
                              ),

                              thead: ({ children }) => (
                                <thead className="bg-white/[0.06] text-white">
                                  {children}
                                </thead>
                              ),

                              tbody: ({ children }) => (
                                <tbody className="divide-y divide-white/10">
                                  {children}
                                </tbody>
                              ),

                              tr: ({ children }) => (
                                <tr className="transition hover:bg-white/[0.03]">
                                  {children}
                                </tr>
                              ),

                              th: ({ children }) => (
                                <th className="border-r border-white/10 px-4 py-3 font-semibold last:border-r-0">
                                  {children}
                                </th>
                              ),

                              td: ({ children }) => (
                                <td className="border-r border-white/10 px-4 py-3 text-slate-300 last:border-r-0">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>

                        </div>

                      ) : (

                        <p className="whitespace-pre-wrap break-words leading-7">
                          {message.content}
                        </p>

                      )}

                    </div>

                    {/* AI ACTIONS */}

                    {message.role === "assistant" && (

                      <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">

                        <button
                          onClick={() =>
                            copyMessage(
                              message.content,
                              index
                            )
                          }
                          className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                        >
                          {copiedIndex === index
                            ? "✓ Copied"
                            : "Copy"}
                        </button>

                      </div>

                    )}

                  </div>

                  {/* USER AVATAR */}

                  {message.role === "user" && (

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm">
                      👤
                    </div>

                  )}

                </div>

              ))}

              {/* ================================================== */}
              {/* LOADING                                             */}
              {/* ================================================== */}

              {loading && (

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm">
                    ✨
                  </div>

                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-5 py-4">

                    <div className="flex items-center gap-1.5">

                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />

                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />

                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />

                    </div>

                  </div>

                </div>

              )}

            </div>

          )}

        </section>

        {/* ================================================== */}
        {/* INPUT AREA                                         */}
        {/* ================================================== */}

        <div className="sticky bottom-0 mx-auto w-full max-w-4xl bg-[#070b14]/80 pb-3 pt-2 backdrop-blur-xl">

          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/30 transition-all duration-200 focus-within:border-blue-500/30 focus-within:ring-1 focus-within:ring-blue-500/20">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Message My AI Assistant..."
              rows={1}
              disabled={loading}
              className="min-h-[52px] w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-105 hover:from-blue-500 hover:to-violet-500 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
            >

              {loading ? (

                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.3"
                  />

                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

              ) : (

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>

              )}

            </button>

          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-600">

            <span>Enter to send</span>

            <span>•</span>

            <span>Shift + Enter for new line</span>

            <span>•</span>

            <span>Gemini AI</span>

          </div>

        </div>

      </div>

    </main>
  );
}
