import { BlockList } from 'net';
import { isIPv4, isIPv6 } from 'net';

export function parseIpWhitelist(entries: string[]): BlockList | null {
  const trimmed = entries.map((e) => e.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return null;
  }

  const list = new BlockList();

  for (const entry of trimmed) {
    if (entry.includes('/')) {
      const [addr, prefixStr] = entry.split('/');
      const prefix = Number(prefixStr);
      if (!addr || !Number.isInteger(prefix)) {
        throw new Error(`Invalid CIDR in whitelist: ${entry}`);
      }
      const type = isIPv6(addr) ? 'ipv6' : 'ipv4';
      list.addSubnet(addr, prefix, type);
      continue;
    }

    const normalized = entry.startsWith('::ffff:') ? entry.slice(7) : entry;
    if (!isIPv4(normalized) && !isIPv6(normalized)) {
      throw new Error(`Invalid IP in whitelist: ${entry}`);
    }
    const type = isIPv6(normalized) ? 'ipv6' : 'ipv4';
    list.addAddress(normalized, type);
  }

  return list;
}

export function isIpAllowed(blockList: BlockList | null, clientIp: string): boolean {
  if (!blockList) {
    return true;
  }
  if (!clientIp) {
    return false;
  }

  const normalized = clientIp.startsWith('::ffff:') ? clientIp.slice(7) : clientIp;

  if (isIPv4(normalized)) {
    return blockList.check(normalized, 'ipv4');
  }
  if (isIPv6(normalized)) {
    return blockList.check(normalized, 'ipv6');
  }
  return false;
}
