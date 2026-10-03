# Fifty Embedded AR Video Studies

## Requested outcome and independence

Ryo's Slack DM `1791006460.613939` requests roughly 50 distinct AR-overlaid videos on the same new Quest recording, not another editor demonstration. The scene, object and action should motivate the augmentation. Home MacBook Air's Codex must work independently: this run makes no contact with that agent and does not modify or deploy to its machine. Untracked `showcase` work is not an input or an owned output.

Source capture is **20261002_215403**: 915 synchronized RGB frames, calibrated camera poses, intrinsics, room geometry, registered depth and hand state. Old monocular house footage is excluded. Private source images and room data remain local; GitHub holds code and provenance, not the home recording.

## Research and design sources actually consulted

- NSF CAREER, local Overleaf snapshot `686f2f4a786dbdeeb40eaf83`, `1-intro.tex` and `3-research-plan.tex`: separate/situated/embedded; extract–generate–embed; object-linked programming; contextual guidance, appearance modification, generated experiences.
- AR+AI Grand Challenges archived `2026-09-10 final-proof.pdf`, 22 pages, pages 7, 8, 10: inspected scenario text and rendered sketches. This is an archived proof, **not a fresh verification of the submitted CHI 2027 file**. Supporting local GC1–GC5 LaTeX scenarios were also read.
- https://ryosuzuki.org/realitytalk/ : speech-driven live visual storytelling.
- https://ryosuzuki.org/realitysketch/ : capture, parameterize, bind and visualize real-world motion.
- https://ryosuzuki.org/realitycanvas/ : object binding, flipbook, action triggers, particles, trajectories and contour highlights.
- Owner's original `stuff/2026/2026-10-02/mockup-1-ja.txt`: practical physical referents, ambient wall messages, apparatus state, object finding, animation on everyday surfaces. Its **old-video timestamps do not select this run's source**.
- Earlier generated concept collection was located, but no earlier video or other agent's new demo was copied into this renderer. The named `codex-image-generation-2.png` was not independently recovered during this run.
- Dynamicland is used as a conceptual lineage from the CAREER object-linked programming text, not as a claim that this run implements Dynamicland.

## Open and render

From `editor/`:

```sh
PORT=8819 node scripts/serve-living-scenarios.mjs
# Open http://127.0.0.1:8819/embedded-fifty.html
node scripts/render-embedded-fifty.mjs --test-only
node scripts/render-embedded-fifty.mjs
```

Requirements: installed editor dependencies, Chrome at the path used by existing renderer scripts, ffmpeg, private `sessions/quest-215403/`, and the recorded-depth audit mounted by the existing server. Override `SPATIAL_AUDIT` only after checking capture identity. Export destination is explicit via `OUT`. `IDS=1,9,22` selects exact scenarios; `FORCE=1` rerenders existing MP4s after changes. Source-speed values are in the catalog and each output has an exact frame map. Never retain old exports after changing source/anchors without rerendering them.

## Implementation

- `src/embedded-fifty-catalog.mjs`: 50 distinct stories, effects, input basis and timeline selections.
- `src/embedded-fifty-art.mjs`: transparent animated surface drawings; no card backgrounds behind text.
- `src/embedded-fifty.mjs`: calibrated replay, seven world-space surface meshes, depth compositing, recorded hand and bottle effects.
- `scripts/render-embedded-fifty.mjs`: clean canvas-only MP4 export plus sampled visibility, invariant geometry and UI checks.
- `assets/embedded-fifty/`: retained generated textures and generation prompt/provenance record.

Static surfaces are manually selected on real frames. Registered depth refines a point and the captured mesh supplies a surface normal, with explicit horizontal normals for table/floor. Pixel rays intersect that plane to produce fixed vertices. Those vertices never change with the playback camera. Masks/highlights on shelf cells are manually authored planar regions, **not automatic semantic segmentation**.

The bottle uses existing HSV connected-component masks of visible green pixels in an inspected interval. White printed labels and the hand are not recolored. Its trajectory is lifted using registered axial depth; it is an approximate point track, **not full-object segmentation, pose estimation, or 6DoF tracking**. Hand-driven sketches use valid SDK roots/pinch states within the existing freshness gate; the previous hand/RGB alignment uncertainty remains.

## Presentation and evidence boundaries

These are **video prototypes**. Notifications, message contents, speech transcripts, device telemetry, inventory, robot plans and collection events are authored illustrative events, not live integrations or inferred ground truth. Only explicitly designated hand/bottle scenarios respond to recorded state. Speech transcription and clap recognition are not tested here. The browser lets a viewer select, seek and replay the response; no microphone or agent network call is implied.

Some short target-facing intervals are slowed using the catalog's `sourceSpeed`. A repeated background uses the same source camera pose; animated graphics may evolve between those paired samples. Export is 10 fps, not evidence of 10 Hz generation or higher sensor fidelity. Videos are silent; no synthetic speech is misrepresented as recorded speech.

Depth is coarse (~5 Hz) with finite-hole filling and 12 cm comparison tolerance. Edge errors, hand occlusion and static registration error remain possible. Numerical invariance and visible-pixel tests do not establish measured physical accuracy. Use contact sheets and final decoded videos to judge appearance.

## Durable outputs

Run root: `/Users/ryosuzuki/Storage/outputs/quest-spatial-studio/2026-10-02/embedded-fifty` (run started October 2 and continued October 3).

Contains 50 MP4s, a numbered viewing gallery, catalog, exact per-video frame maps, authored anchor vertices and reference pixels, three sampled check images per study, validation results and hashes. A numbered reel and a portable ZIP are derived for delivery. Canonical workspace receipts belong under `stuff/2026/2026-10-03/`; daily memory under `memory/2026/2026-10-03.md`.

Owning skill is **research-arvideo**. No new standalone skill was created.

## Size-Bounded Delivery

Run `python3 scripts/slack-embedded-fifty.py` after packaging and generating the reel. It preserves originals, creates 640px review videos and a separate 640px reel, fully decodes all derivatives, and requires each delivered attachment to be below 16 MiB. The self-contained review ZIP has all 50 clips and its own offline gallery; its full-reel link is intentionally removed because the reel is delivered separately. Generated-asset provenance contains the exact prompts and whether a candidate was rejected.
