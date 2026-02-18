export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidVlanId(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4094;
}

export function isValidSsidNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 14;
}

export function isValidPsk(value: string): boolean {
  return value.length >= 8 && value.length <= 63;
}

export function isValidIpv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

export function isValidCidr(value: string): boolean {
  const [ip, mask] = value.split('/');
  if (!ip || !mask) return false;
  const maskNum = Number(mask);
  return isValidIpv4(ip) && Number.isInteger(maskNum) && maskNum >= 1 && maskNum <= 32;
}

export function isValidAllowedVlans(value: string): boolean {
  if (value === 'all') return true;
  return /^(\d+(-\d+)?)(,(\d+(-\d+)?))*$/.test(value);
}
