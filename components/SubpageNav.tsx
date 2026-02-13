/**
 * SubpageNav — server component that renders navigation links
 * for all subpages and standalone albums in the header.
 */

import Link from 'next/link';
import { immich } from '@/lib/immich';

export async function SubpageNav() {
    const [subpages, standaloneAlbums] = await Promise.all([
        immich.getSubpages(),
        immich.getStandaloneAlbums(),
    ]);

    return (
        <>
            {subpages.map((sp) => (
                <Link
                    key={sp.slug}
                    href={`/${sp.slug}`}
                    className="header__nav-link"
                >
                    {sp.name}
                </Link>
            ))}
            {standaloneAlbums.map((album) => (
                <Link
                    key={album.id}
                    href={`/${album.slug}`}
                    className="header__nav-link"
                >
                    {album.albumName}
                </Link>
            ))}
        </>
    );
}
