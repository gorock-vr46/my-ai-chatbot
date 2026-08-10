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

  // =========================================================
  // CURSOR
  // =========================================================

  const cursorX = useRef(0);
  const cursorY = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);

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
  // CURSOR ANIMATION
  // =========================================================

  useEffect(() => {
    const cursor = document.getElementById("custom-cursor");

    if (!cursor) return;

    const moveCursor = (event: MouseEvent) => {
      targetX.current = event.clientX;
      targetY.current = event.clientY;
    };

    const animateCursor = () => {
      cursorX.current +=
        (targetX.current - cursorX.current) * 0.15;

      cursorY.current +=
        (targetY.current - cursorY.current) * 0.15;

      cursor.style.transform = `translate3d(${cursorX.current}px, ${cursorY.current}px, 0)`;

      requestAnimationFrame(animateCursor);
    };

    window.addEventListener("mousemove", moveCursor);

    const animationFrame =
      requestAnimationFrame(animateCursor);

    return () => {
      window.removeEventListener(
        "mousemove",
        moveCursor
      );

      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

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
          data.error ||
            data.details ||
            "Something went wrong."
        );
      }

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

      let userMessage =
        "⚠️ **Something went wrong**\n\n" +
        "Please try again in a moment.";

      // =====================================================
      // GEMINI QUOTA / RATE LIMIT
      // =====================================================

      if (
        errorMessage.includes("429") ||
        errorMessage
          .toLowerCase()
          .includes("resource_exhausted") ||
        errorMessage
          .toLowerCase()
          .includes("quota") ||
        errorMessage
          .toLowerCase()
          .includes("rate limit") ||
        errorMessage
          .toLowerCase()
          .includes("too many requests")
      ) {
        userMessage =
          "⚠️ **AI temporarily unavailable**\n\n" +
          "Gemini's API limit has been reached right now.\n\n" +
          "Your chatbot is working correctly, but the AI service is temporarily unavailable. Please try again later.";
      }

      // =====================================================
      // API KEY ERROR
      // =====================================================

      else if (
        errorMessage.includes("401") ||
        errorMessage
          .toLowerCase()
          .includes("api key") ||
        errorMessage
          .toLowerCase()
          .includes("authentication")
      ) {
        userMessage =
          "🔑 **API authentication problem**\n\n" +
          "The Gemini API key could not be authenticated. Please check the API configuration.";
      }

      // =====================================================
      // PERMISSION ERROR
      // =====================================================

      else if (
        errorMessage.includes("403") ||
        errorMessage
          .toLowerCase()
          .includes("permission denied") ||
        errorMessage
          .toLowerCase()
          .includes("forbidden")
      ) {
        userMessage =
          "🔒 **API permission problem**\n\n" +
          "The Gemini API does not currently have permission to process this request.";
      }

      // =====================================================
      // MODEL ERROR
      // =====================================================

      else if (
        errorMessage.includes("404") ||
        errorMessage
          .toLowerCase()
          .includes("model not found")
      ) {
        userMessage =
          "🤖 **Gemini model unavailable**\n\n" +
          "The selected Gemini model is not available for this API project.";
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

  // =========================================================
  // ENTER KEY
  // =========================================================

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
      console.error(
        "Could not copy message:",
        error
      );
    }
  }

  // =========================================================
  // CLEAR CHAT
  // =========================================================

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Custom Cursor */}
      <div
        id="custom-cursor"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400 bg-blue-400/20 shadow-[0_0_20px_rgba(59,130,246,0.7)]"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/20 text-2xl shadow-lg shadow-blue-500/10">
                🤖
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  My AI Assistant
                </h1>

                <p className="text-sm text-slate-400">
                  Powered by Gemini
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            Clear Chat
          </button>
        </header>

        {/* =================================================
            CHAT
        ================================================= */}

        <section className="flex-1 space-y-5 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-sm sm:p-6">

          {/* EMPTY STATE */}

          {messages.length === 0 && (
            <div className="flex min-h-[500px] items-center justify-center text-center">
              <div className="max-w-lg">
                <div className="mb-5 text-6xl">
                  🤖
                </div>

                <h2 className="text-3xl font-bold">
                  Hello! 👋
                </h2>

                <p className="mt-3 text-slate-400">
                  I'm your AI assistant. Ask me anything
                  and I'll try to help.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
                  <span className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 text-slate-300">
                    💡 Ask a question
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 text-slate-300">
                    💻 Get coding help
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 text-slate-300">
                    📚 Learn something new
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES */}

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
                className={`group relative max-w-[90%] rounded-2xl px-4 py-3 shadow-lg sm:max-w-[82%] ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-800/90 text-slate-100"
                }`}
              >
                {/* Assistant label */}

                {message.role === "assistant" && (
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <span>🤖</span>
                    <span>My AI Assistant</span>
                  </div>
                )}

                {/* Markdown */}

                <div className="prose prose-invert max-w-none text-sm leading-7">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-3 mt-2 text-2xl font-bold text-white">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="mb-3 mt-4 text-xl font-bold text-white">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-3 text-lg font-semibold text-white">
                          {children}
                        </h3>
                      ),

                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0">
                          {children}
                        </p>
                      ),

                      ul: ({ children }) => (
                        <ul className="mb-3 ml-5 list-disc space-y-1">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="mb-3 ml-5 list-decimal space-y-1">
                          {children}
                        </ol>
                      ),

                      li: ({ children }) => (
                        <li>{children}</li>
                      ),

                      strong: ({ children }) => (
                        <strong className="font-bold text-white">
                          {children}
                        </strong>
                      ),

                      code: ({
                        className,
                        children,
                        ...props
                      }) => {
                        const isInline =
                          !className;

                        return isInline ? (
                          <code
                            className="rounded bg-slate-700 px-1.5 py-0.5 text-sm text-blue-300"
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code
                            className="block overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },

                      pre: ({ children }) => (
                        <pre className="mb-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
                          {children}
                        </pre>
                      ),

                      blockquote: ({ children }) => (
                        <blockquote className="my-3 border-l-4 border-blue-500 pl-4 italic text-slate-300">
                          {children}
                        </blockquote>
                      ),

                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {children}
                        </a>
                      ),

                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-700 text-sm">
                            {children}
                          </table>
                        </div>
                      ),

                      th: ({ children }) => (
                        <th className="border border-slate-700 bg-slate-800 px-3 py-2 text-left font-semibold">
                          {children}
                        </th>
                      ),

                      td: ({ children }) => (
                        <td className="border border-slate-700 px-3 py-2">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Copy Button */}

                {message.role === "assistant" && (
                  <button
                    onClick={() =>
                      copyMessage(
                        message.content,
                        index
                      )
                    }
                    className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 opacity-0 transition-all duration-200 hover:bg-slate-700 hover:text-white group-hover:opacity-100"
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
              <div className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">
                    🤖
                  </span>

                  <span className="text-sm text-slate-400">
                    AI is thinking
                  </span>

                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            INPUT
        ================================================= */}

        <div className="mt-4">
          <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl transition-all duration-200 focus-within:border-blue-500/50 focus-within:shadow-blue-500/10">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent px-3 py-3 text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              onClick={sendMessage}
              disabled={
                loading || !input.trim()
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-slate-500">
            Press Enter to send • Shift + Enter for a
            new line
          </p>
        </div>
      </div>
    </main>
  );
}
