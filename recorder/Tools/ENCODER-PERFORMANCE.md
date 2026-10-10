# Recording performance changes — 2026-10-10

## Implementation

The input queue remains bounded at three frames. A reusable RGBA→YUV converter computes each row into ordinary byte arrays and performs bulk ByteBuffer row writes instead of millions of checked per-pixel writes. Flexible YUV planes may share interleaved backing memory: gap bytes are preserved before writing U then V. No camera timestamps are synthesized; queue rejects and accepted-packet PTS retain their previous contract.

Encoder status adds cumulative nanosecond totals for RGBA copy, conversion, input-buffer waiting, output-buffer waiting, and mux writes. `converted` is the conversion denominator; waiting totals include idle waiting, not only productive work. Camera stage profiles separately measure GetColors, enqueue/JNI, and metadata serialization with a recorded Stopwatch frequency. Timer sums are not end-to-end wall time.

The four-argument encoder constructor accepts an `uprightOutput` boolean. It flips only encoded pixel rows and records `encodedRowOrder`, `rawRowOrder` and `cameraToEncodedPixelTransform`. The three-argument compatibility constructor preserves legacy bottom-up output. Sensor poses and raw intrinsics are never silently reflected. Existing importers must consume the encoded row-order before enabling upright output at the app call site; otherwise they can double-flip pixels.

## Verified Quest encoder-only benchmarks

1280×1280 RGBA, same three-frame queue, synthetic source, isolated app_process (not Unity/camera/depth workload):

| Paced input | Original encoded / attempts | Improved encoded / attempts | Queue rejects old → new | Conversion mean old → new |
|---|---:|---:|---:|---:|
| 30fps, 10s | 300/300 | 300/300 | 0 → 0 | 26.03 → 10.90ms |
| 40fps stress, 10s | 354/400 | 400/400 | 46 → 0 | 26.20 → 10.53ms |

Both 30fps outputs fully decode and all 300 decoded-frame hashes match byte-for-byte. The two stress outputs fully decode. Upright mode encoded30/30 frames and passed vertical gradient orientation checks. JVM converter tests cover36 width/height/row-order/planar/interleaved cases. This demonstrates conversion throughput improvement; **it does not prove a new real-camera frame rate or physical calibration**. The original capture's camera24.3fps / MP4 9.0fps mismatch requires an instrumented real capture to measure the remaining Unity/depth/codec/thermal workload.

## Reproduction

Compile `SpatialVideoEncoder.java`, `RgbaYuvConverter.java`, and `Tools/EncoderPacedProbe.java` against Android35 android.jar; convert classes with d8; push dex to `/data/local/tmp` on the verified Quest. Run:

```
CLASSPATH=/data/local/tmp/probe.dex app_process /system/bin EncoderPacedProbe /data/local/tmp/probe.mp4 300 30 false
```

The source is synthetic, not camera footage. Read status and packet logs, pull the video, fully decode, and compare image hashes. `ConverterTest.java` needs only javac/java and the converter source. Do not stop or reinstall over an active user capture; inspect the current app and recording files before installation.

## Upright app integration — continuation

The recorder now opts into top-down encoded MP4 rows. Raw sensor calibration and pose rows remain unchanged. `editor/scripts/import_video.py` consumes `encodedRowOrder` from encoder status, preserves legacy bottom-up behavior when metadata is absent, and rejects a conflicting explicit override. This prevents replay double-flipping. Version0.1.5/versionCode6 enables the output mode; installed-device/live recording validation remains separate.
