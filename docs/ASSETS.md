# Asset verification and regeneration

Target: **Minecraft Java 26.3**, the stable release reported by Mojang's version
manifest during this update. Snapshot `26.4-snapshot-6` was not imported.

- Official current item definitions: **1,658**.
- Retained 1.0 PNGs: **1,396**, unchanged.
- New 26.3 previews: **263**.
- Distributed assets: **1,659**. `chain` is retained for compatibility while the
  current `iron_chain` identifier is included separately.
- Current identifier coverage: **1,658 / 1,658**. This measures names/assets,
  not pixel-identical rendering, animation variants or arbitrary item components.

`data/minecraft-source.json` records the official client URL, SHA-1, independently
computed SHA-256, complete current identifier list, new definition paths and
generated PNG SHA-256 hashes. `data/legacy-icons.json` fixes the retained baseline.
The Air asset is intentionally transparent. Runtime catalogs do not need the
game archive or these build-time model definitions.

The importer resolves inherited models, GUI-context variants, ordinary sprite
layers, cuboid geometry/UVs, initial animation frames, and the required new
chest/statue/composite previews. It renders deterministic, static software
previews. Shader effects, every animation frame, all poses and game-renderer
pixel parity are not promised. Selected new previews were inspected visually.

## Reproduce

1. Fetch the official [version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json).
2. Choose a stable entry and verify its metadata SHA-1 before reading the client
   download URL. Download the client only as a local build input, verifying its
   size and published SHA-1. Never commit or redistribute the game JAR.
3. Install the pinned development image dependency and run:

   ```sh
   python -m pip install -r requirements-assets.txt
   python tools/import-minecraft.py --jar /path/to/client.jar --metadata /path/to/version.json
   npm test
   ```

4. Review the added PNGs, report and item coverage. An unsupported model must
   appear in `unavailable`, not become a fake placeholder. The package build
   refuses incomplete current identifier coverage.

Importing the same verified input again regenerates the same added set and
preserves the legacy baseline. Generation uses Python/Pillow during maintenance,
not at page load. Read [the asset rights notice](../ASSET-NOTICE.md) before use.
