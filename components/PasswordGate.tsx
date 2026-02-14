'use client';

/**
 * Password gate — shown when accessing a protected album/subpage.
 * Submits to /api/auth and refreshes on success.
 */

import { useState } from 'react';

interface PasswordGateProps {
    slug: string;
    title: string;
}

export default function PasswordGate({ slug, title }: PasswordGateProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, password }),
            });

            if (res.ok) {
                window.location.reload();
            } else {
                setError('Wrong password');
                setPassword('');
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="password-gate">
            <div className="password-gate__card">
                <h2 className="password-gate__title">{title}</h2>
                <p className="password-gate__subtitle">
                    This gallery is password-protected.
                </p>

                <form onSubmit={handleSubmit} className="password-gate__form">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="password-gate__input"
                        autoFocus
                        required
                    />
                    <button
                        type="submit"
                        className="password-gate__button"
                        disabled={loading}
                    >
                        {loading ? 'Verifying…' : 'Enter'}
                    </button>
                </form>

                {error && <p className="password-gate__error">{error}</p>}
            </div>
        </div>
    );
}
