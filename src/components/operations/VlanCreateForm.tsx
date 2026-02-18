import { useMemo, useState } from 'react';
import type { CreateVlanPayload, OperationResult } from '../../types/meraki';
import { isRequired, isValidCidr, isValidIpv4, isValidVlanId } from '../../utils/validators';
import ApiResult from '../common/ApiResult';

interface VlanCreateFormProps {
  applyVlanSettings: (payload: { vlansEnabled: boolean }) => Promise<OperationResult>;
  submitOne: (payload: CreateVlanPayload) => Promise<OperationResult>;
  onAfterBatchDeploy: () => Promise<void>;
}

type RowStatus = 'idle' | 'success' | 'error';

interface VlanRow {
  key: number;
  id: string;
  name: string;
  subnet: string;
  applianceIp: string;
  groupPolicyId: string;
  status: RowStatus;
  message?: string;
  result?: OperationResult;
}

function makeRow(key: number): VlanRow {
  return {
    key,
    id: '',
    name: '',
    subnet: '',
    applianceIp: '',
    groupPolicyId: '',
    status: 'idle'
  };
}

function rowHasInput(row: VlanRow): boolean {
  return [row.id, row.name, row.subnet, row.applianceIp, row.groupPolicyId].some((field) => field.trim().length > 0);
}

function validateRow(row: VlanRow): string | undefined {
  if (!rowHasInput(row)) return undefined;
  if (!isValidVlanId(row.id)) return 'VLAN ID must be an integer between 1 and 4094.';
  if (!isRequired(row.name)) return 'VLAN name is required.';
  if (!isValidCidr(row.subnet)) return 'Subnet must be a valid CIDR (example: 192.168.10.0/24).';
  if (!isValidIpv4(row.applianceIp)) return 'Appliance IP must be a valid IPv4 address.';
  return undefined;
}

export default function VlanCreateForm({
  applyVlanSettings,
  submitOne,
  onAfterBatchDeploy
}: VlanCreateFormProps) {
  const [vlansEnabled, setVlansEnabled] = useState(true);
  const [rows, setRows] = useState<VlanRow[]>([makeRow(1), makeRow(2), makeRow(3), makeRow(4), makeRow(5)]);
  const [nextKey, setNextKey] = useState(6);
  const [loading, setLoading] = useState(false);
  const [settingsResult, setSettingsResult] = useState<OperationResult>();

  const validRows = useMemo(() => rows.filter((row) => rowHasInput(row) && !validateRow(row)), [rows]);

  const updateRow = (key: number, patch: Partial<VlanRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [...current, makeRow(nextKey)]);
    setNextKey((value) => value + 1);
  };

  const removeRow = (key: number) => {
    setRows((current) => (current.length > 5 ? current.filter((row) => row.key !== key) : current));
  };

  const deployBatch = async () => {
    if (!vlansEnabled) {
      return;
    }

    setLoading(true);

    const settingsResponse = await applyVlanSettings({ vlansEnabled: true });
    setSettingsResult(settingsResponse);

    if (!settingsResponse.success) {
      setLoading(false);
      return;
    }

    let deployedAny = false;
    const updatedRows: VlanRow[] = [];

    for (const row of rows) {
      const rowError = validateRow(row);
      if (!rowHasInput(row)) {
        updatedRows.push({ ...row, status: 'idle', message: undefined, result: undefined });
        continue;
      }
      if (rowError) {
        updatedRows.push({ ...row, status: 'error', message: rowError, result: undefined });
        continue;
      }

      const payload: CreateVlanPayload = {
        id: row.id.trim(),
        name: row.name.trim(),
        subnet: row.subnet.trim(),
        applianceIp: row.applianceIp.trim(),
        ...(row.groupPolicyId.trim() ? { groupPolicyId: row.groupPolicyId.trim() } : {})
      };

      const result = await submitOne(payload);
      if (result.success) {
        deployedAny = true;
        updatedRows.push({ ...row, status: 'success', message: 'Created', result });
      } else {
        updatedRows.push({
          ...row,
          status: 'error',
          message: result.error?.message || 'Failed to create VLAN.',
          result
        });
      }
    }

    setRows(updatedRows);
    setLoading(false);

    if (deployedAny) {
      await onAfterBatchDeploy();
    }
  };

  return (
    <section className="card">
      <h3>VLAN Settings + VLAN Batch Deploy</h3>
      <p className="hint">When deploying, VLAN settings are applied first. VLAN table is disabled unless VLANs Enabled is ON.</p>

      <div className="toolbar-row">
        <label className="checkbox">
          <input type="checkbox" checked={vlansEnabled} onChange={(event) => setVlansEnabled(event.target.checked)} />
          VLANs Enabled
        </label>
      </div>

      {!vlansEnabled ? <p className="hint">Turn on VLANs Enabled to edit/deploy VLAN rows.</p> : null}

      <fieldset className="table-fieldset" disabled={!vlansEnabled || loading}>
        <div className="table-wrap">
          <table className="vlan-table">
            <thead>
              <tr>
                <th>VLAN ID</th>
                <th>Name</th>
                <th>Subnet (CIDR)</th>
                <th>Appliance IP</th>
                <th>Group Policy ID (optional)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <input value={row.id} onChange={(event) => updateRow(row.key, { id: event.target.value })} />
                  </td>
                  <td>
                    <input value={row.name} onChange={(event) => updateRow(row.key, { name: event.target.value })} />
                  </td>
                  <td>
                    <input value={row.subnet} onChange={(event) => updateRow(row.key, { subnet: event.target.value })} />
                  </td>
                  <td>
                    <input
                      value={row.applianceIp}
                      onChange={(event) => updateRow(row.key, { applianceIp: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={row.groupPolicyId}
                      onChange={(event) => updateRow(row.key, { groupPolicyId: event.target.value })}
                    />
                  </td>
                  <td>
                    {row.status === 'success' ? 'Success' : row.status === 'error' ? `Error: ${row.message}` : 'Idle'}
                  </td>
                  <td>
                    <button type="button" onClick={() => removeRow(row.key)} disabled={rows.length <= 5}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="toolbar-row">
          <button type="button" className="secondary" onClick={addRow}>
            Add Row
          </button>
          <button type="button" onClick={deployBatch} disabled={loading || validRows.length === 0 || !vlansEnabled}>
            {loading ? 'Deploying VLANs...' : `Deploy VLANs (${validRows.length} valid row${validRows.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </fieldset>

      <ApiResult result={settingsResult} />
      {rows
        .filter((row) => row.result)
        .map((row) => (
          <ApiResult key={row.key} result={row.result} />
        ))}
    </section>
  );
}
