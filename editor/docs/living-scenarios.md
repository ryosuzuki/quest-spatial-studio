# Living Room: spatial AI scenario prototype

This revision is separate from the editor tutorial. It reuses the full Quest take `20261002_215403` and adds scenario-oriented, executable Three.js content.

## Scenes and interaction

- Room-anchored research/home/creative-agent notifications; expand and gather the stack.
- A studded brick assembly that builds over time.
- A paper crane driven by valid recorded pinch flags; an authored camera-relative presentation is used during the hand segment, not a claim of palm anchoring.
- A solar-system explanation and the existing short green-bottle 2D tracker.
- A tabletop miniature with moving figures and architecture, backed by newly generated observatory artwork. The image is an illustrative world, not a reconstructed personal memory.

Open `node scripts/serve-living-scenarios.mjs` from the editor directory, then http://127.0.0.1:8795/living-scenarios.html . Select a scenario, expand/gather, scrub time, or play. Clicking the AR canvas also toggles expansion. Notification action words are illustrative; no email or home-device actions execute.

The full movie preserves the original approximately 95-second timeline. Geometry animates at export time; source observations remain approximately 9.6 Hz. Dynamic depth is approximately 5 Hz and produces visibly coarse edges. The original estimated +188.207 ms audio offset is retained. Physical registration is not independently measured. The generative artwork is produced offline; this is not a live AI agent deployment.

## Sources and reproducibility

- Current measured Quest replay and frozen registered-depth audit.
- User's `mockup-1-ja.txt` scenario brief and 32-frame concept sheet.
- Earlier AR-at-home Living Pages `source/models.js`, copied into `src/living-models.mjs` with import-path adaptation. No external GLB model is used in this revision.
- AR and AI Grand Challenges reference PDF: SHA256 9068467a37d1ad0d76bf6c9fa17c189eb1fcd5643cb24b374cde9a380d805c0c. Available source snapshot, not newly reverified as the latest submission. Relevant scenarios: controllable situated plans; generated experiences; just-in-time instruction and capability scaffolding.

New image: built-in image generation, retained at `private/living-portal.png`. Prompt: a premium animated-film miniature floating woodland island, copper-and-ivory observatory, waterfalls, foliage, lanterns, twilight blue and amber; no people, UI, text, or watermark. Used as a portal texture alongside actual geometry, not as proof of reconstructed 3D.

Renderer: `scripts/render-living-scenarios.mjs`; source: `src/living-scenarios.mjs`; entry: `living-scenarios.html`. Output directory is controlled by SPATIAL_OUTPUT. Frozen audit remains in the existing new-take output directory. Keep captures and generated private assets out of public commits.

## Figure and paper updates

Use exact exported-video frames, source timestamps from frame-map.json, and interaction-verification.json. Separate recorded input, authored scenario content, browser input, and generated artwork in captions. Do not claim live generative behavior, 6DoF bottle tracking, quantitative registration accuracy, semantic page recognition, or automatic agent orchestration. Keep all GitHub and manuscript text in English.
