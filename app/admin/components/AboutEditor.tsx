'use client';

import { useState, useEffect, useCallback } from 'react';
import AssetPicker from './AssetPicker';

export default function AboutEditor() {
  const [meta, setMeta] = useState<Record<string, any>>({});
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  useEffect(() => {
    loadAbout();
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
  }, [dirty, saving, meta, body]);

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

  async function loadAbout() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/about');
      if (res.ok) {
        const data = await res.json();
        setMeta(data.meta || {});
        setBody(data.body || '');
      }
    } catch (err) {
      console.error('Failed to load about page:', err);
    } finally {
      setLoading(false);
    }
  }

  function updateMeta(key: string, value: unknown) {
    setMeta((m) => ({ ...m, [key]: value }));
    setDirty(true);
    setSaveMessage('');
  }

  function addGear() {
    const gear = [...(meta.gear || []), ''];
    updateMeta('gear', gear);
  }

  function updateGear(index: number, value: string) {
    const gear = [...(meta.gear || [])];
    gear[index] = value;
    updateMeta('gear', gear);
  }

  function removeGear(index: number) {
    const gear = [...(meta.gear || [])];
    gear.splice(index, 1);
    updateMeta('gear', gear.length > 0 ? gear : undefined);
  }

  function handlePortraitSelect(assetId: string) {
    updateMeta('portrait', assetId);
    setShowAssetPicker(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');

    // Clean up - remove empty portrait
    const cleanedMeta = { ...meta };
    if (!cleanedMeta.portrait) delete cleanedMeta.portrait;
    if (cleanedMeta.name === '') delete cleanedMeta.name;
    if (cleanedMeta.location === '') delete cleanedMeta.location;
    if (Array.isArray(cleanedMeta.gear)) {
      cleanedMeta.gear = cleanedMeta.gear.filter((g: string) => g.trim());
      if (cleanedMeta.gear.length === 0) delete cleanedMeta.gear;
    }

    try {
      const res = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta: cleanedMeta, bodyText: body }),
      });

      if (res.ok) {
        setDirty(false);
        setSaveMessage('Saved!');
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

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div className="settings-editor">
      <div className={`save-bar ${dirty ? 'dirty' : ''}`}>
        <div className="save-bar-left">
          {dirty && <span className="unsaved-badge">Unsaved changes</span>}
          {saveMessage && (
            <span className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}>
              {saveMessage}
            </span>
          )}
          {!dirty && !saveMessage && <span className="save-hint">⌘S to save</span>}
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving...' : 'Save About Page'}
        </button>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          <button className="settings-nav-item active">Content</button>
          <button className="settings-nav-item" disabled style={{ opacity: 0.4 }}>Appearance</button>
        </nav>

        <div className="settings-content">
          <div className="settings-panel">
            <h3>Portrait</h3>
            <div className="about-portrait-section">
              {meta.portrait ? (
                <div className="about-portrait-preview">
                  <img src={`/api/admin/thumbnail/${meta.portrait}`} alt="Portrait" />
                  <button
                    className="admin-btn admin-btn-sm about-portrait-remove"
                    onClick={() => updateMeta('portrait', undefined)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="about-portrait-placeholder" onClick={() => setShowAssetPicker(true)}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>Click to select portrait photo</span>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: 24 }}>Info</h3>
            <div className="admin-field">
              <label>Name</label>
              <input
                value={meta.name || ''}
                onChange={(e) => updateMeta('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="admin-field">
              <label>Location</label>
              <input
                value={meta.location || ''}
                onChange={(e) => updateMeta('location', e.target.value)}
                placeholder="Anytown, USA"
              />
            </div>

            <h3 style={{ marginTop: 24 }}>Gear</h3>
            <div className="about-gear-list">
              {(meta.gear || []).map((item: string, i: number) => (
                <div key={i} className="about-gear-row">
                  <input
                    value={item}
                    onChange={(e) => updateGear(i, e.target.value)}
                    placeholder="Camera / Lens"
                  />
                  <button
                    className="admin-btn-icon admin-btn-icon-danger"
                    onClick={() => removeGear(i)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="admin-btn admin-btn-sm" onClick={addGear}>
                + Add Item
              </button>
            </div>

            <h3 style={{ marginTop: 24 }}>Bio</h3>
            <div className="admin-field">
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setDirty(true);
                  setSaveMessage('');
                }}
                placeholder="Write your bio here... Each blank line becomes a paragraph."
                rows={8}
                style={{ fontFamily: 'monospace' }}
              />
              <p className="about-bio-hint">
                Blank lines separate paragraphs. Markdown is supported.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAssetPicker && (
        <AssetPicker
          onSelect={handlePortraitSelect}
          onClose={() => setShowAssetPicker(false)}
          currentAssetIds={meta.portrait ? [meta.portrait] : []}
          title="Select Portrait Photo"
        />
      )}
    </div>
  );
}
