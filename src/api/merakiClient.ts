import type { MerakiApiError } from '../types/meraki';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  signal?: AbortSignal;
  body?: unknown;
}

export class MerakiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.meraki.com/api/v1'
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      throw await toMerakiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export async function toMerakiError(response: Response): Promise<MerakiApiError> {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    try {
      details = await response.text();
    } catch {
      details = undefined;
    }
  }

  const message =
    typeof details === 'object' && details !== null && 'errors' in details
      ? String((details as { errors?: unknown[] }).errors?.join(', ') ?? 'Meraki API request failed')
      : `Meraki API request failed with status ${response.status}`;

  return {
    status: response.status,
    message,
    details,
    requestId: response.headers.get('x-request-id') ?? undefined
  };
}
