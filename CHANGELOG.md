# Changelog

## 2.1.1

- Fix standalone selective PNG/SVG stylesheets: bind background-image in the
  declaring stylesheet so relative custom-property URLs resolve correctly when
  linked beside core.css without a bundler. Full CSS and embedded kits are
  unchanged. Existing 2.1.0 artifacts are not overwritten.
- Add browser regression coverage decoding the actual selective SVG and PNG.

## 2.1.0

- Add 1,659 genuine, lossless multicolor SVGs and individually importable typed
  definitions. Preserve every nontransparent source pixel and alpha value.
- Add optional SSR-safe React and vanilla SVG entry points; no core runtime
  dependencies, automatic observers or mandatory CDN requests.
- Add selective SVG CSS and safe `subset --format svg --embed` offline kits.
- Preserve PNG URLs, CSS classes, helper APIs and Composer/Laravel integration.
- Add pixel/raster/SSR/type/bundle tests, payload metrics, local-first guidance
  and an explicit npm trusted-publishing workflow. Registry credentials/config
  are still required; GitHub package artifacts are the verified install path.

## 2.0.0

MCicons resumes active maintenance with a reproducible asset and release pipeline.

- Add 263 previews from verified Minecraft Java 26.3 data; retain all 1,396
  original assets and the existing CSS/PHP identifiers.
- Add portable full/core/per-icon CSS, a safe subset CLI, typed ESM helpers,
  integrity metadata and a versioned catalog.
- Remove tracked Composer-generated vendor files; retain Laravel publishing
  compatibility without hard-coded site-root asset URLs.
- Add asset/hash, CSS, CLI, payload-budget and PHP-contract validation with CI.
- Document Minecraft asset attribution separately from the software MIT license.

## 1.0.0 — 2025-05-28

Initial public release with PNG assets, CSS classes and Laravel asset publishing.
