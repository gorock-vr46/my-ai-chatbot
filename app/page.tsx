"use client";

import { useEffect, useRef, useState } from "react";

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

  // Cursor position
  const cursorX = useRef(0);
  const cursorY = useRef(0);

  // Animated cursor positions
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const cursorTrailRef = useRef<HTMLDivElement>(null);

  // Animation values
  const animatedX = useRef(0);
  const animatedY = useRef(0);

  // Load previous chat
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

  // Smooth cursor animation
  useEffect(() => {
    let animationFrame: number;

    const handleMouseMove = (event: MouseEvent) => {
      cursorX.current = event.clientX;
      cursorY.current = event.clientY;
    };

    const animateCursor = () => {
      // Fast cursor movement
      animatedX.current +=
        (cursorX.current - animatedX.current) * 0.25;

      animatedY.current +=
        (cursorY.current - animatedY.current) * 0.25;

      // Main cursor dot
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(
          ${cursorX.current}px,
          ${cursorY.current}px,
          0
        ) translate(-50%, -50%)`;
      }

      // Main glow
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate3d(
          ${animatedX.current}px,
          ${animatedY.current}px,
          0
        ) translate(-50%, -50%)`;
      }

      // Slower trail
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
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Save chat
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
        error instanceof Error ? error.message : "";

      let assistantMessage =
        "Sorry, something went wrong. Please try again.";

      if (
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.toLowerCase().includes("quota")
      ) {
        assistantMessage =
          "⚠️ Gemini's free quota has been reached. Please try again later.";
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

  const suggestions = [
    "Explain artificial intelligence simply",
    "Help me write a professional resume",
    "Give me project ideas for students",
    "Explain how Gemini API works",
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b14] text-white">

      {/* ================================================== */}
      {/* CUSTOM CURSOR                                      */}
      {/* ================================================== */}

      {/* Large slow purple trail */}
      <div
        ref={cursorTrailRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-28 w-28 rounded-full bg-violet-500/10 blur-3xl md:block"
        style={{
          willChange: "transform",
        }}
      />

      {/* Medium blue glow */}
      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-44 w-44 rounded-full bg-blue-500/10 blur-3xl md:block"
        style={{
          willChange: "transform",
        }}
      />

      {/* Small cursor core */}
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

            {/* Logo */}
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

          {/* Clear Chat */}
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

            /* ================================================== */
            /* WELCOME SCREEN                                     */
            /* ================================================== */

            <div className="flex min-h-[65vh] items-center justify-center px-2">

              <div className="w-full max-w-2xl text-center">

                {/* AI Icon */}
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

                {/* Suggested Prompts */}
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

            /* ================================================== */
            /* MESSAGES                                           */
            /* ================================================== */

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

                    {/* Message */}
                    <div
                      className={`rounded-2xl px-4 py-3.5 text-sm leading-7 shadow-lg transition-all duration-200 ${
                        message.role === "user"
                          ? "rounded-br-md bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-900/20"
                          : "rounded-bl-md border border-white/10 bg-white/[0.05] text-slate-200 hover:border-white/15 hover:bg-white/[0.07]"
                      }`}
                    >

                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                    </div>

                    {/* AI Actions */}
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

                  {/* User Avatar */}
                  {message.role === "user" && (

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm">
                      👤
                    </div>

                  )}

                </div>

              ))}

              {/* ================================================== */}
              {/* LOADING ANIMATION                                  */}
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

            {/* Send Button */}
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
