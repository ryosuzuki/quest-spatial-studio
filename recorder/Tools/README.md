# Recorder verification

`validate_spatial_take.py TAKE` validates actual video packets against camera poses and decoded frames. Empty/broken MP4 is a failure even when metadata exists. A failed stream does not discard the other diagnostics: the report retains hand/HMD sample counts, WAV duration, and room count. Room counting supports both legacy `Rooms` / `rooms` and MRUK V2 `spatialEntities` with `roomLayoutMETA`. Counts alone do not establish continuous tracking or A/V synchronization.

Run validator regression checks with `python3 -m unittest discover -s recorder/Tools -p 'test_*.py' -v` from the repository root.

`EncoderProbe.java` is an isolated on-device test using 30 synthetic 1280×1280 frames through `enqueueDirect`. Compile with SpatialVideoEncoder.java against android.jar, convert class files with Android build-tools d8, push classes.dex to `/data/local/tmp`, then run `CLASSPATH=/data/local/tmp/probe.dex app_process /system/bin EncoderProbe /data/local/tmp/probe.mp4`. Read `.status.json` and decode all frames with ffmpeg. This tests the codec, not the camera/Unity timing or real capture fps.

GetColors may return a NativeArray longer than width×height. The Unity bridge must slice the valid pixel span before creating a direct ByteBuffer. JNI byte-array marshaling of the full buffer caused rejected video frames and multi-second main-thread stalls in the first device test.

For paced performance and row-order diagnostics see [ENCODER-PERFORMANCE.md](ENCODER-PERFORMANCE.md). `EncoderPacedProbe.java` isolates encoder load; `ConverterTest.java` checks planar/interleaved output and row reflection without a device. Do not describe probe throughput as measured live-camera capture fps.
