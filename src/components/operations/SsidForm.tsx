import { useState } from 'react';
import type { OperationResult, SsidPayload } from '../../types/meraki';
import { isValidPsk } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface SsidFormProps {
  networkId: string;
  submit: (number: number, payload: SsidPayload) => Promise<OperationResult>;
}

interface SsidRow {
  number: number;
  name: string;
  enabled: boolean;
  psk: string;
  loading: boolean;
  result?: OperationResult;
}

const defaultRows: SsidRow[] = [
  { number: 0, name: 'Corp-WiFi', enabled: true, psk: '', loading: false },
  { number: 1, name: 'Guest-WiFi', enabled: true, psk: '', loading: false }
];

export default function SsidForm({ networkId, submit }: SsidFormProps) {
  const [rows, setRows] = useState<SsidRow[]>(defaultRows);

  const setRow = (number: number, patch: Partial<SsidRow>) => {
    setRows((current) => current.map((row) => (row.number === number ? { ...row, ...patch } : row)));
  };

  const saveRow = async (number: number) => {
    const row = rows.find((item) => item.number === number);
    if (!row) return;

    const valid = row.name.trim().length > 0 && isValidPsk(row.psk);
    if (!valid) {
      setRow(number, {
        result: {
          operation: `SSID ${number} Update`,
          success: false,
          timestamp: new Date().toISOString(),
          payload: row,
          error: { message: 'SSID name is required and PSK must be 8-63 characters.' }
        }
      });
      return;
    }

    const payload: SsidPayload = {
      name: row.name.trim(),
      enabled: row.enabled,
      psk: row.psk,
      authMode: 'psk',
      ipAssignmentMode: 'Bridge mode'
    };

    setRow(number, { loading: true });
    const result = await submit(number, payload);
    setRow(number, { loading: false, result });
  };

  return (
    <section className="card">
      <h3>Wireless SSID Create/Update</h3>
      <p>Network: {networkId}</p>
      <p className="hint">Required defaults: SSID 0 = Corp-WiFi, SSID 1 = Guest-WiFi. PSK must be 8-63 chars.</p>

      <div className="stack">
        {rows.map((row) => (
          <div key={row.number} className="card muted">
            <h4>SSID {row.number}</h4>
            <div className="grid">
              <label>
                SSID Name
                <input value={row.name} onChange={(event) => setRow(row.number, { name: event.target.value })} />
              </label>
              <label>
                PSK (required)
                <input
                  type="password"
                  value={row.psk}
                  onChange={(event) => setRow(row.number, { psk: event.target.value })}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(event) => setRow(row.number, { enabled: event.target.checked })}
                />
                Enabled
              </label>
              <button type="button" disabled={row.loading} onClick={() => saveRow(row.number)}>
                {row.loading ? 'Saving...' : `Save SSID ${row.number}`}
              </button>
            </div>
            <ApiResult result={row.result} />
          </div>
        ))}
      </div>
    </section>
  );
}
