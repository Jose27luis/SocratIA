let toggleAdded = false;

export function ttsEnabled() {
    try {
        return localStorage.getItem("socrateai_tts") !== "off";
    } catch (e) {
        return true;
    }
}

export function hasReadableText(value) {
    return /[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/.test(String(value || ""));
}

export function speak(text) {
    if (!ttsEnabled()) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const clean = String(text || "")
        .replace(/\$[^$]*\$/g, " ")
        .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean) return;
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = "es-PE";
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
    } catch (e) {
        return;
    }
}

export function ensureTtsToggle() {
    if (toggleAdded || typeof document === "undefined") return;
    toggleAdded = true;
    const btn = document.createElement("button");
    const paint = () => {
        btn.textContent = ttsEnabled() ? "🔊 Voz: activada" : "🔇 Voz: desactivada";
    };
    btn.setAttribute("aria-label", "Activar o desactivar la lectura en voz alta");
    btn.style.cssText =
        "position:fixed;left:12px;bottom:64px;z-index:9999;border:none;border-radius:999px;" +
        "padding:9px 16px;font:600 13px system-ui,sans-serif;background:#6d28d9;color:#fff;" +
        "cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.22)";
    btn.onclick = () => {
        const next = ttsEnabled() ? "off" : "on";
        try {
            localStorage.setItem("socrateai_tts", next);
        } catch (e) {
            return;
        }
        if (next === "off" && window.speechSynthesis) window.speechSynthesis.cancel();
        paint();
    };
    paint();
    document.body.appendChild(btn);
}
