import { api } from '@/lib/api/axios';

export type ApiKeyRecord = {
  _id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export type ApiIpRule = {
  _id: string;
  label: string;
  value: string;
  createdAt: string;
};

export type ApiSettingsOverview = {
  keys: ApiKeyRecord[];
  ipRules: ApiIpRule[];
  ipWhitelistEnabled: boolean;
  envFallback: {
    hasPublicApiKey: boolean;
    hasIpWhitelistEnv: boolean;
  };
};

export type CreateApiKeyResult = {
  plainKey: string;
  key: ApiKeyRecord;
  replacedPrevious: boolean;
};

export async function fetchApiSettings() {
  const { data: body } = await api.get<{ data: ApiSettingsOverview }>('/api-settings');
  return body.data;
}

export async function createApiKey(name?: string) {
  const { data: body } = await api.post<{ data: CreateApiKeyResult }>('/api-settings/keys', {
    ...(name?.trim() ? { name: name.trim() } : {}),
  });
  return body.data;
}

export async function revokeApiKey(id: string) {
  const { data: body } = await api.delete<{ data: ApiKeyRecord }>(`/api-settings/keys/${id}`);
  return body.data;
}

export async function addApiIpRule(payload: { value: string; label?: string }) {
  const { data: body } = await api.post<{ data: ApiIpRule }>('/api-settings/ip-rules', payload);
  return body.data;
}

export async function removeApiIpRule(id: string) {
  await api.delete(`/api-settings/ip-rules/${id}`);
}
