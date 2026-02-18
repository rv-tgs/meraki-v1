import { FormEvent, useState } from 'react';
import type { SsidPayload } from '../../types/meraki';
import type { OperationResult } from '../../types/meraki';
import { isValidPsk, isValidSsidNumber } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface SsidFormProps {
  networkId: string;
  submit: (number: number, payload: SsidPayload) => Promise<OperationResult>;
}

export default function SsidForm({ networkId, submit }: SsidFormProps) {
  const [number, setNumber] = useState(0);
  const [name, setName] = useState('Corp-WiFi');
  const [enabled, setEnabled] = useState(true);
  const [psk, setPsk] = useState('');
  const [strictMode, setStrictMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const pskValid = !strictMode || isValidPsk(psk);
  const formValid = isValidSsidNumber(number) && !!name.trim() && pskValid;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValid) return;

    const payload: SsidPayload = {
      name: name.trim(),
      enabled,
      ...(psk ? { psk } : {})
    };

    if (strictMode) {
      payload.authMode = 'psk';
      payload.ipAssignmentMode = 'Bridge mode';
    }

    setLoading(true);
    const response = await submit(number, payload);
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Wireless SSID Create/Update</h3>
      <p>Network: {networkId}</p>
      <form className="grid" onSubmit={onSubmit}>
        <label>
          SSID Number (0-14)
          <input type="number" min={0} max={14} value={number} onChange={(e) => setNumber(Number(e.target.value))} />
        </label>
        <label>
          SSID Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          PSK (optional)
          <input type="password" value={psk} onChange={(e) => setPsk(e.target.value)} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
          Strict payload schema
        </label>
        {strictMode ? <p className="hint">Strict mode requires PSK length 8-63 and sets auth mode to PSK.</p> : null}
        <label className="checkbox">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
        </label>
        <button type="submit" disabled={loading || !formValid}>{loading ? 'Saving...' : 'Save SSID'}</button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
