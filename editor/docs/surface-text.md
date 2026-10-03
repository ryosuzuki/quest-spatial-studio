# Embedded white text on the measured Quest take

Open `surface-text.html` through `scripts/serve-living-scenarios.mjs`. The editor and Living Room entry links now point here. On the Air use `Desktop/quest-native-recorder/SURFACE-TEXT.command`.

This mode uses only take **20261002_215403** (915 captured RGB frames, 95.222 seconds), its calibrated intrinsics, recorded camera poses, room mesh and registered captured depth. No old home-video frames or 2D image tracks are used.

Text is a transparent RGBA texture on an oriented metric plane, not a camera-facing sprite or a card. The authoring ray intersects the captured room mesh; where recorded depth is available, a small-neighborhood depth estimate refines the point. Near-horizontal/vertical normals are regularized; the shelf example uses an authored normal parallel to the adjacent wall. The position and orientation remain unchanged as the camera replays. A click while placing changes the selected anchor. Text/size are editable; local save and JSON export preserve the capture ID and transforms.

Occlusion uses registered depth with a 5x5 nearest-valid fill and 16cm tolerance for coarse/noisy depth. The coarse room mesh is used for placement, not final visibility; it incorrectly occluded labels on finer surfaces. Depth holes and edges remain approximate. This is not a measured physical-registration accuracy claim. Shelf/object labels are static scene anchors; moving doors, drawers and held objects need independent motion tracks. Example contents are authored, not live inventory or agent results.

Verification: `node scripts/render-surface-text.mjs --test-only` (server on 8807 by default, override URL). Checks exact take, fixed transforms while seeking, editing, persistence, placement, and browser errors; retains seven view samples. Without `--test-only`, exports five 4-second excerpts from this take with source-frame mapping at 10fps. This is an offline replay export, not latency evidence.
