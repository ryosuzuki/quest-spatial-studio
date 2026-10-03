# Quick start

[Back to README](../README.md) · [Recording guide](RECORDING.md) · [Development guide](DEVELOPMENT.md)

## 1. Record on Quest

The app is named **Spatial Capture**. It is separate from the original **QuestRealityCapture**.

1. Download the APK from Assets in the [0.1.3 test release](https://github.com/ryosuzuki/quest-spatial-studio/releases/tag/v0.1.3-test) and follow the [installation instructions](RECORDING.md). Skip this if 0.1.3 is already installed.
2. Launch Spatial Capture from Unknown Sources on Quest and grant the requested permissions.
3. Press the left controller's menu button to start. Look at a table for about 20 seconds while moving your head slightly sideways.
4. Put down the controllers, move both hands and fingers, and clap once where the camera can see it.
5. Pick up the controller, press the same button to stop, and wait 10 seconds.
6. Connect to Mac over USB and continue to [retrieval and validation](RECORDING.md#retrieve-and-validate).

USB is not needed while recording. Existing room scans do not need to be repeated. The current APK is a test build; this recording is needed to check actual frame rate, continuous hand tracking, and audio synchronization.

## 2. Try the editor on Mac, with or without Quest

Requirements: Node.js/npm, Python 3, and internet access for the initial dependency download. Video import, validation, and export also require FFmpeg/ffprobe.

Clone the repository and open its folder in a terminal.

```sh
git clone https://github.com/ryosuzuki/quest-spatial-studio.git
cd quest-spatial-studio
```

On Mac, double-click **START.command** or run `bash START.command` from the repository root. On first launch, it prepares dependencies and a synthetic sample, then opens `http://localhost:8787`.

- Left: video composited from the recording camera's viewpoint.
- Right: a freely navigable 3D scene and camera trajectory.
- Drag the arrows in the 3D scene to move the object.
- The initial sample is synthetic. It contains no home recordings or room data.

For manual startup, use the [README commands](../README.md#try-the-editor-without-quest). These use port **8766**, not the **8787** used by START.command.

## 3. View the room alone

After launching START.command, open `http://localhost:8787/room.html`. Use the file picker to select the retrieved `room-geometry.json` or `room-geometry-latest.json`.

Room data is not on GitHub. You need JSON retrieved from your own Quest. There is no automatic alignment with video captured during another app launch or recording.

## 4. Edit and export your video

Continue to [Import for editing](RECORDING.md#import-for-editing) in the recording guide. Manual commands assume port 8766. If using START.command, substitute 8787 in the viewing URL.

## Troubleshooting

- **Cannot find the app:** Open Unknown Sources and look for Spatial Capture. Its name differs from the original app.
- **ADB reports unauthorized:** Check the USB debugging permission inside Quest. Use a data-capable USB cable.
- **Room is empty:** Check spatial-data permission and Quest room settings, then wear the headset and wait for localization. Check the geometry file, not just the success status.
- **Video is empty or unplayable:** Use 0.1.3, wait 10 seconds after stopping, retrieve the files, and run the validator. Metadata alone does not prove a successful recording.
- **Video is upside down or placement is misaligned:** Check import orientation and coordinate systems. Do not mix rooms from different sessions.
- **Page will not open:** Check the port for your startup method (8787 or 8766) and terminal errors.

## Debug with the digital twin

Both panes share the same object and camera timeline.

1. Open a recording session and load room geometry from that same session.
2. Scrub the timeline to update the recorded video on the left and the recorded camera position/orientation on the right.
3. Drag the arrows on the right to change the object's 3D position and update the composite on the left. Scale / Yaw also adjust size and rotation.
4. Toggle overlays with Trajectory / Camera / Hands, and restore the viewpoint with Reset view. The trajectory and coordinates belong to the recorded camera, which may not be at the center of the head.
5. Enable Video panel to view the composite within the 3D scene. Hands appear only where matching, valid recorded samples exist.
6. Use Save placement to save the layout, then use the recording guide's export command to apply it to a video.

This is interactive placement editing. It does not record drag movements as timed animation or automatically track objects.

### WebXR

Open the editor, served over trusted HTTPS, in a supported headset browser and enter with the VR button. The Mac's usual localhost URL is not accessible from Quest. START.command is Mac-local only; it does not configure HTTPS hosting or headset connectivity.

XR shows the video panel alongside the room and trajectory. Point a controller at the video panel and select to play/pause; point elsewhere and select to place the object on a horizontal plane at its current height. The current implementation is desktop-tested but unverified in a headset. It does not guarantee automatic real-world alignment or passthrough AR.

### Audio

Audio is recorded to `audio.wav` in the take folder and aligned with video in the editor using `audio-timing.json`. It is not initially embedded in the raw camera MP4. Toggle playback audio with Play audio. Synchronization is estimated; verify it with a visible clap or similar cue.
