'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { createUser, fetchUsers } from '@/lib/api/users.api';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/errors';
import type { Role } from '@/types/api.types';

const adminRoles: Role[] = ['AUTHOR', 'REVIEWER'];
const superAdminRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'AUTHOR', 'REVIEWER'];

export default function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('AUTHOR');

  const assignableRoles = user?.role === 'SUPER_ADMIN' ? superAdminRoles : adminRoles;

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers({ page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('User created');
      setName('');
      setEmail('');
      setPassword('');
      setRole('AUTHOR');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'We could not create that user. Please review the form and try again.')),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create author and reviewer accounts, or manage privileged roles as super admin.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate({ name, email, password, role });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {assignableRoles.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create user'}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="min-w-full text-left text-sm text-card-foreground">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  Loading users...
                </td>
              </tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item._id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.role}</td>
                  <td className="px-4 py-3">{item.isActive === false ? 'Inactive' : 'Active'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
