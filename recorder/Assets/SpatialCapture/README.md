# Spatial Capture extension (experimental)

Build/install, room retrieval and isolated encoder checks have passed; fresh end-to-end camera capture verification remains pending. See [current status](../../../docs/STATUS.md).

Separate package: `org.openclaw.spatialcapture`; leaves QuestRealityCapture and its takes untouched.

- On app launch: read already-scanned room using MRUK V2 with V1 fallback; never request a new scan automatically. Exports `room-scan-latest.json` and explicit status. Permission is required.
- On recording: MP4 camera stream plus original per-frame pose/intrinsics CSV. Hardware H.264 codec, bounded 3-frame input queue. Accepted timestamps retained; rejected inputs are marked, not disguised as frames. `*.packets.csv` records actual encoded PTS; `*.status.json` reports completion and camera timestamp origin.
- Per take: `hands.jsonl` at a target 30 Hz, including invalid/untracked states, raw SDK joints, pinch, confidence, clock samples and tracking-space world transform. Skeleton definition and SDK convention recorded separately. Do not call raw joint values world-space coordinates.
- Per take: loaded MRUK room JSON. MRUK 203 serializes **OpenXR**, whereas the camera pose CSV is Unity. Never combine without coordinate conversion and validating tracking origin/alignment.
- Target 30fps is not measured throughput. RGBA readback and CPU YUV conversion may drop frames; real-device throughput and reprojection tests are mandatory. Mono PCM audio is saved in `audio.wav` with estimated capture onset in `audio-timing.json`; clap validation is mandatory before claiming accurate A/V synchronization.
- Frame orientation follows upstream GetColors output; verify against the existing raw-image importer before displaying MP4.
- Stop recording and wait for encoder finalization before copying a take. Do not force-stop during recording.

## Build

Unity 6000.4.5f1 with Android support, JDK17 and NDK r27c. Dependencies are Unity/Meta public registry packages; no private registry is configured.

```
SPATIAL_APK=/absolute/path/spatial-capture.apk Unity -batchmode -quit -projectPath /path/to/quest-reality-capture -buildTarget Android -executeMethod SpatialCaptureBuild.Android -logFile /absolute/path/build.log
```

Install using `adb install -r` on the verified Quest. Do not uninstall upstream app. Place the runtime config in this package's `files/recording_config.json`:

```json
{"camera":{"enabled":true,"backend":"MRUK","targetSaveFps":30,"encodeVideo":true,"left":{"enabled":true},"right":{"enabled":false}},"pose":{"enabled":true,"targetSaveFps":30},"depth":{"enabled":true,"targetSaveFps":5},"liveFeedback":{"enabled":true,"coverage":{"enabled":false},"diagnostics":{"enabled":true,"showHud":true,"showTrajectory":false,"showTrackingEvents":true}}}
```

## Acceptance

1. Existing app/takes remain available; new app's package verified.
2. Room status success with nonzero rooms and actual geometry present (not just permission granted).
3. Record a short take with controllers set down and hands visible. Hand samples must contain tracked valid joint arrays; empty/untracked data is not success.
4. Every MP4 packet PTS maps to an accepted metadata camera timestamp minus origin. Decode the complete file with ffmpeg, inspect orientation and motion, measure unique frames/duration.
5. Confirm no encoder errors, stop finalization and preserve source data. Visually compare a stationary placed object under translation as well as rotation.
