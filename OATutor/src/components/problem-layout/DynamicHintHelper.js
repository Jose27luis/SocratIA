import { renderGPTText } from "../../platform-logic/renderText.js";

export async function fetchDynamicHint(
    DYNAMIC_HINT_URL,
    promptParameters,
    onChunkReceived,
    onSuccessfulCompletion,
    onError,
    problemID,
    variabilization,
    context
    ) {
    try {
        let response;
        try {
            response = await fetch(DYNAMIC_HINT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(promptParameters),
            });
        } catch (error) {
            console.error("Error sending request:", error);
            throw error;
        }

        if (!response.body) {
            throw new Error("No response body from server.");
        }
        if (!response.ok) {
            const errorText = await response.text();
            console.error("SócratIA error response:", errorText);
            throw new Error(`Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedHint = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                const finalHint = renderGPTText(streamedHint, problemID, variabilization, context);
                onChunkReceived(finalHint);
                onSuccessfulCompletion();
                break;
            }
            streamedHint += decoder.decode(value, { stream: true });
            onChunkReceived(streamedHint);
        }
    } catch (error) {
        console.error("Error fetching dynamic hint:", error);
        onError(error);
    }
}
