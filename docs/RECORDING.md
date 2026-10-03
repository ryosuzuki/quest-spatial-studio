# Recording guide

[Back to README](../README.md) · [Quick start](QUICKSTART.md) · [Development guide](DEVELOPMENT.md)

The latest distributed APK is in Assets for the [Spatial Capture 0.1.3 test build](https://github.com/ryosuzuki/quest-spatial-studio/releases/tag/v0.1.3-test). Run the following commands from the repository root, replacing `QUEST_SERIAL` and paths with actual values.

## Preparation

1. Complete room scanning on Quest 3/3S. If already complete, there is no need to repeat it.
2. Connect to Mac with a data-capable USB cable. Allow USB debugging.
3. Check that `adb devices -l` lists the target Quest as `device`.
4. Install the built APK with `scripts/install.sh QUEST_SERIAL spatial-capture.apk`.
5. Open Unknown Sources → **Spatial Capture**. Grant camera, microphone, and spatial-data permissions.

## Short test

- Launching the app attempts a room export. It does not automatically start a new scan.
- Press the left controller's menu button to start/stop recording (the same control as the original app).
- Record for about 20 seconds while looking at a stationary table. Move your head slightly sideways, not just in rotation.
- To record hands, put down the controllers and enable Quest hand tracking. Open both hands and move your fingers over the table.
- Clap once where the camera can see it to check video/audio synchronization.
- After stopping, wait about 10 seconds for MP4 finalization before retrieving files. Do not force-quit during recording.

Disconnecting USB does not delete existing data. App updates and data retrieval require a connection; recording itself is designed to run on Quest alone.

## Retrieve and validate

```sh
scripts/pull.sh QUEST_SERIAL /path/to/private-captures
python3 recorder/Tools/validate_spatial_take.py /path/to/private-captures/files/TAKE
```

`pull.sh` creates `files/` under the destination. `TAKE` is the recording timestamp folder inside it. Original files are not deleted.

Check both success in `room-export-status.json` and actual geometry in `room-geometry-latest.json`. Check hand samples with `tracked=true` and joint arrays, a nonempty audio WAV, and full video-frame decoding with PTS correspondence. Do not claim that everything recorded successfully before device validation.

## Import for editing

```sh
cd editor
.venv/bin/python scripts/import_video.py /path/to/TAKE sessions/my-take --row-order bottom-up
npm start
```

Open `http://localhost:8766/?session=sessions/my-take/session.json`. Audio, room, and hand data are loaded if available. Always verify video orientation using an asymmetric landmark. WebXR requires separate HTTPS hosting.

After saving placement, keep the local server running and export an MP4 with:

```sh
node scripts/export.mjs sessions/my-take/session.json exports/my-take /path/to/placement.json
```

If audio is available, it is mixed using an estimated offset. Check synchronization error using a clap or another visible cue.
