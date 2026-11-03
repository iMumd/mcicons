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

## npm registry activation

The GitHub tarball is installable today without registry credentials. Registry
publication is a separate step and must never be implied by the package scope.
The maintainer must own the `@imumd` scope, bootstrap its npm package if required,
and configure an npm trusted publisher for `iMumd/mcicons`, workflow `npm.yml`,
environment `npm`. Configure approval protection on the GitHub `npm` environment.
Then dispatch the workflow with the reviewed release tag. It validates version,
runs tests and publishes with OIDC provenance, not a committed access token.
Confirm `npm view @imumd/mcicons@X.Y.Z version dist.integrity` before documenting
`npm install @imumd/mcicons` as available. If bootstrap authentication or npm
account policy is missing, leave the release tarball as the working install path.

The build requires `npm ci` in the source repository (PNG decoder is build-only).
Release output now also includes `svg/`, `definitions/`, `css/svg.css`, selective
`css/svg/` and `metrics.json`. The published package needs no postinstall build.
