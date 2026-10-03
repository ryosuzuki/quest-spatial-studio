# New Quest recording and editable AR demonstration

Source take: `20261002_215403` (private). This is a real 95-second headset recording, not the earlier nine-second take or a generated scene.

## Capture evidence

915 unique decoded camera frames at 1280 × 1280, 9.6098 measured fps; 95.84 seconds of mono audio; 2,300 hand-log rows; 2,160 head-pose rows; two unnamed exported rooms. All 969 retrieved source files passed SHA-256 comparison between the retrieval Mac and editing workstation. The recorded SDK log rate is not a unique hand-observation rate. Encoder queue drops: 1,403.

Original footage, depth, room geometry, audio, derived masks, and the exported home-scene videos are private and excluded from Git. Source data remains on the Quest and retrieval Mac.

## Two complementary demonstrations

1. **Authored AR replay:** Three.js geometry, recorded camera poses, scan-based surface placement, recorded pinch-driven animation, a bounded green-region tracker, and coarse recorded-depth occlusion. Animations and object placement are authored; the camera and interaction signals are recorded. General 6DoF object tracking is not claimed.
2. **Interactive desktop editor:** actual UI edits to object translation, scale, and rotation immediately update both the recorded-camera composite and the freely navigable twin. See [editor interaction instructions](editor-interaction-demo.md).

## Import and inspect

```sh
python3 recorder/Tools/validate_spatial_take.py /path/to/private/take
python3 editor/scripts/import_video.py /path/to/private/take editor/sessions/quest-215403 --row-order bottom-up
cd editor
npm start
```

Open `http://127.0.0.1:8766/?session=sessions/quest-215403/session.json`. The source video and pose must stay paired; do not replace the frame time with a nominal 30 fps clock. Import preserves all 915 source frame/pose pairs. It tolerates at most 1 ms MP4 container timestamp drift while retaining exact encoder/sensor timestamps; observed maximum was 205 microseconds.

## Reproduce derived tracking and the full composite

Install `editor/scripts/requirements-recorded-tracks.txt` in a separate Python environment. Run `editor/scripts/derive-recorded-tracks.py CAPTURE OUTPUT/audit --green-start 63.7 --green-end 68.1`. The interval is visually selected; the masks and centroids are computed from recorded pixels. For render commands and the registered-depth packing format, see [full composite documentation](../editor/docs/new-take-demo.md).

## Figure and manuscript update guidance

- Use frames from the exported real-take composite for an **implemented prototype** panel; retain the source frame index/time from `frame-map.json`.
- Use the editor before/after screenshots at the same recorded timestamp for the **interactive authoring** panel. The edited object changes, not the source recording.
- Keep raw scene, room/twin view, augmentation, and evidence labels distinguishable. Do not relabel an authored animation as physical simulation, a 2D color track as metric 6DoF tracking, or recorded pinch replay as a live deployed interaction.
- For the system diagram: RGB + sensor pose/intrinsics + room + hand/depth/audio logs → validated import → authored Three.js behavior + derived tracks → paired editor views → video export.
- Update implementation/results text with the measured frame rate and dropped inputs. Keep physical reprojection accuracy, A/V clap synchronization, robust occlusion boundaries, and headset WebXR deployment as unverified.
- Keep existing prior-art analysis and proposed user studies separate from this engineering demonstration. A working demo is not study evidence or proof of novelty.
- Preserve figure provenance, captions, source frame/time, code revision, render settings and file hashes. Research figure production remains owned by AI Agent 4; this handoff does not overwrite its paper or figures.

## Limitations

The scan has geometry and semantic labels, not photographic textures. “Unnamed room 3” has not been mapped to a named exported room. Room/camera and joint/image alignment are not independently measured. Audio starts at an estimated +188.207 ms relative to video, without a verified clap measurement. Depth is low resolution and approximately 5 Hz; timing and silhouettes can be visibly imperfect. Desktop editing verification is not Quest WebXR deployment verification.
