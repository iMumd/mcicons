# Releases

1. Work on a branch with focused commits. Run `npm ci`, `npm test`,
   `composer validate --strict --no-check-publish` and `php tests/provider.php`.
2. Review regenerated asset provenance, CSS portability, compressed-size budgets,
   TypeScript definitions, accessibility examples and package contents.
3. Merge only after CI passes. Build on the exact reviewed commit.
4. Run `npm pack` to create the npm-compatible artifact. Package `dist/` as a
   downloadable ZIP and produce SHA-256 checksums for both artifacts.
5. Tag the reviewed commit `vX.Y.Z` and publish plain, descriptive release notes
   with counts, source version, compatibility changes, limits and migration steps.
6. Upload artifacts and checksums, then verify their public URLs and checksums.
   Do not claim npm/Packagist publication unless those registries actually show it.
7. Stage CDN assets into a new, immutable `releases/vX.Y.Z/` directory. Test CSS,
   PNG MIME types, SRI, CORS, caching and missing-file 404s before linking it from
   the site. Never overwrite a published version with different bytes.

The original `v1.0.0` tag remains intact. Its display title can be cleaned up;
that must not rewrite Git history or alter old release source archives.
Infrastructure credentials and private deployment helpers do not belong here.
