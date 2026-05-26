/**
 * AI Streaming Client
 *
 * Uses native fetch + ReadableStream to consume SSE from the
 * POST /ai/conversations/:id/chat endpoint.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';

// ============================================================================
// TYPES
// ============================================================================

export interface StreamEvent {
  type: 'text_delta' | 'tool_use_start' | 'tool_result' | 'message_done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  error?: string;
}

// ============================================================================
// STREAMING CLIENT
// ============================================================================

export async function* streamChat(
  conversationId: number,
  content: string,
): AsyncGenerator<StreamEvent> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to send message';
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorMessage;
    } catch {
      // ignore parse errors
    }

    if (response.status === 402) {
      yield { type: 'error', error: 'Insufficient AI tokens. Please purchase more tokens to continue.' };
      return;
    }

    yield { type: 'error', error: errorMessage };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', error: 'No response stream available' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE: lines starting with "data: "
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete last line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6); // remove "data: " prefix

        if (data === '[DONE]') {
          return;
        }

        try {
          const event = JSON.parse(data) as StreamEvent;
          yield event;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith('data: ') && remaining.slice(6) !== '[DONE]') {
        try {
          const event = JSON.parse(remaining.slice(6)) as StreamEvent;
          yield event;
        } catch {
          // Skip malformed data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
