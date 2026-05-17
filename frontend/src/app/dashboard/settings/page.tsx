'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Copy, KeyRound, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  addApiIpRule,
  createApiKey,
  fetchApiSettings,
  removeApiIpRule,
  revokeApiKey,
} from '@/lib/api/api-settings.api';
import { getErrorMessage } from '@/lib/errors';
import { apiUrl, formatDate } from '@/lib/utils';

export default function ApiSettingsPage() {
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState('');
  const [ipValue, setIpValue] = useState('');
  const [ipLabel, setIpLabel] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyName, setRevealedKeyName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['api-settings'],
    queryFn: fetchApiSettings,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['api-settings'] });

  const createKeyMutation = useMutation({
    mutationFn: () => createApiKey(keyName),
    onSuccess: (result) => {
      setRevealedKey(result.plainKey);
      setRevealedKeyName(result.key.name);
      setKeyName('');
      invalidate();
      toast.success(
        result.replacedPrevious
          ? 'New API key created — the previous key was revoked. Copy this secret now; it will not be shown again.'
          : 'API key generated — copy it now; it will not be shown again.',
      );
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not generate API key.')),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      invalidate();
      toast.success('API key revoked');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not revoke key.')),
  });

  const addIpMutation = useMutation({
    mutationFn: () =>
      addApiIpRule({
        value: ipValue.trim(),
        label: ipLabel.trim() || undefined,
      }),
    onSuccess: () => {
      setIpValue('');
      setIpLabel('');
      invalidate();
      toast.success('IP rule added');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not add IP rule. Check the format.')),
  });

  const removeIpMutation = useMutation({
    mutationFn: removeApiIpRule,
    onSuccess: () => {
      invalidate();
      toast.success('IP rule removed');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove IP rule.')),
  });

  const activeKey = data?.keys.find((k) => k.isActive);
  const revokedKeys = data?.keys.filter((k) => !k.isActive) ?? [];

  const copyKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">API settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage access to the external blog API (<code className="text-foreground">GET {apiUrl}/v1/blogs</code>
            ). Clients send the key in the <code className="text-foreground">x-api-key</code> header. IP
            rules are optional — leave empty to allow any IP.
          </p>
        </div>
        <Link
          href="/dashboard/docs"
          className="inline-flex h-8 items-center rounded-md border-2 border-input bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View API documentation
        </Link>
      </div>

      {/* API keys */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">API keys</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Only one API key can be active at a time. Rotating generates a new key and revokes the current one.
          The full secret is shown only once after creation.
        </p>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (activeKey) {
              const ok = window.confirm(
                'Generate a new API key? The current key will be revoked immediately and clients using it will lose access.',
              );
              if (!ok) return;
            }
            createKeyMutation.mutate();
          }}
        >
          <div className="min-w-[12rem] flex-1 space-y-2">
            <Label htmlFor="key-name">Label (optional)</Label>
            <Input
              id="key-name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Mobile app — or leave blank for auto name"
              maxLength={80}
            />
          </div>
          <Button type="submit" disabled={createKeyMutation.isPending}>
            <Plus className="mr-1.5 h-4 w-4" />
            {createKeyMutation.isPending
              ? 'Generating…'
              : activeKey
                ? 'Rotate API key'
                : 'Generate API key'}
          </Button>
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading keys…</p>
        ) : activeKey ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{activeKey.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{activeKey.keyPrefix}…</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {formatDate(activeKey.createdAt)}
                  {activeKey.lastUsedAt ? ` · Last used ${formatDate(activeKey.lastUsedAt)}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={revokeMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Revoke "${activeKey.name}"? External clients will stop working until you generate a new key.`,
                    )
                  ) {
                    revokeMutation.mutate(activeKey._id);
                  }
                }}
              >
                Revoke
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active API key. Generate one to enable the external API.</p>
        )}

        {revokedKeys.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {revokedKeys.length} revoked key{revokedKeys.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {revokedKeys.map((key) => (
                <li key={key._id}>
                  {key.name} · <span className="font-mono text-xs">{key.keyPrefix}…</span> ·{' '}
                  {formatDate(key.createdAt)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {data?.envFallback.hasPublicApiKey ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            A legacy <code className="text-foreground">PUBLIC_API_KEY</code> env variable is also accepted until
            you remove it from the server.
          </p>
        ) : null}
      </section>

      {/* IP whitelist */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">IP whitelist (optional)</h2>
          </div>
          {data?.ipWhitelistEnabled ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Enforcement on
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Any IP allowed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          When you add at least one rule, only those IPs or CIDR ranges can call the external API (with a valid
          key). Supports IPv4, IPv6, and CIDR (e.g. <code className="text-foreground">203.0.113.0/24</code>).
        </p>

        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ipValue.trim()) {
              toast.error('Enter an IP address or CIDR.');
              return;
            }
            addIpMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="ip-value">IP or CIDR</Label>
            <Input
              id="ip-value"
              value={ipValue}
              onChange={(e) => setIpValue(e.target.value)}
              placeholder="203.0.113.10 or 10.0.0.0/8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-label">Label (optional)</Label>
            <Input
              id="ip-label"
              value={ipLabel}
              onChange={(e) => setIpLabel(e.target.value)}
              placeholder="e.g. Office VPN"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="secondary" disabled={addIpMutation.isPending}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add IP rule
            </Button>
          </div>
        </form>

        {data?.ipRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No IP rules — all IPs can use the API with a valid key.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {data?.ipRules.map((rule) => (
              <li
                key={rule._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-mono font-medium">{rule.value}</p>
                  {rule.label ? (
                    <p className="text-muted-foreground">{rule.label}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={removeIpMutation.isPending}
                  onClick={() => removeIpMutation.mutate(rule._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {data?.envFallback.hasIpWhitelistEnv ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Additional IPs from <code className="text-foreground">PUBLIC_API_IP_WHITELIST</code> in server env
            are merged with this list.
          </p>
        ) : null}
      </section>

      {revealedKey ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-card-foreground">Copy your new API key</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Key label: <span className="font-medium text-foreground">{revealedKeyName}</span>. This secret
              is shown only once. Store it securely.
            </p>
            <div className="mt-4 flex gap-2">
              <Input readOnly value={revealedKey} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="secondary" size="sm" onClick={() => void copyKey()}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setRevealedKey(null);
                  setRevealedKeyName('');
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
