<img src="docs/wordmark.svg" alt="MCicons pixel wordmark" width="258">

**Minecraft icons for real interfaces. Local-first, selectively loaded, framework optional.**

1,659 multicolor pixel icons. CSS classes, genuine SVG paths, individual ESM
definitions, an optional React component and an offline subset builder.
No icon font. No mandatory CDN. No runtime dependencies in the core package.

[Browse](https://mcicons.mumd.dev/icons) · [Documentation](docs/USAGE.md) ·
[Artwork provenance](docs/ASSETS.md) · [Contributing](CONTRIBUTING.md)

## Install

```sh
npm install https://github.com/iMumd/mcicons/releases/download/v2.1.0/mcicons-2.1.0.tgz
```

The installed package is `@imumd/mcicons`. This is the public GitHub release
artifact, **not a claim of npm registry publication**. Once the maintainer
configures npm trusted publishing, the same package can be published using the
included workflow. Installation needs a connection once; local builds and
deployed icons do not depend on MCicons servers.

## CSS classes, no JavaScript

```js
import '@imumd/mcicons/css/core.css';
import '@imumd/mcicons/css/svg/diamond-sword.css';
```

```html
<i class="mc mc-diamond-sword mc-xl" role="img" aria-label="Diamond sword"></i>
```

Vite and other CSS-aware bundlers copy the referenced SVG into your own build.
Import `css/svg.css` for every SVG selector, or `css/all.css` for compatible PNG
selectors. Only used CSS backgrounds request assets. Never import the entire
catalog into application JavaScript just to display one icon.

## React: one imported icon, no image requests

```tsx
import { Icon } from '@imumd/mcicons/react';
import diamondSword from '@imumd/mcicons/definitions/diamond-sword';

<Icon icon={diamondSword} size={32} title="Diamond sword" />
```

The component renders inline SVG and works with server rendering. React is an
optional peer, not included in the core runtime. Omit `title` for decoration
beside visible text. Definitions have individual import paths: unused icons
are never imported in the first place.

## Offline CSS kit

```sh
npx --no-install mcicons subset --icons diamond-sword,emerald --format svg --embed --out ./public/my-icons
```

```html
<link rel="stylesheet" href="/my-icons/mcicons.css">
<i class="mc mc-diamond-sword mc-xl" aria-hidden="true"></i>
```

One local stylesheet, two embedded vectors, **zero separate image requests**.
No JavaScript at runtime. Deploy its license notices too. Output directories
are never overwritten. Embedded data URIs need `img-src data:` under CSP;
use `--format svg` without `--embed` if your policy requires external local SVGs.

## Vanilla JavaScript and SSR

```js
import sword from '@imumd/mcicons/definitions/diamond-sword';
import { iconSvg, mountIcons } from '@imumd/mcicons/svg';

const markup = iconSvg(sword, { title: 'Diamond sword', size: 32 });
// Optional, explicit replacement of matching .mc elements in a DOM root:
mountIcons([sword], document);
```

No automatic DOM observer, global registry or catalog fetch. `iconSvg` escapes
titles and attributes. Definitions must come from trusted package imports.
Mounting replaces nodes; attach listeners afterwards, not to icon placeholders.

## Pick the right payload

| Delivery | Best for | Network at runtime |
| --- | --- | --- |
| Embedded SVG subset | Small offline icon sets | One local CSS file |
| Individual definitions | React / inline SVG / SSR | Part of your own JS or HTML |
| Selective SVG CSS | CSS-only vector interfaces | Local CSS + used SVG files |
| Selective PNG CSS | Minimum transfer for detailed pixel artwork | Local CSS + used PNG files |
| Full CSS | Prototypes and large dynamic catalogs | Selectors + used assets only |

**SVG is not automatically smaller.** The complete source PNG set is 2,351,525
bytes; lossless SVGs total 19,107,259 bytes raw / 4,063,421 bytes summed per-file
gzip. Geometry preserves every colored pixel and alpha, rather than smoothing
the artwork or embedding PNGs. Use subsets and measure your actual bundle.
Builds publish `dist/metrics.json`; tests enforce single-icon and subset budgets.

## Compatibility and provenance

- All 1,659 original PNGs and existing `mc-*` class names remain available.
- `iconUrl`, `iconClass`, TypeScript `IconName`, and the
  `themuhamed/mcicons` Composer/Laravel integration remain supported.
- Java 26.3, verified official sources, 263 additions and one retained
  compatibility identifier. No game client archives are distributed.
- Vectorization reproduces the shipped static previews; it does not claim
  animated states or pixel parity with Minecraft's game renderer.

## Development

```sh
npm ci
npm test
php tests/provider.php
npm pack --dry-run
```

Node 22+, with PNG decoding and SVG rasterization used **only during build/test**.
Tests check all source hashes, all vector pixels, real SVG rendering, SSR,
accessibility, injection escaping, safe subsets, types and selective bundling.
[Release and npm publishing procedures](docs/RELEASING.md).

## License

Software and documentation: [MIT](LICENSE). Minecraft artwork, including SVG
derivatives, belongs to Mojang Studios / Microsoft and is **not** relicensed
under MIT. Read [ASSET-NOTICE.md](ASSET-NOTICE.md). Independent project; not an
official Minecraft product.

[GitHub](https://github.com/iMumd) · [hi@mumd.dev](mailto:hi@mumd.dev)
