# Embedded objects in Spatial Take

Open **Embedded objects** from `index.html` or `living-scenarios.html`, or open `embedded.html` on the same local server. This is an integrated mode of the existing app, not a pre-rendered movie player.

## Implemented workflow

- Five original-footage scenes: refrigerator, shelves/bins, washing machine, drawer, and wall.
- Click a physical target to select it and expand/collapse its attached information.
- Edit text, change between an embedded label, object highlight and surface progress, adjust progress, and mark the target checked.
- Add another surface by choosing a tracked target and clicking four clockwise corners on the **same plane**. Points are transformed back into the reference frame; overlays follow that target's stored image homography during playback and seeking. This is not new object tracking inference.
- Browser-local edits, JSON export/import, original/overlay comparison, restore-example and delete-target controls.
- Invalid or missing tracks suppress rendering. Import only accepts the local packaged media namespace and validates track shape, lengths and target geometry.

## Data and reproduction

Private input is `private/embedded/project.json` plus original JPG sequences. It is excluded from Git. `scripts/prepare-embedded.py` reuses original frames and the existing tracked-object prototype from the local canonical `Storage/outputs/videos/2026-10-02/` sources; Python requires OpenCV and NumPy. It does not overwrite those sources. Run it only when intentionally regenerating the sample package.

`npm start`, then visit `http://127.0.0.1:8766/embedded.html`. Existing living-scenarios server on port 8795 also serves this mode.

## Evidence boundaries

These five scenes use the earlier monocular home video, **not** the 95-second calibrated Quest take. Surface transforms are image-based homographies with manually placed target regions. Contents, stock, notifications and appliance progress are illustrative editable values, not automatic recognition or connected services. A mark-checked action only changes prototype state. No live headset deployment, proactive agent integration, actual drawer-open inference or metric registration is claimed. New surfaces inherit the selected motion plane; selecting an unrelated plane will not produce correct registration. No dynamic hand occlusion is currently applied in this mode.

Verification: projective authoring roundtrip, nonrectangular hit tests, singular transform handling, malformed import rejection, all five scene start/reference/end frames, new-surface creation, browser persistence, JSON export/import equality, and state actions. Browser checks found no uncaught JavaScript errors. Original frames and the calibrated Quest editor are preserved.
