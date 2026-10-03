# Quest Spatial Studio

An experimental workspace for recording once on Quest, then editing AR videos using room geometry and camera trajectories.

**Work in progress. Implemented code, successful builds, and successful on-device capture are separate milestones.** See [STATUS.md](docs/STATUS.md) for current verification results. Selected demo stills are included below; original recordings, audio, room-scan files, and credentials remain outside Git.

## Latest recorded-room scenarios

![Four AR scenarios over a real Quest recording: brick assembly, pinch-responsive crane, solar system, and miniature observatory](docs/figures/living-scenarios.jpg)

Actual frames from the latest 95-second scenario export: **brick assembly, a recorded-pinch-responsive crane, a solar-system explanation, and a miniature observatory with notification previews**. The replay combines recorded camera poses and room context with authored Three.js geometry. The observatory also uses offline-generated artwork; the crane is camera-relative during the hand segment. [Scenario behavior and controls](editor/docs/living-scenarios.md) · [Frame sources and provenance](docs/figures/README.md)

## Start here

- **Install the Quest app:** [Spatial Capture 0.1.3 APK (test build)](https://github.com/ryosuzuki/quest-spatial-studio/releases/tag/v0.1.3-test). Download `spatial-capture.apk` from Assets. Unity is not required.
- **Record a take:** [Install → record 20 seconds → copy to Mac](docs/RECORDING.md)
- **Play and edit on Mac:** [Quick start](docs/QUICKSTART.md), including a sample that does not require Quest.
- **Read or build the code:** [Development guide and code map](docs/DEVELOPMENT.md)
- **Check what is verified:** [Verification status](docs/STATUS.md). The latest real take contains 95 seconds of video at 9.61 fps and 2,300 hand-log samples; physical alignment and audio synchronization remain to be measured.

```text
Quest: Spatial Capture
  ↓ Copy over USB (original data is retained)
Mac: Recording files → Import → Place objects and play in Three.js → Export MP4
                             └→ View room data alone in 3D
```

This repository is private. Viewing it or downloading the APK requires signing in with a GitHub account that has access.

## Interactive digital twin

The recorded video on the left is synchronized with the 3D scene on the right. Object placement changes also appear in the composited video. Inspect the trajectory, camera poses, and hand logs, or preview the video inside the 3D scene. WebXR controls are implemented but have not been verified in a headset.

![Actual Quest recording on the left and the editable scanned-room twin on the right, from the latest daily-demo screen recording](docs/figures/recorded-editor-after.jpg)

From Ryo's October 2 **#daily-demo screen recording**: the recorded-camera composite and scanned-room twin share the same editable object. [Before/after at the same source frame](docs/editor-interaction-demo.md#latest-daily-demo-screen-recording)

[Controls and WebXR requirements](docs/QUICKSTART.md#debug-with-the-digital-twin)

## New recording demonstration

[Real-take evidence, reproduction, and figure handoff](docs/new-take-demo.md) · [Interactive editor demo](docs/editor-interaction-demo.md)

## Repository layout

- **recorder/** — Native Unity/Quest recording app, extending QuestRealityCapture.
- **editor/** — Three.js video compositing, 3D overview, camera trajectories, and object placement. Includes an entry point for WebXR viewing.
- **scripts/** — Installation and data-retrieval commands.
- **docs/** — Recording instructions, file formats, and verification status.

## Target recording bundle

- `left_camera.mp4` plus per-frame camera poses and intrinsics
- `audio.wav` plus `audio-timing.json` (audio start time is estimated; verify synchronization with a visible clap)
- `hands.jsonl` plus hand skeleton definitions, tracking confidence, and missing-data state
- `room-scan.json` (original MRUK format) plus `room-geometry.json` (measured meshes / spatial-anchor bounds for Three.js)
- Head and controller poses, and depth (from the upstream recorder)

30 fps is a target, not a measured device result. Video PTS values must be checked against the frames actually encoded. Do not mix room-scan and camera coordinate systems directly: verify the conversion and alignment.

## Try the editor without Quest

```sh
cd editor
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/demo.py
npm start
```

Open `http://localhost:8766`. The left pane shows the recording-camera composite; the right pane shows a freely navigable 3D scene (stacked on narrow screens). Drag the arrows in the 3D scene to change the same object's placement in the video. The generated sample is explicitly labeled as synthetic data.

Load `room-geometry.json` to display the scanned room. Always use a file from the same recording session. Other sessions and Polycam scans require separate alignment.

WebXR requires a supported browser and HTTPS (except on localhost). Desktop verification is separate from XR verification in the Quest browser.

## View the room alone

Open `editor/room.html` and select `room-geometry.json` to explore measured meshes and furniture bounds from a free viewpoint. Video is not required. Store local room JSON files in the Git-ignored `editor/private/` directory. The viewer does not automatically align them with video captured during a different app launch.

## Quest app

[Recording and installation instructions](docs/RECORDING.md) / [Recorder implementation](recorder/Assets/SpatialCapture/README.md)

The app is named **Spatial Capture**, with package ID `org.openclaw.spatialcapture`. It is separate from QuestRealityCapture and does not delete the original app's recordings.

Build requirements: Unity **6000.4.5f1**, Android Build Support, JDK17, and NDK r27c. Open `recorder/` as a Unity project. It uses publicly available Unity/Meta packages.

```sh
SPATIAL_APK="$PWD/spatial-capture.apk" /path/to/Unity -batchmode -quit \
  -projectPath "$PWD/recorder" -buildTarget Android \
  -executeMethod SpatialCaptureBuild.Android -logFile build.log
```

## Occlusion and moving objects

Static occlusion using room meshes is implemented in the editor. Occlusion will be coarse where detailed furniture geometry is unavailable. The new-take demonstrator includes bounded 2D green-region tracking and reprojected recorded-depth occlusion. General dynamic-object 6DoF tracking is not implemented; see the [evidence and limitations](docs/new-take-demo.md). Raycasting tracked 2D points onto a table plane is useful for constrained tabletop motion; arbitrary motion in the air requires additional information.

## Attribution

Recorder upstream: [t-34400/QuestRealityCapture](https://github.com/t-34400/QuestRealityCapture), snapshot `649c012a3d95363101aa7f9fe53d67c59cbecbec` (MIT; [original license](recorder/LICENSE) retained). Meta/Unity SDKs remain subject to their respective terms. Custom extensions are distinguished from the original implementation; this project does not claim to be an upstream contribution or an official product.
