/**
 * Gemini API Proxy - uses streaming endpoint to avoid Cloudflare 524 timeout.
 *
 * Instead of generateContent (which blocks until complete and can timeout),
 * we call streamGenerateContent with SSE, read chunks as they arrive,
 * merge them, and return a complete JSON response to the frontend.
 */

function parseSSEChunks(raw) {
    const chunks = [];
    // Extract ALL "data: {json}" lines from the raw SSE text.
    // Gemini may send multiple data: lines within a single SSE event block,
    // or separate them with \n\n. Handle both cases.
    const lines = raw.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
            try {
                chunks.push(JSON.parse(trimmed.slice(6)));
            } catch { /* skip malformed */ }
        }
    }
    return chunks;
}

async function readStreamAndMerge(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let raw = '';

    // Read the entire SSE stream
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
    }
    // Flush decoder
    raw += decoder.decode();

    const chunks = parseSSEChunks(raw);

    if (chunks.length === 0) {
        throw new Error(`No valid chunks from stream. Raw length: ${raw.length}, preview: ${raw.slice(0, 200)}`);
    }

    // Merge all text parts across chunks (skip empty text and thoughtSignatures)
    const textParts = [];
    for (const chunk of chunks) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.text) {
                    textParts.push(part.text);
                }
            }
        }
    }

    const lastChunk = chunks[chunks.length - 1];
    const lastCandidate = lastChunk.candidates?.[0];

    return {
        candidates: [{
            content: {
                parts: [{ text: textParts.join('') }],
                role: 'model'
            },
            finishReason: lastCandidate?.finishReason || 'STOP'
        }],
        usageMetadata: lastChunk.usageMetadata,
        modelVersion: lastChunk.modelVersion
    };
}

export async function onRequestPost(context) {
    const { env } = context;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
        return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    try {
        const body = await context.request.json();
        const { model, apiVersion, contents, generationConfig } = body;

        if (!model || !contents) {
            return Response.json({ error: 'model and contents are required' }, { status: 400 });
        }

        const version = apiVersion || 'v1beta';
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            let errorData;
            try { errorData = JSON.parse(errorText); } catch {}
            return Response.json(
                errorData || { error: `Gemini API error (${geminiResponse.status})`, detail: errorText.slice(0, 500) },
                { status: geminiResponse.status }
            );
        }

        const merged = await readStreamAndMerge(geminiResponse);
        return Response.json(merged);

    } catch (err) {
        return Response.json(
            { error: `Proxy error: ${err.message}` },
            { status: 500 }
        );
    }
}
