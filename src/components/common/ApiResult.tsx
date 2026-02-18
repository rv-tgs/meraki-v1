import type { OperationResult } from '../../types/meraki';

interface ApiResultProps {
  result?: OperationResult;
}

export default function ApiResult({ result }: ApiResultProps) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result ${result.success ? 'ok' : 'err'}`}>
      <p>
        <strong>{result.operation}</strong> at {new Date(result.timestamp).toLocaleString()}
      </p>
      {!result.success && result.error ? (
        <p>
          {result.error.status ? `[${result.error.status}] ` : ''}
          {result.error.message}
        </p>
      ) : null}
      <details>
        <summary>Payload/Response</summary>
        <pre>{JSON.stringify({ payload: result.payload, response: result.response, error: result.error }, null, 2)}</pre>
      </details>
    </div>
  );
}
