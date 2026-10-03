# New Quest capture: spatial replay demonstrator

This real Three.js export uses the **2026-10-02 21:54:03** capture, not the earlier 9-second take. It preserves the full approximately 95-second source timeline with recorded RGB, camera poses and intrinsics.

## Implemented evidence

- **Surface placement:** miniature pendulum/orbital geometry uses exported dining/coffee-table bounds; a rotating sculpture uses a scanned wall plane. Motions are authored analytic animation, not simulated physics or measured object dynamics.
- **Digital twin:** room geometry, recorded camera trajectory/frustum and the identical virtual objects are shown alongside the augmented video.
- **Recorded hand response:** valid, tracked SDK pinch flags change sculpture scale/material. Hand/RGB and SDK sample ages are bounded to 150 ms. This replays observed events; synchronization is not independently calibrated.
- **Image-based object tracking:** approximately 64–67.6 s, a 3D ring follows measured green-bottle pixel centroids. HSV segmentation comes from actual frames. Observed green regions are foreground-composited. This is 2D tracking at an authored display depth, **not** whole-bottle segmentation, metric position or 6DoF pose.
- **Static occlusion:** exported room geometry writes depth without color.
- **Dynamic occlusion:** recorded environment depth is reprojected to RGB and compared with virtual axial camera depth using a 30 mm bias. Finite 3×3 nearest-depth splats fill local sampling gaps. Missing/uncovered depth does not occlude. During the hand sequence, an explicitly authored camera-relative knot provides a depth-test target; it is not hand-anchored geometry.
- **Audio:** original microphone audio uses the capture's estimated +188.207 ms onset relative to video. The offset is not clap-validated.

## Reproduce

Prepare `editor/sessions/quest-215403/session.json` with the strict MP4 importer, plus adjacent frames, room geometry, hand stream and audio. Private captures are not bundled with the repository.

The output directory must contain derived `audit/bottle-track.json`, `audit/bottle-masks/`, and 915 `audit/registered-depth/NNNNNN.png` files. Registered depth is RGB8: R×256+G = axial millimetres; B=255 valid, B=0 missing. Images are 320×320, upright and registered to RGB. The audit reconstruction script and report establish this intermediate format.

From `editor`:

```sh
SPATIAL_OUTPUT=/absolute/path/to/new-take-output node scripts/render-new-take.mjs --preview
SPATIAL_OUTPUT=/absolute/path/to/new-take-output node scripts/render-new-take.mjs
```

The script serves localhost, renders `new-take.html` in Chromium, exports 15 fps H.264 and muxes AAC audio. `frame-map.json` retains exact source-frame/timestamp pairing. The 15 fps export does not increase the source's approximately 9.6 Hz observation rate. Preview mode also exports depth on/off PNG pairs at 40, 45 and 65 seconds. Changed pixels establish that depth testing changes the composite, **not** physical registration accuracy.

## Boundaries

The scan has no photographic textures; twin materials are authored. Physical RGB/room alignment and depth silhouettes remain unvalidated. Environment depth is coarse (approximately 5 Hz), has holes, and can produce enlarged or stepped boundaries. No inferred continuous hand mask is claimed. The bottle mask is restricted to a visually reviewed interval. This export establishes no study results, live headset deployment, generative authoring or novel tracking algorithm.
