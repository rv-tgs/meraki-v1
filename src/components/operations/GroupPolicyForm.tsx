import { FormEvent, useMemo, useState } from 'react';
import type { GroupPolicyPayload, OperationResult } from '../../types/meraki';
import { isRequired } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface GroupPolicyFormProps {
  submit: (payload: GroupPolicyPayload) => Promise<OperationResult>;
}

function buildTemplate(policyName: string): GroupPolicyPayload {
  return {
    name: policyName,
    firewallAndTrafficShaping: {
      settings: 'custom',
      trafficShapingRules: [],
      l3FirewallRules: [],
      l7FirewallRules: [
        {
          policy: 'deny',
          type: 'applicationCategory',
          value: {
            id: 'meraki:layer7/category/8',
            name: 'Peer-to-peer (P2P)'
          }
        },
        {
          policy: 'deny',
          type: 'applicationCategory',
          value: {
            id: 'meraki:layer7/category/6',
            name: 'Gaming'
          }
        }
      ]
    }
  };
}

export default function GroupPolicyForm({ submit }: GroupPolicyFormProps) {
  const [policyName, setPolicyName] = useState('Standard Policy');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(buildTemplate('Standard Policy'), null, 2));
  const [jsonError, setJsonError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OperationResult>();

  const valid = isRequired(policyName) && isRequired(jsonText) && !jsonError;

  const updatePolicyName = (nextName: string) => {
    setPolicyName(nextName);
    try {
      const parsed = JSON.parse(jsonText) as GroupPolicyPayload;
      const nextPayload = { ...parsed, name: nextName };
      setJsonText(JSON.stringify(nextPayload, null, 2));
      setJsonError(undefined);
    } catch {
      const nextPayload = buildTemplate(nextName);
      setJsonText(JSON.stringify(nextPayload, null, 2));
      setJsonError(undefined);
    }
  };

  const parsedPayload = useMemo<GroupPolicyPayload | Error>(() => {
    try {
      const parsed = JSON.parse(jsonText) as GroupPolicyPayload;
      if (!isRequired(parsed.name || '')) {
        throw new Error('JSON must include a non-empty name field.');
      }
      return parsed;
    } catch (error) {
      return error as Error;
    }
  }, [jsonText]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (parsedPayload instanceof Error) {
      setJsonError(parsedPayload.message || 'Invalid JSON payload.');
      return;
    }

    setJsonError(undefined);
    setLoading(true);
    const response = await submit(parsedPayload);
    setResult(response);
    setLoading(false);
  };

  return (
    <section className="card">
      <h3>Create Group Policy (JSON)</h3>
      <p className="hint">Policy name is user-controlled and injected into JSON `name`.</p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Policy Name
          <input value={policyName} onChange={(event) => updatePolicyName(event.target.value)} />
        </label>
        <label>
          Group Policy JSON
          <textarea
            className="json-box"
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value);
              try {
                JSON.parse(event.target.value);
                setJsonError(undefined);
              } catch (error) {
                setJsonError((error as Error).message || 'Invalid JSON payload.');
              }
            }}
          />
        </label>
        {jsonError ? <p className="error">{jsonError}</p> : null}
        <button type="submit" disabled={loading || !valid}>
          {loading ? 'Creating...' : 'Create Policy'}
        </button>
      </form>
      <ApiResult result={result} />
    </section>
  );
}
