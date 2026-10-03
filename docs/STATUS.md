# Verification status — 2026-10-02

- Existing Quest recording: 84 raw frames over ~9.2 seconds; configured cap was 10fps. Prior Three.js composite used 83 frames, preserving originals and excluding one anomalous end pose.
- New app: implementation added; Android Java video encoder compiles. Full Unity Android APK build succeeded. Installed and launched on Quest 3 via MacBook Air. Original app retained. Initial query returned NoRoomsFound. A later device query succeeded: 2 rooms, 49 geometry parts, 24,794 vertices and 49,586 triangles, copied to MacBook Air and visually checked in the room viewer. A bounded retry after localization/resume is included.
- First new device take: room geometry, 71.06 seconds of PCM audio and 26-joint hand samples were retrieved. Only 13 hand samples were present; continuous hand rate is not verified. Video failed because an oversized SDK backing array was sent to the encoder. Fixed by slicing to width×height and using a direct JNI buffer rather than per-element array marshaling. A fresh camera recording is still needed to validate end-to-end throughput/synchronization.
- Isolated on-device encoder test: 30 synthetic frames accepted and encoded without drops (1280×1280). This is not a camera-fps measurement.
- Editor: dual-view trajectory and shared object placement implemented; browser interaction checks passed, along with 13 unit/integration tests (including MP4 packet/pose matching).
- WebXR headset view: implemented entry/controller placement, not headset-verified.
- Dynamic object tracking: not implemented.
- No home captures or credentials are published in this repository.

Repository validation: 13 automated tests and desktop browser smoke checks passed. Imported Unity YAML/meta files retain upstream-generated trailing whitespace; task-authored source whitespace checks are scoped separately. Integration target: main; completion owner: OpenClaw.

## Interactive twin follow-up

- Added trajectory/camera/hand visibility controls, camera frame/position readout, reset view and an in-world composite-video panel.
- Browser interaction test verifies that changing the shared object placement changes composite pixels, scrubbing changes the recorded camera pose, and debug controls / room round-trip work. Synthetic fixture, not physical alignment proof.
- WebXR video panel and controller play/pause route implemented, not headset-tested. Trusted HTTPS hosting and actual device verification remain necessary; the local launcher is not remote XR deployment.
- Placement editing is not keyframe animation recording or automatic dynamic-object tracking.
- Validation: 13 automated tests plus the extended dual-view browser smoke test pass. Integration target main; completion owner OpenClaw.

## Latest real take: 20261002_215403

Retrieved without deleting headset originals. All 969 files matched SHA-256 between the MacBook Air retrieval and the editing workstation.

- Camera: 1280 × 1280, 915 fully decoded frames, 95.18 seconds, measured 9.6098 fps. Encoder accepted/encoded 915 and dropped 1,403 queued inputs. A 30 fps export does not create 30 fps observations.
- Hands: 2,300 log rows; left tracked in 2,001 and right in 2,170. These are log counts, not necessarily unique SDK observations.
- Head poses: 2,160 rows. Room export: two rooms. A headset display name such as “Unnamed room 3” is not established by these unnamed exports.
- Audio: 95.84 seconds, 48 kHz mono. Estimated start offset relative to video is +0.188207 seconds. No measured clap-based synchronization claim.
- Import: all 915 image/pose pairs retained; maximum source gap 0.208475 seconds. Container timestamps differ from encoder timestamps by at most 205 microseconds. The importer retains sensor/packet timing and allows at most 1 ms container drift; larger drift or count mismatches fail.
- The structural take validator passes; this does not certify smooth motion, physical registration, hand freshness, or occlusion accuracy.

This supersedes the earlier statement that a new camera take was still required. Older failure reports above remain historical evidence, not the state of this take.

## Implemented new-take demonstrations

- Real desktop editor interaction recording: translation, scale, yaw, visibility, scrub, orbit, and save tested on the 915-frame take. Both panes change at the same source timestamp. Room wireframe is now optional and independent from depth occlusion.
- Offline green-region tracking implemented for a visually bounded bottle segment (33 observations, 63.778–67.598 seconds). Not generic object tracking or 6DoF recovery.
- Recorded pinch states drive authored animation. Stale SDK hand observations are gated in both the demonstration and twin.
- Recorded environment depth reprojected to RGB supplies coarse foreground occlusion. Missing depth is not interpreted as foreground. The demonstration uses finite 3×3 splats and a 30 mm bias; physical boundaries remain unvalidated.
- Latest automated suite: 3 JavaScript + 13 editor Python + 3 recorder-validator Python tests. Desktop browser checks cover actual new-take edits, independent room display/occlusion, placement round-trip, and synthetic transform-event propagation. A historical synthetic-anchor smoke is not applicable to an arbitrary real camera pose; use its synthetic fixture or the new-take interaction capture.
