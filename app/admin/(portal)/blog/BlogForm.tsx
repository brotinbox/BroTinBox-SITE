import Image from 'next/image';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { deleteBlogPost, saveBlogPost } from './actions';

function toIstLocal(v: string | null | undefined) {
  if (!v) return '';
  return new Date(new Date(v).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16);
}

export function BlogForm({ post, categories, canWrite }: {
  post: Record<string, any> | null;
  categories: { id: string; name: string }[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      <ActionForm action={saveBlogPost} className="space-y-4">
        {post && <input type="hidden" name="id" value={post.id} />}
        <fieldset disabled={!canWrite} className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Field label="Title"><Input name="title" defaultValue={post?.title ?? ''} required minLength={3} maxLength={200} /></Field>
            <Field label="URL slug" hint="Shown as /blog/<slug>. Lowercase letters, numbers and dashes.">
              <Input name="slug" defaultValue={post?.slug ?? ''} required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </Field>
            <Field label="Excerpt" hint="One or two sentences for the blog list and social previews.">
              <Textarea name="excerpt" defaultValue={post?.excerpt ?? ''} maxLength={400} className="min-h-16" />
            </Field>
            <Field label="Content (Markdown)" hint="# Heading, **bold**, *italic*, - lists, 1. lists, > quote, [link](https://…). HTML is not allowed.">
              <Textarea name="content" defaultValue={post?.content ?? ''} maxLength={60000} className="min-h-[28rem] font-mono text-[13px]" />
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Status">
              <Select name="status" defaultValue={post?.status ?? 'draft'} options={[
                { value: 'draft', label: 'Draft (hidden)' }, { value: 'published', label: 'Published' },
                { value: 'scheduled', label: 'Scheduled' }, { value: 'archived', label: 'Archived (hidden)' },
              ]} />
            </Field>
            <Field label="Publish time (IST)" hint="Required for scheduled posts. Empty = now when publishing.">
              <Input type="datetime-local" name="published_at" defaultValue={toIstLocal(post?.published_at)} />
            </Field>
            <Field label="Category">
              <Select name="category_id" defaultValue={post?.category_id ?? ''} options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
            </Field>
            <Field label="Tags" hint="Comma separated"><Input name="tags" defaultValue={(post?.tags ?? []).join(', ')} maxLength={400} /></Field>
            <Field label="Author name"><Input name="author_name" defaultValue={post?.author_name ?? ''} maxLength={80} /></Field>
            <Field label="Author role"><Input name="author_role" defaultValue={post?.author_role ?? ''} maxLength={120} /></Field>
            <Field label="Macro highlight" hint="e.g. 80 g protein · 600 kcal"><Input name="macros_highlight" defaultValue={post?.macros_highlight ?? ''} maxLength={120} /></Field>
            <Field label="Cover image" hint="JPG, PNG, WebP or AVIF, up to 5 MB">
              {post?.cover_image_url && <Image src={post.cover_image_url} alt="" width={320} height={180} className="mb-2 rounded-lg object-cover w-full" />}
              <Input type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/avif" />
            </Field>
            <Field label="SEO title" hint="Up to 70 characters"><Input name="seo_title" defaultValue={post?.seo_title ?? ''} maxLength={70} /></Field>
            <Field label="SEO description" hint="Up to 170 characters"><Textarea name="seo_description" defaultValue={post?.seo_description ?? ''} maxLength={170} className="min-h-16" /></Field>
            <Checkbox name="is_featured" label="Feature at the top of the blog" defaultChecked={post?.is_featured ?? false} />
          </div>
        </fieldset>
        {canWrite && <SubmitButton>{post ? 'Save post' : 'Create post'}</SubmitButton>}
      </ActionForm>
      {post && canWrite && (
        <ActionForm action={deleteBlogPost} className="pt-4 border-t border-gray-100">
          <input type="hidden" name="id" value={post.id} />
          <SubmitButton variant="danger" confirm="Delete this post permanently?">Delete post</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
