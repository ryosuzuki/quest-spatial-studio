# Spatial Take: recorded-world AR prototyping

## Decision

Capture with native Unity + Meta MRUK; author/render offline in Three.js. Keep raw images paired with their **camera exposure-time pose**, intrinsics, resolution/crop, coordinate basis, and timestamp. Do not attach current HMD poses to arbitrary Quest system recordings. Browser raw passthrough capture support has not been established on the target hardware; WebXR is not the first recorder implementation.

```text
Quest 3 / 3S
  MRUK camera image + timestamp + image-time camera pose + intrinsics
  HMD/controller pose logs + depth/descriptor logs
                 ↓ USB export
  strict importer → session.json + lossless normalized images
                 ↓
  Three.js calibrated camera + world-space assets (+ aligned room mesh)
                 ↓ same timestamp for background and 3D camera
  editable preview → deterministic PNG sequence → MP4
```

This is **video prototyping**, not an already-functional live AR agent. Physical changes after a take do not matter to that take. Camera movement during a take is known; moving objects during that take are not automatically known.

## Minimum recording

- Per-frame RGB and exposure timestamp, not merely nominal FPS.
- Per-frame optical-camera world pose; MRUK `GetCameraPose()` includes lens offset. Do not apply the offset twice.
- Sensor K, sensor resolution, image resolution/crop. MRUK 203 centers the aspect-ratio crop; importer mirrors its `CalcSensorCropRegion()`.
- Image row orientation checked with an asymmetric target. Current adapter requires an explicit orientation argument rather than guessing.
- Stable tracking space and units; distinguish recenter/relocalization events. Current importer does **not** repair tracking jumps; split affected takes and re-anchor.
- Optional room mesh in the **same coordinate basis**, synchronized depth, hands/controllers, and events.

A complete digital twin is not required for fixed world coordinates. A room model improves placement, static occlusion and shadow-receiving surfaces. Quest scene data is an approximation, not a complete detailed scan. Polycam coordinates require a measured rigid alignment (and scale if necessary). Prefer >=3 non-collinear shared landmarks and validate on extra landmarks; a single origin point is insufficient.

## Coordinate and time contract

Unity LH, +Y up, optical camera +Z forward → Three RH, +Y up, camera -Z forward:

- world position `(x,y,z) → (x,y,-z)`
- quaternion `(x,y,z,w) → (-x,-y,z,w)`
- room mesh vertices/normals need the same reflection and triangle winding correction if converting Unity mesh directly.
- K exported in **top-left image pixels**; principal point y is flipped from MRUK's bottom-left viewport definition after sensor cropping.
- `timestampUs` is a string to preserve precision in JS; `t` is seconds relative to the first accepted frame.
- Missing samples hold both the background and its corresponding camera pose. Smooth camera interpolation over a frozen image creates false slipping and is intentionally not used.

## What this PoC does

- Reuses published QuestRealityCapture v1.5.0 APK as recorder; original author t-34400, MIT source.
- Imports its MRUK image/pose format, validates bytes/flags/quaternions/timestamps, reports rejected samples.
- Replays matching image/pose pairs, calibrated lens, click-to-place on horizontal plane, XYZ/scale/yaw editing.
- Loads local GLB model and pre-aligned room mesh; optional static mesh depth occlusion.
- Saves placement including loaded GLB data, loads it again, exports MP4 with frame provenance.
- Supplies numerical reprojection evaluation and synthetic test fixture.

## Explicitly not validated / not implemented

- No Quest was connected on either inspected Mac: no hardware capture, deployment, reprojection accuracy, throughput, or permission test was performed.
- No Unity Editor was found at the standard local/home locations. No modified Unity APK was built. The included APK is the upstream release, with verified release SHA-256.
- Recorder collects depth, but this editor does not yet consume depth maps or reconstruct the room. Room mesh import is supported; automatic Quest scene mesh export is not wired into this release.
- Hand joints, moving-object poses, page semantics, automatic interaction recognition, audio recording and audio muxing are not implemented in this PoC. The upstream recorder includes controller poses; editor does not yet replay them.
- GLB animations and multiple asset tracks are not yet supported. Loaded models are static assets; arbitrary animation can be added in `src/app.mjs` after the geometry/sync gate.
- Recorded viewpoint only. Moving to a novel camera viewpoint cannot reveal unseen video content.
- Default short-take profile records one RGB camera at target 10 fps; export at 30 fps repeats the correctly paired sample. It is not true 30 fps capture.
- Raw capture is large: 1280×1280×4×10 ≈ 65.5 MB/s for **one** eye. 20 s ≈ 1.31 GB before depth. Long-form capture needs bounded async capture plus hardware encoding while preserving PTS/pose identity, verified for dropped frames.

## First hardware gate (10–20 s)

1. Connect authorized Quest 3/3S by USB; identify it (do not install onto Pixel).
2. Install verified upstream APK with `recording/install.sh SERIAL` (uses `adb install -r`, no uninstall). Grant requested camera/scene permissions inside headset.
3. Use a static tabletop with asymmetric visible markers; do not recenter during take. Start recording using upstream menu-button workflow; move left/right and rotate slowly, returning to the start; stop with menu toggle before exiting.
4. Pull one session directory. Preserve all raw images, metadata, and depth. Import with explicit row order.
5. Align 3D reference markers once. Measure reprojection on held-out frames at near/mid/far distances, especially sideways motion. Do not re-fit every frame.
6. Proposed pass criterion (not achieved yet): median ≤5 px and p95 ≤10 px at recorded resolution over ≥30 observations, no visible jumps; report depth/distance distribution. Wrong row order, crop, camera pose, timestamp or origin must be fixed before polishing art.
7. After this gate, add room export / depth occlusion, hand tracks, object tracks and event timeline. Then optimize 30 fps recording and long takes.

## Sources checked 2026-10-02

- User's channel proposal: https://programmable-reality.slack.com/archives/C08RK4K26AV/p1790989762598629
- Video-prototyping clarification: https://programmable-reality.slack.com/archives/C08RK4K26AV/p1790990275169929
- Pronto (CHI 2020), DOI https://doi.org/10.1145/3313831.3376160 ; author's overview https://rubaiathabib.me/2020/05/04/pronto-rapid-ar-prototypingn-chi-2020/ ; full paper read at https://3dvar.com/Leiva2020Pronto.pdf (Augmented Video Recording, Implementation).
- Pronto records framewise 6DoF and optics, then sets the SceneKit camera to the recorded pose over a video background. Thus the core recording idea is prior art, not itself a new research contribution. Potential extension: egocentric + generated executable 3D + captured interaction traces + reproducible replay, subject to broader related-work review.
- Official camera samples: https://github.com/oculus-samples/Unity-PassthroughCameraApiSamples
- Recorder: https://github.com/t-34400/QuestRealityCapture ; inspected commit `649c012a3d95363101aa7f9fe53d67c59cbecbec`.
- APK release: https://github.com/t-34400/QuestRealityCapture/releases/tag/v1.5.0 ; SHA-256 `940feffa26ebae7e58993d28ee35817a9396b99dd101eafff6afb5f7240db5ff`.
- SDK source inspected: MRUK 203.0.0 `Core/Scripts/PassthroughCameraAccess.cs`, specifically `GetCameraPose`, `WorldToViewportPoint`, `CalcSensorCropRegion`, `GetColors`. Official docs fetch failed; official sample README and SDK source provided the detailed API evidence.
