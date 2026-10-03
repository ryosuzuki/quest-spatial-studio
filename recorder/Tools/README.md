# Recorder verification

`validate_spatial_take.py TAKE` validates actual video packets against camera poses and decoded frames. Empty/broken MP4 is a failure even when metadata exists.

`EncoderProbe.java` is an isolated on-device test using 30 synthetic 1280×1280 frames through `enqueueDirect`. Compile with SpatialVideoEncoder.java against android.jar, convert class files with Android build-tools d8, push classes.dex to `/data/local/tmp`, then run `CLASSPATH=/data/local/tmp/probe.dex app_process /system/bin EncoderProbe /data/local/tmp/probe.mp4`. Read `.status.json` and decode all frames with ffmpeg. This tests the codec, not the camera/Unity timing or real capture fps.

GetColors may return a NativeArray longer than width×height. The Unity bridge must slice the valid pixel span before creating a direct ByteBuffer. JNI byte-array marshaling of the full buffer caused rejected video frames and multi-second main-thread stalls in the first device test.
