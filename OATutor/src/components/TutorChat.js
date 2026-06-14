import React, { useState, useRef, useEffect } from "react";
import { DYNAMIC_HINT_URL } from "../config/config.js";

const baseUrl = DYNAMIC_HINT_URL ? DYNAMIC_HINT_URL.replace(/\/dynamic-hint$/, "") : "";

const palette = {
    primary: "#6d28d9",
    primaryDark: "#4c1d95",
    bot: "#f3f0fb",
    user: "#6d28d9",
};

function TutorChat({ problem }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    if (!baseUrl) {
        return null;
    }

    const context = problem
        ? `Título: ${problem.title || ""}\nEnunciado: ${problem.body || ""}`
        : "";

    const send = async () => {
        const text = input.trim();
        if (!text || busy) {
            return;
        }
        const history = [...messages, { role: "user", content: text }];
        setMessages([...history, { role: "assistant", content: "" }]);
        setInput("");
        setBusy(true);
        try {
            const response = await fetch(baseUrl + "/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ context, history }),
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let acc = "";
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                acc += decoder.decode(value, { stream: true });
                setMessages([...history, { role: "assistant", content: acc }]);
            }
        } catch (e) {
            setMessages([...history, { role: "assistant", content: "No pude responder ahora. Intenta de nuevo." }]);
        }
        setBusy(false);
    };

    const onKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}>
            {open && (
                <div style={{
                    width: 340, height: 460, marginBottom: 12, display: "flex", flexDirection: "column",
                    background: "#fff", borderRadius: 16, overflow: "hidden",
                    boxShadow: "0 12px 40px rgba(31,27,46,0.25)", border: "1px solid #ece9f5",
                }}>
                    <div style={{
                        background: `linear-gradient(135deg, ${palette.primary}, ${palette.primaryDark})`,
                        color: "#fff", padding: "14px 16px", fontWeight: 600,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        <span>SócratIA · Tutor</span>
                        <span style={{ cursor: "pointer", fontSize: 18 }} onClick={() => setOpen(false)}>×</span>
                    </div>
                    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#faf9fd" }}>
                        {messages.length === 0 && (
                            <div style={{ color: "#8b8699", fontSize: 14, textAlign: "center", marginTop: 20 }}>
                                Pregúntame sobre este ejercicio. Te guío sin darte la respuesta.
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10,
                            }}>
                                <div style={{
                                    maxWidth: "80%", padding: "9px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.45,
                                    whiteSpace: "pre-wrap",
                                    background: m.role === "user" ? palette.user : palette.bot,
                                    color: m.role === "user" ? "#fff" : "#1f1b2e",
                                }}>
                                    {m.content || "…"}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", padding: 10, borderTop: "1px solid #ece9f5", gap: 8 }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKey}
                            placeholder="Escribe tu pregunta…"
                            rows={1}
                            style={{
                                flex: 1, resize: "none", border: "1px solid #e0dcec", borderRadius: 10,
                                padding: "9px 11px", fontSize: 14, fontFamily: "inherit", outline: "none",
                            }}
                        />
                        <button onClick={send} disabled={busy} style={{
                            background: palette.primary, color: "#fff", border: "none", borderRadius: 10,
                            padding: "0 16px", fontWeight: 600, cursor: busy ? "progress" : "pointer",
                        }}>
                            {busy ? "…" : "Enviar"}
                        </button>
                    </div>
                </div>
            )}
            <button onClick={() => setOpen(!open)} aria-label="Abrir tutor" style={{
                width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.primaryDark})`,
                color: "#fff", fontSize: 26, boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
            }}>
                {open ? "×" : "?"}
            </button>
        </div>
    );
}

export default TutorChat;
