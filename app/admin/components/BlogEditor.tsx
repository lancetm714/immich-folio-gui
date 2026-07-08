'use client';

import { useState, useEffect } from 'react';
import AssetPicker from './AssetPicker';

interface BlogPost {
  title: string;
  slug: string;
  date: string;
  tags?: string[];
  coverImage?: string;
  published?: boolean;
  excerpt?: string;
  body: string;
}

export default function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPost>({
    title: '',
    slug: '',
    date: new Date().toISOString().split('T')[0],
    tags: [],
    published: false,
    excerpt: '',
    body: '',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty, saving, form]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  }

  // '' = creating new post, string = editing existing, null = listing
  const isEditing = editingSlug !== null;

  function newPost() {
    const slugBase = `post-${Date.now()}`;
    setEditingSlug('');
    setForm({
      title: '',
      slug: slugBase,
      date: new Date().toISOString().split('T')[0],
      tags: [],
      published: false,
      excerpt: '',
      body: '',
    });
    setDirty(false);
    setSaveMessage('');
  }

  async function editPost(slug: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          title: data.title || '',
          slug: data.slug,
          date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
          tags: data.tags || [],
          coverImage: data.coverImage || undefined,
          published: data.published ?? false,
          excerpt: data.excerpt || '',
          body: data.body || '',
        });
        setEditingSlug(slug);
        setDirty(false);
        setSaveMessage('');
      }
    } catch (err) {
      console.error('Failed to load blog post:', err);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaveMessage('');
  }

  function addTag() {
    setForm((f) => ({ ...f, tags: [...(f.tags || []), ''] }));
    setDirty(true);
    setSaveMessage('');
  }

  function updateTag(index: number, value: string) {
    const tags = [...(form.tags || [])];
    tags[index] = value;
    setForm((f) => ({ ...f, tags }));
    setDirty(true);
    setSaveMessage('');
  }

  function removeTag(index: number) {
    const tags = [...(form.tags || [])];
    tags.splice(index, 1);
    setForm((f) => ({ ...f, tags: tags.length > 0 ? tags : undefined }));
    setDirty(true);
    setSaveMessage('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');

    const cleanedMeta: Record<string, any> = {
      title: form.title,
      slug: form.slug,
      date: form.date,
      published: form.published,
    };
    if (form.tags && form.tags.length > 0) {
      cleanedMeta.tags = form.tags.filter((t) => t.trim());
      if (cleanedMeta.tags.length === 0) delete cleanedMeta.tags;
    }
    if (form.coverImage) cleanedMeta.coverImage = form.coverImage;
    if (form.excerpt) cleanedMeta.excerpt = form.excerpt;

    try {
      const res = await fetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: form.slug, meta: cleanedMeta, bodyText: form.body }),
      });

      if (res.ok) {
        setDirty(false);
        setSaveMessage('Saved!');
        setEditingSlug(form.slug);
        await loadPosts();
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        const err = await res.json();
        setSaveMessage(`Error: ${err.error}`);
      }
    } catch {
      setSaveMessage('Error: Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingSlug || editingSlug === '') return;
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog?slug=${editingSlug}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingSlug(null);
        setSaveMessage('');
        setDirty(false);
        setForm({
          title: '',
          slug: '',
          date: new Date().toISOString().split('T')[0],
          tags: [],
          published: false,
          excerpt: '',
          body: '',
        });
        await loadPosts();
      } else {
        const err = await res.json();
        setSaveMessage(`Error: ${err.error}`);
      }
    } catch {
      setSaveMessage('Error: Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  function handleCoverSelect(assetId: string) {
    updateField('coverImage', assetId);
    setShowAssetPicker(false);
  }

  if (loading && posts.length === 0 && !isEditing) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (isEditing && !loading) {
    return (
      <div className="settings-editor">
        <div className={`save-bar ${dirty ? 'dirty' : ''}`}>
          <div className="save-bar-left">
            <button
              className="admin-btn admin-btn-sm"
              onClick={() => {
                setEditingSlug(null);
                setDirty(false);
              }}
            >
              ← Back
            </button>
            {dirty && <span className="unsaved-badge">Unsaved changes</span>}
            {saveMessage && (
              <span
                className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}
              >
                {saveMessage}
              </span>
            )}
            {!dirty && !saveMessage && <span className="save-hint">⌘S to save</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editingSlug !== '' && editingSlug && (
              <button
                className="admin-btn admin-btn-sm"
                onClick={handleDelete}
                disabled={saving}
                style={{ color: 'var(--admin-error)' }}
              >
                Delete
              </button>
            )}
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </div>

        <div className="settings-layout">
          <nav className="settings-nav">
            <button className="settings-nav-item active">Content</button>
          </nav>

          <div className="settings-content">
            <div className="settings-panel">
              <div className="admin-field-row">
                <div className="admin-field">
                  <label>Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="My Blog Post"
                  />
                </div>
                <div className="admin-field">
                  <label>Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    placeholder="my-blog-post"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div
                  className="admin-field"
                  style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.6rem' }}
                >
                  <label className="admin-field-checks" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={form.published ?? false}
                      onChange={(e) => updateField('published', e.target.checked)}
                    />
                    Published
                  </label>
                </div>
              </div>

              <h3 style={{ marginTop: 24 }}>Cover Image</h3>
              <div className="about-portrait-section">
                {form.coverImage ? (
                  <div className="about-portrait-preview">
                    <img
                      src={`/api/admin/thumbnail/${form.coverImage}`}
                      alt="Cover"
                      style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                    />
                    <button
                      className="admin-btn admin-btn-sm about-portrait-remove"
                      onClick={() => updateField('coverImage', undefined)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className="about-portrait-placeholder"
                    onClick={() => setShowAssetPicker(true)}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span>Click to select cover image</span>
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: 24 }}>Tags</h3>
              <div className="about-gear-list">
                {(form.tags || []).map((tag, i) => (
                  <div key={i} className="about-gear-row">
                    <input
                      value={tag}
                      onChange={(e) => updateTag(i, e.target.value)}
                      placeholder="Tag"
                    />
                    <button
                      className="admin-btn-icon admin-btn-icon-danger"
                      onClick={() => removeTag(i)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className="admin-btn admin-btn-sm" onClick={addTag}>
                  + Add Tag
                </button>
              </div>

              <h3 style={{ marginTop: 24 }}>Excerpt</h3>
              <div className="admin-field">
                <textarea
                  value={form.excerpt || ''}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                  placeholder="A short summary for the blog listing..."
                  rows={2}
                />
              </div>

              <h3 style={{ marginTop: 24 }}>Body (Markdown)</h3>
              <div className="admin-field">
                <textarea
                  value={form.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  placeholder="Write your blog post in Markdown..."
                  rows={16}
                  style={{ fontFamily: 'monospace', minHeight: 400 }}
                />
              </div>
            </div>
          </div>
        </div>

        {showAssetPicker && (
          <AssetPicker
            onSelect={handleCoverSelect}
            onClose={() => setShowAssetPicker(false)}
            currentAssetIds={form.coverImage ? [form.coverImage] : []}
            title="Select Cover Image"
          />
        )}
      </div>
    );
  }

  return (
    <div className="settings-editor">
      <div className="builder-section-header" style={{ marginBottom: 16 }}>
        <h2>Blog Posts</h2>
        <button className="admin-btn admin-btn-primary" onClick={newPost}>
          + New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="empty-hint">
          No blog posts yet. Click "+ New Post" to create your first post.
        </div>
      ) : (
        <div className="album-list" style={{ gridTemplateColumns: '1fr' }}>
          {posts.map((post) => (
            <div
              key={post.slug}
              className="album-tile"
              style={{ display: 'flex', cursor: 'pointer' }}
              onClick={() => editPost(post.slug)}
            >
              {post.coverImage ? (
                <div
                  className="album-tile-cover"
                  style={{ width: 160, minWidth: 160, aspectRatio: '16/9' }}
                >
                  <img src={`/api/admin/thumbnail/${post.coverImage}`} alt="" />
                </div>
              ) : (
                <div
                  className="album-tile-cover"
                  style={{ width: 160, minWidth: 160, aspectRatio: '16/9' }}
                >
                  <div className="album-tile-placeholder">📝</div>
                </div>
              )}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong>{post.title || 'Untitled'}</strong>
                  {!post.published && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--admin-text-muted)',
                        background: 'var(--admin-bg-elevated)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Draft
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>
                  {post.date} &middot; /blog/{post.slug}
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--admin-text-muted)',
                          background: 'var(--admin-bg-elevated)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
