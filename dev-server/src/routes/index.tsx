import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cogni — Smart Reasoning AI" },
      {
        name: "description",
        content:
          "Ask anything. Cogni breaks problems into sub-parts, shows numbered step-by-step thinking, and explains why each step makes sense.",
      },
      { property: "og:title", content: "Cogni — Smart Reasoning AI" },
      {
        property: "og:description",
        content: "Step-by-step AI reasoning that shows its work.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "cogni:conversation:v1";

const STARTERS = [
  "If a train leaves at 70 km/h and another at 90 km/h two hours later, when does the second catch the first?",
  "Explain the Monty Hall problem from first principles.",
  "Design a study plan to learn linear algebra in 6 weeks.",
  "Why does adding salt to ice lower its melting point?",
];

function loadInitialMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function Index() {
  const [initialMessages] = useState<UIMessage[]>(() => loadInitialMessages());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: "cogni-single",
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      console.error(error);
      toast.error("Cogni couldn't respond", {
        description: error.message || "Please try again in a moment.",
      });
    },
  });

  // Persist conversation to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  // Keep the textarea focused so the user can keep typing.
  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = async (message: { text: string }) => {
    const text = message.text.trim();
    if (!text || isBusy) return;
    await sendMessage({ text });
  };

  const sendStarter = async (text: string) => {
    if (isBusy) return;
    await sendMessage({ text });
  };

  const resetConversation = () => {
    stop();
    setMessages([]);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-aurora">
      <Toaster theme="dark" position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Cogni"
              width={36}
              height={36}
              className="size-9 rounded-lg ring-1 ring-border"
            />
            <div className="leading-tight">
              <div className="font-display text-xl italic">Cogni</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Smart reasoning system
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            disabled={messages.length === 0}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            New problem
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 pb-4">
        {messages.length === 0 ? (
          <EmptyState onPick={sendStarter} disabled={isBusy} />
        ) : (
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-0">
              {messages.map((m) => {
                const text = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                return (
                  <Message key={m.id} from={m.role}>
                    {m.role === "assistant" && (
                      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Brain className="size-3.5 text-[color:var(--cyan)]" />
                        <span className="font-mono uppercase tracking-wider">
                          Cogni reasoning
                        </span>
                      </div>
                    )}
                    <MessageContent
                      className={
                        m.role === "assistant"
                          ? "prose prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-p:text-foreground/90 prose-strong:text-foreground prose-li:my-1 prose-ol:my-2 prose-ul:my-2 prose-code:rounded prose-code:bg-surface-2 prose-code:px-1 prose-code:py-0.5 prose-code:text-[color:var(--cyan)] prose-code:before:hidden prose-code:after:hidden"
                          : ""
                      }
                    >
                      {m.role === "assistant" ? (
                        text ? (
                          <ReactMarkdown>{text}</ReactMarkdown>
                        ) : (
                          <Shimmer className="text-sm">Thinking through this...</Shimmer>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap">{text}</p>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}
              {status === "submitted" && (
                <Message from="assistant">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="size-3.5 text-[color:var(--cyan)]" />
                    <span className="font-mono uppercase tracking-wider">Cogni reasoning</span>
                  </div>
                  <MessageContent>
                    <Shimmer className="text-sm">Breaking the problem apart...</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* Composer */}
        <div className="mx-auto mt-4 w-full max-w-3xl">
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border/70 bg-surface/80 backdrop-blur ring-glow"
          >
            <PromptInputTextarea
              ref={textareaRef as never}
              placeholder="Ask anything — Cogni will reason step by step..."
              className="min-h-20 bg-transparent text-base"
            />
            <PromptInputFooter className="justify-between border-t border-border/60 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-[color:var(--violet)]" />
                <span>Powered by Lovable AI · step-by-step reasoning</span>
              </div>
              <PromptInputSubmit
                status={status}
                disabled={isBusy}
                className="bg-gradient-to-br from-[color:var(--cyan)] to-[color:var(--violet)] text-primary-foreground hover:opacity-90"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </main>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[color:var(--cyan)] to-[color:var(--violet)] opacity-30 blur-3xl" />
        <img src={logo} alt="Cogni" width={72} height={72} className="size-18" />
      </div>
      <h1 className="font-display text-5xl italic tracking-tight sm:text-6xl">
        Think it through with <span className="text-gradient not-italic font-semibold">Cogni</span>
      </h1>
      <p className="mt-4 max-w-xl text-balance text-muted-foreground">
        Drop in any problem — math, logic, code, life. Cogni breaks it into parts, walks through
        numbered steps, and tells you <em>why</em> each step holds.
      </p>

      <div className="mt-10 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            disabled={disabled}
            onClick={() => onPick(s)}
            className="group rounded-xl border border-border/70 bg-surface/60 p-4 text-left text-sm text-foreground/90 transition hover:border-[color:var(--cyan)]/60 hover:bg-surface disabled:opacity-50"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-[color:var(--cyan)]">
              Try it
            </span>
            <p className="mt-2 leading-snug">{s}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
