import { TRANSLATE_TARGET, TRANSLATE_URL } from "../config/config.js";

const CACHE_PREFIX = "socrateai_tr_";
const LANG_KEY = "socrateai_lang";

export function activeLanguage() {
    try {
        return localStorage.getItem(LANG_KEY) || TRANSLATE_TARGET;
    } catch (e) {
        return TRANSLATE_TARGET;
    }
}

export function setLanguage(lang) {
    try {
        localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
        // ignorar
    }
}

export function translationEnabled() {
    return Boolean(activeLanguage()) && Boolean(TRANSLATE_URL);
}

function cacheKey(text) {
    return `${CACHE_PREFIX}${activeLanguage()}_${text}`;
}

function readCache(text) {
    try {
        return localStorage.getItem(cacheKey(text));
    } catch (e) {
        return null;
    }
}

function writeCache(text, translated) {
    try {
        localStorage.setItem(cacheKey(text), translated);
    } catch (e) {
        // localStorage lleno o no disponible: se ignora
    }
}

export async function translateBatch(texts) {
    if (!translationEnabled()) {
        return texts;
    }

    const result = new Array(texts.length);
    const missing = [];
    const missingIndexes = [];

    texts.forEach((text, index) => {
        if (typeof text !== "string" || text.trim() === "") {
            result[index] = text;
            return;
        }
        const cached = readCache(text);
        if (cached !== null) {
            result[index] = cached;
        } else {
            missing.push(text);
            missingIndexes.push(index);
        }
    });

    if (missing.length === 0) {
        return result;
    }

    try {
        const response = await fetch(TRANSLATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: missing, target: activeLanguage() }),
        });
        const data = await response.json();
        const translations = Array.isArray(data.translations) ? data.translations : missing;
        missingIndexes.forEach((originalIndex, position) => {
            const translated = translations[position] ?? texts[originalIndex];
            result[originalIndex] = translated;
            writeCache(texts[originalIndex], translated);
        });
    } catch (e) {
        missingIndexes.forEach((originalIndex) => {
            result[originalIndex] = texts[originalIndex];
        });
    }

    return result;
}
