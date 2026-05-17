import axios from 'axios';

interface ApiErrorPayload {
  message?: string | string[];
  errors?: Array<{ field?: string; message?: string }>;
}

const fallbackMessage = 'Something went wrong. Please try again.';

export function getErrorMessage(error: unknown, fallback = fallbackMessage) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;

    if (payload?.errors?.length) {
      const messages = payload.errors
        .map((item) => item.message?.trim())
        .filter((message): message is string => Boolean(message));

      if (messages.length === 1) {
        return messages[0];
      }

      if (messages.length > 1) {
        return messages.join(' ');
      }
    }

    if (Array.isArray(payload?.message)) {
      const messages = payload.message.filter(Boolean);
      if (messages.length === 1) {
        return messages[0];
      }
      if (messages.length > 1) {
        return messages.join(' ');
      }
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
