'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { createTag, fetchDashboardTags } from '@/lib/api/tags.api';
import { getErrorMessage } from '@/lib/errors';

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#64748b');

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', 'dashboard'],
    queryFn: fetchDashboardTags,
  });

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      toast.success('Tag created');
      setName('');
      setDescription('');
      setColor('#64748b');
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'We could not create that tag. It may already exist.')),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Tags</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create topics for blog posts. Authors assign tags when writing; only admins manage this list.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) {
            toast.error('Tag name is required.');
            return;
          }
          createMutation.mutate({
            name: trimmed,
            description: description.trim() || undefined,
            color: color || undefined,
          });
        }}
      >
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tag-name">Name</Label>
          <Input
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Engineering"
            maxLength={50}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tag-description">Description (optional)</Label>
          <Textarea
            id="tag-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Short label for this topic"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag-color">Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="tag-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
            />
            <Input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="font-mono text-sm"
              placeholder="#64748b"
            />
          </div>
        </div>
        <div className="flex items-end md:col-span-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create tag'}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="min-w-full text-left text-sm text-card-foreground">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Posts</th>
              <th className="px-4 py-3 font-medium">Color</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  Loading tags…
                </td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                  No tags yet. Create one above to use in the blog composer.
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag._id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{tag.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tag.slug}</td>
                  <td className="px-4 py-3">{tag.blogCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: tag.color ?? '#64748b' }}
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {tag.color ?? '#64748b'}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
