import { FormEvent, useState } from 'react';

interface AuthGateProps {
  loading: boolean;
  error?: string;
  onConnect: (apiKey: string) => Promise<void>;
}

export default function AuthGate({ loading, error, onConnect }: AuthGateProps) {
  const [apiKey, setApiKey] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      return;
    }
    await onConnect(apiKey.trim());
  };

  return (
    <section className="card">
      <h2>Meraki API Key</h2>
      <p>Enter your key to start. It is kept only in memory for this session.</p>
      <form onSubmit={submit} className="stack">
        <label htmlFor="api-key">Authorization: Bearer {'{API_KEY}'}</label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          placeholder="Enter Meraki API key"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <button type="submit" disabled={loading || !apiKey.trim()}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
