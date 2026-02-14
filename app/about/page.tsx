/**
 * About page — Bauhaus / Leica minimalist layout.
 * Reads content from content/about.md (frontmatter + markdown body).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import Image from 'next/image';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { immich } from '@/lib/immich';
import './about.css';

interface AboutFrontmatter {
    portrait?: string;
    name?: string;
    location?: string;
    gear?: string[];
}

function getAboutContent() {
    const raw = readFileSync(join(process.cwd(), 'content', 'about.md'), 'utf-8');
    const { data, content } = matter(raw);
    return { meta: data as AboutFrontmatter, body: content.trim() };
}

export default async function AboutPage() {
    const { meta, body } = getAboutContent();

    // Fetch ThumbHash for portrait placeholder
    const portraitAsset = meta.portrait
        ? await immich.getAssetInfo(meta.portrait)
        : null;
    const portraitPlaceholder = portraitAsset ? assetPlaceholder(portraitAsset) : null;

    return (
        <div className="about">
            {/* ── Portrait ─────────────────────────────────── */}
            <div className="about__portrait-col">
                {meta.portrait ? (
                    <Image
                        src={imageUrl(meta.portrait, 'preview')}
                        alt={meta.name || 'Portrait'}
                        className="about__portrait"
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        {...(portraitPlaceholder
                            ? { placeholder: 'blur' as const, blurDataURL: portraitPlaceholder.blurDataURL }
                            : {})}
                    />
                ) : (
                    <div className="about__portrait about__portrait--placeholder" />
                )}
            </div>

            {/* ── Text ─────────────────────────────────────── */}
            <div className="about__text-col">
                {meta.name && <h1 className="about__name">{meta.name}</h1>}
                {meta.location && (
                    <p className="about__location">{meta.location}</p>
                )}

                <hr className="about__rule" />

                {body && (
                    <div className="about__bio">
                        {body.split('\n').filter(Boolean).map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                )}

                {meta.gear && meta.gear.length > 0 && (
                    <>
                        <hr className="about__rule" />
                        <h2 className="about__section-label">Gear</h2>
                        <ul className="about__gear">
                            {meta.gear.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}

