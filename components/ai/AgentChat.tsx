"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

export function AgentChat({
  agentKey,
  agentName,
  userName,
  starters = [],
}: {
  agentKey: string;
  agentName: string;
  userName: string;
  starters?: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    scrollDown();

    // placeholder assistant message we stream into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, messages: next }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "เกิดข้อผิดพลาด");
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${errText}` };
          return copy;
        });
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        scrollDown();
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${e?.message ?? "เกิดข้อผิดพลาด"}` };
        return copy;
      });
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[420px] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center text-center">
            <div>
              <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-grape-soft text-grape mb-3">
                <Icon name="Bot" className="size-7" />
              </div>
              <p className="font-semibold">{agentName}</p>
              <p className="text-sm text-muted mt-1 mb-4">เริ่มสนทนาได้เลย</p>
              {starters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="chip border border-sand hover:bg-sand/50 text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "assistant" ? (
                <div className="grid place-items-center size-8 rounded-full bg-grape-soft text-grape shrink-0">
                  <Icon name="Bot" className="size-4" />
                </div>
              ) : (
                <Avatar name={userName} size={32} />
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user" ? "bg-brand text-ink" : "bg-sand/50 text-ink"
                }`}
              >
                {m.content || (busy && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-sand/70 p-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="พิมพ์ข้อความ… (Enter เพื่อส่ง)"
          className="input resize-none max-h-32 flex-1"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-brand shrink-0">
          <Icon name={busy ? "Loader" : "Send"} className={`size-4 ${busy ? "animate-spin" : ""}`} />
        </button>
      </form>
    </div>
  );
}
