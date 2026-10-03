# Development guide

[Back to README](../README.md) · [Quick start](QUICKSTART.md) · [Verification status](STATUS.md)

## Code map

| Location | Purpose |
| --- | --- |
| [recorder/](../recorder/) | Unity project containing the upstream app and custom extensions |
| [SpatialCaptureExtras.cs](../recorder/Assets/SpatialCapture/SpatialCaptureExtras.cs) | Additional hand, room, and related capture |
| [SpatialMicrophone.cs](../recorder/Assets/SpatialCapture/SpatialMicrophone.cs) | Microphone audio and timing metadata |
| [RoomGeometryExport.cs](../recorder/Assets/SpatialCapture/RoomGeometryExport.cs) | Converts room geometry for Three.js |
| [SpatialVideoEncoder.java](../recorder/Assets/Plugins/Android/SpatialVideo/SpatialVideoEncoder.java) | Android video encoder |
| [SpatialCaptureBuild.cs](../recorder/Assets/SpatialCapture/Editor/SpatialCaptureBuild.cs) | APK build settings, app ID, and version |
| [editor/src/](../editor/src/) | Three.js playback, object placement, and room visualization |
| [editor/scripts/](../editor/scripts/) | Data conversion, sample generation, and video export |
| [scripts/](../scripts/) | ADB installation, data retrieval, and recording configuration |
| [validate_spatial_take.py](../recorder/Tools/validate_spatial_take.py) | Validates recorded video and pose correspondence |

See [recorder/README.md](../recorder/README.md) for the upstream app specification and [SpatialCapture/README.md](../recorder/Assets/SpatialCapture/README.md) for extensions. The upstream app's package name and distributed APK differ from this project's.

## Build the APK with Unity

Requires Unity **6000.4.5f1**, Android Build Support, the SDK, JDK **17**, NDK **r27c**, and a valid Unity license. Add `recorder/` to Unity Hub and let package resolution finish.

Run from the repository root. Replace `/path/to/Unity` with the actual Unity executable.

```sh
mkdir -p recorder/Builds
SPATIAL_APK="$PWD/recorder/Builds/spatial-capture.apk" /path/to/Unity -batchmode -quit \
  -projectPath "$PWD/recorder" -buildTarget Android \
  -executeMethod SpatialCaptureBuild.Android -logFile "$PWD/build.log"
```

The output is a Development/ARM64/IL2CPP build with app ID `org.openclaw.spatialcapture`. The current configuration is 0.1.3, versionCode 4. No custom signing key is used. APKs built on different machines may have different signatures. If an update fails with a signature error, do not uninstall and erase data: retrieve the originals first and prepare a build with the same signature.

```sh
adb devices -l
bash scripts/install.sh QUEST_SERIAL recorder/Builds/spatial-capture.apk
```

Replace `QUEST_SERIAL` with the device ID from the list. The installer checks for Quest 3/3S and also deploys recording configuration.

## Editor setup and tests

```sh
cd editor
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm test
```

Make FFmpeg and ffprobe available on PATH. Automated tests check JavaScript geometry and Python import/video correspondence. They do not replace on-device camera frame-rate, hand-tracking, or audio-synchronization checks.

Use the [recording instructions](RECORDING.md) and [validation-tool guide](../recorder/Tools/README.md) for device tests. Record updated results in [STATUS.md](STATUS.md), distinguishing synthetic encoder tests from actual camera recordings.

## Data and publication scope

- APKs are distributed through GitHub Releases; code and instructions are on the main branch.
- Recordings, audio, and room scans stay local. `editor/private/`, `captures/`, `sessions/`, and `exports/` are excluded from Git.
- `pull.sh` only copies files; it does not delete recordings on Quest.
- The upstream MIT license is retained at [recorder/LICENSE](../recorder/LICENSE). Unity/Meta SDKs remain subject to their providers' terms.

## Language

Use English for repository documentation, release notes, UI labels, command-line prompts and errors, and new code comments. Keep this consistent when adding features. Preserve upstream names and functional text-rendering resources, including Unicode line-breaking tables.
