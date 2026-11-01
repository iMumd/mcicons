# Using MCicons

## CDN

Pin a release rather than a mutable `latest` URL:

```html
<link rel="stylesheet" href="https://mcicons.mumd.dev/releases/v2.0.0/css/all.css">
<button><i class="mc mc-diamond mc-sm" aria-hidden="true"></i> Balance</button>
```

`integrity.json` in each release provides SHA-384 SRI and SHA-256 checksums for
the CSS/catalog. Add `integrity="<published sri>" crossorigin="anonymous"` when
using SRI; do not invent a hash or copy one from a different release.

For selective loading, include `css/core.css` and, for example,
`css/icons/diamond.css`. The full stylesheet does not preload every PNG.
Air is intentionally transparent, matching the item rather than a missing file.

## Direct images

```html
<img src="/assets/mcicons/icons/minecraft_diamond.png" alt="Diamond"
     width="24" height="24" loading="lazy" decoding="async"
     style="image-rendering:pixelated">
```

Use `alt=""` for decorative images beside an existing text label. A meaningful
CSS icon needs `role="img" aria-label="..."`; CSS backgrounds have no automatic
accessible name. Fixed dimensions prevent image-loading layout shifts.

## npm-compatible release package

```sh
npm install https://github.com/iMumd/mcicons/releases/download/v2.0.0/mcicons-2.0.0.tgz
```

This installs the scoped package from the versioned GitHub artifact. The scope
is its package identity, **not a claim that it has been published to npm's
registry**. No npm credentials or registry publication are required for this URL.

```ts
import { iconUrl, iconClass, type IconName } from '@imumd/mcicons';
import '@imumd/mcicons/css/all.css';

const name: IconName = 'copper-sword';
console.log(iconUrl(name));
console.log(iconClass(name, 'xl'));
```

React needs no extra wrapper dependency:

```tsx
import { iconUrl, type IconName } from '@imumd/mcicons';

export function ItemIcon({ name }: { name: IconName }) {
  return <img src={iconUrl(name)} alt="" width={24} height={24}
              style={{ imageRendering: 'pixelated' }} />;
}
```

`iconUrl(name, '/my/local/icons/')` selects self-hosted assets. The helper
validates the name's format, not membership in the full catalog: use the
generated TypeScript union or manifest when validating arbitrary external input.
It does not import or fetch the catalog at runtime.

## Subsets

```sh
npx mcicons subset --icons diamond,copper-sword --out ./my-icons
```

The output contains `mcicons.css`, two PNGs under `icons/`, a small manifest
and license notices. The CLI validates all names before creating output and
refuses to replace an existing directory. Copy the complete directory so that
its relative URLs continue to work.

## Laravel and Composer

The historical Composer name and PHP namespace are intentionally retained.
For the current GitHub release independently of Packagist indexing:

```sh
composer config repositories.mcicons vcs https://github.com/iMumd/mcicons
composer require themuhamed/mcicons:^2.0
php artisan vendor:publish --tag=mcicons-assets
```

```blade
<link rel="stylesheet" href="{{ asset('vendor/mcicons/mcicons.css') }}">
<i class="mc mc-diamond-sword mc-xl" aria-hidden="true"></i>
```

PHP users do not need Node to publish the checked-in CSS and PNGs. The optional
service provider relies on the Laravel application's `illuminate/support`.
Manual users can copy `resources/css/mcicons.css` beside an `icons/` directory
containing `public/icons/`. No site-root `/vendor` URL is hard-coded anymore.

## Sizing and motion

Default `.mc` is 1.5rem. `mc-sm`, `mc-xl`, `mc-2xl`, `mc-3xl`, `mc-4xl`, `mc-5xl`
are 1, 2, 2.5, 3, 4 and 5rem. `mc-inline` follows 1em. Override `--mc-size` for
custom sizing. Rotate/flip utilities and `mc-spin` are optional; spin respects
`prefers-reduced-motion`.

## Paths and caching

The supported release layout is `css/all.css`, `css/core.css`,
`css/icons/<name>.css`, `icons/minecraft_<identifier>.png`, `catalog.json`,
`manifest.json` and `integrity.json`. Keep their relative layout intact.
Versioned CDN files are immutable; a future release gets a new directory.
The domain is a static asset endpoint, not a claim of multi-region CDN ownership.
