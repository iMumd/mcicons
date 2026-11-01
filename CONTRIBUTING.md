# Contributing

Small, focused PRs are welcome. Preserve existing `mc-*` class names and the
historical PHP package namespace unless a documented major migration is intended.

```sh
npm ci
npm test
php tests/provider.php
```

Builds have no Node runtime dependencies. Tests validate every PNG's dimensions
and hash, current identifiers, generated CSS paths, package budgets, safe subset
behavior and the Laravel publishing contract.

For asset changes, use the [verified import procedure](docs/ASSETS.md), keep
source hashes and honest rendering limits, and inspect representative output.
Do not add arbitrary internet images, full game archives, credentials or generated
`vendor/` directories. New software-rendered icons do not change Mojang's rights.

For browser examples, include an accessible name or explicitly mark decorative
icons, avoid cumulative layout shifts and do not make the site preload the full
catalog of image files. Update documentation and tests with behavior changes.
