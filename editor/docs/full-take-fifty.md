# Fifty whole-take AR experiences

Owner: OpenClaw / Ryo's October 3 Slack request correcting the earlier short-clip interpretation. Deliver **one uninterrupted 95-second capture per theme, 50 themes**. The old short studies and cloud Arena remain unchanged. No contact with the independent Air agent.

## Source and implementation

- Quest take `20261002_215403`: 915 RGB exposures, measured camera poses, calibrated intrinsics, room mesh, coarse registered depth. Full last-exposure time 95.111227 seconds.
- `full-take.html`, `src/full-take.mjs`, `src/full-take-art.mjs`, `src/full-take-catalog.mjs`.
- Seven fixed surface planes inherited from the validated short-study baseline. Deterministic animated thematic grammars, surface-specific role substitutions, and four authored story beats. 50 unique modes; not fifty recolorings of one animation.
- Each export is 952 frames at 10 fps, duration 95.2 seconds, source speed 1.0. The last output frame explicitly pairs the last recorded exposure with its own pose. No slowed inserts, looping backgrounds, or concatenation of old clips.
- 640×640 masters and smaller CRF28 review copies. Silent, English graphics. Original audio is not presented as synchronized sound; its source offset remains estimated.

## Reproduce

From `editor/`, with verified Storage and source capture installed:

```
PORT=8847 node scripts/serve-living-scenarios.mjs
node --test tests/full-take.test.mjs
node scripts/check-full-take.mjs
IDS=1,6,9 node scripts/render-full-take.mjs --preview
node scripts/render-full-take.mjs
python3 scripts/package-full-take.py
```

`IDS` may split disjoint rendering lanes; give each lane a distinct `PART` for its status file. Do not run two renders of the same ID concurrently. For changed source, rerender owned outputs; a frame-map's presence is the package script's completion gate. Start packaging only with current-run frame maps (or clear stale derived maps before a new run).

Output: `~/Storage/outputs/quest-spatial-studio/2026-10-03/full-take-fifty/`. `review/index.html` is an offline searchable gallery with individual video playback, previous/next navigation, and downloads. ZIP contains all 50 review MP4s, thumbnails, catalog and gallery. Original master renders, exact source maps, QA samples and verification hashes remain outside the portable ZIP.

## Evidence and limits

- `replay-check.json`: deterministic seek/replay and unchanged anchor vertices across nine representative modes; first-party UI controls exercised; last source exposure included.
- `verification.json`: all master/review decodes, exact expected output-to-source ordinals and timestamps, durations, frame counts and SHA256 hashes.
- Visual inspection samples cover the table/fridge, shelf and floor views, with further start/mid/end and scene-transition samples retained in `qa/`.
- These are **authored spatial video prototypes**, not live inference, transcription, inventory, appliance readings or robot control. Symbolic surface graphics are not volumetric simulation. No recovered moving-object 6DoF or tested live gesture trigger is claimed.
- Coarse depth can leak graphics across hands and object edges. Small text and fine shelf graphics are exploratory rather than publication-quality UI. Fixed-anchor invariance does not establish independently measured registration accuracy.
- No new public-channel post or Arena replacement is included in this request's delivery.

## Integration

Intended authoritative target: `origin/main`, exact new files only. Completion owner: this OpenClaw run. Unrelated `showcase` work is preserved. The final immutable source revision and delivery evidence are in the dated workspace receipt, avoiding self-referential commit metadata.
