import React from "react";
import { activeLanguage, setLanguage, translationEnabled } from "../platform-logic/translate.js";

const LANGUAGES = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
    { value: "pt", label: "Português" },
    { value: "quechua", label: "Runa Simi (Quechua)" },
];

function LanguageSelector() {
    if (!translationEnabled()) {
        return null;
    }

    const onChange = (e) => {
        setLanguage(e.target.value);
        window.location.reload();
    };

    return (
        <div style={{
            position: "fixed", bottom: 24, left: 24, zIndex: 1300,
            background: "#fff", border: "1px solid #ece9f5", borderRadius: 12,
            boxShadow: "0 6px 24px rgba(31,27,46,0.12)", padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 8,
        }}>
            <span role="img" aria-label="idioma" style={{ fontSize: 16 }}>🌐</span>
            <select
                value={activeLanguage()}
                onChange={onChange}
                style={{
                    border: "none", outline: "none", fontFamily: "inherit",
                    fontSize: 14, color: "#4c1d95", fontWeight: 600, cursor: "pointer", background: "transparent",
                }}
            >
                {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                ))}
            </select>
        </div>
    );
}

export default LanguageSelector;
