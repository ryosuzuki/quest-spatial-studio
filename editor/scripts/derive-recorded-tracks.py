#!/usr/bin/env python3
"""Reproducible offline derivation. Private inputs and outputs are never uploaded.

Requires Python 3, ffprobe on PATH, numpy, opencv-python-headless.
Example:
  python derive-recorded-tracks.py CAPTURE OUTPUT --green-start 63.7 --green-end 68.1
The green interval must be selected by inspecting the source; it is not a detector.
Depth and hand coordinate assumptions follow SpatialCapture OpenXR schema v1.
"""

import json, csv, subprocess
from pathlib import Path
import cv2, numpy as np
import argparse

parser = argparse.ArgumentParser(
    description="Derive recorded hand events, optional green-object color tracks, and RGB-registered depth. Requires ffprobe, numpy and opencv-python-headless."
)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--only", choices=["all", "depth", "tracks"], default="all")
parser.add_argument(
    "--green-start",
    type=float,
    default=None,
    help="Explicit inspected green-object interval start in MP4 seconds",
)
parser.add_argument("--green-end", type=float, default=None)
parser.add_argument("--max-depth-age", type=float, default=0.15)
args = parser.parse_args()
if args.max_depth_age <= 0:
    parser.error("--max-depth-age must be positive")
if (args.green_start is None) != (args.green_end is None):
    parser.error("Supply both green interval endpoints")
if args.green_start is not None and args.green_end <= args.green_start:
    parser.error("Green interval must have positive duration")
P = args.source
O = args.output
O.mkdir(parents=True, exist_ok=True)
intr = json.load(open(P / "left_camera_mruk_intrinsics.json"))
fx = float(intr["focalLength"]["x"])
fy = float(intr["focalLength"]["y"])
cx = float(intr["principalPoint"]["x"])
cy = float(intr["principalPoint"]["y"])
iw = int(intr["resolution"]["width"])
ih = int(intr["resolution"]["height"])
outw = 320
outh = 320
# Camera poses are world-space but depth descriptors are tracking-space.
# Reject nonidentity tracking origins until their temporal transform is implemented.
hand_rows = [json.loads(line) for line in open(P / "hands.jsonl")]
for row in hand_rows:
    pos = row["trackingPosition"]
    rot = row["trackingRotation"]
    if (
        any(abs(pos[k]) > 1e-6 for k in "xyz")
        or any(abs(rot[k]) > 1e-6 for k in "xyz")
        or abs(abs(rot["w"]) - 1) > 1e-6
    ):
        raise ValueError(
            "Nonidentity tracking origin: explicit per-depth origin transform required"
        )
schema = json.load(open(P / "spatial-capture-schema.json"))
if schema.get("sdkHandSkeletonVersion") != "OpenXR":
    raise ValueError("Only raw OpenXR hand convention is supported")
D = O / "registered-depth"
if args.only != "tracks":
    D.mkdir(exist_ok=True)
meta = [
    m
    for m in csv.DictReader(open(P / "left_camera_mruk_frame_metadata.csv"))
    if m["file_name"] == "left_camera.mp4" and not m["error"]
]
pts = json.loads(
    subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v",
            "-show_frames",
            "-show_entries",
            "frame=best_effort_timestamp_time",
            "-of",
            "json",
            str(P / "left_camera.mp4"),
        ]
    )
)["frames"]
pts = [float(x["best_effort_timestamp_time"]) for x in pts]
desc = (
    list(csv.DictReader(open(P / "left_depth_descriptors.csv")))
    if args.only != "tracks"
    else []
)
if len(meta) != len(pts):
    raise ValueError("Accepted metadata / decoded frame count mismatch")
if not meta:
    raise ValueError("No accepted camera frames")


def R(q):
    x, y, z, w = q
    return np.array(
        [
            [1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * z * w, 2 * x * z + 2 * y * w],
            [2 * x * y + 2 * z * w, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * x * w],
            [2 * x * z - 2 * y * w, 2 * y * z + 2 * x * w, 1 - 2 * x * x - 2 * y * y],
        ]
    )


def pose(m, prefix, rot):
    p = np.array([float(m[prefix + c]) for c in "xyz"]) * [1, 1, -1]
    q = np.array([float(m[rot + c]) for c in "xyzw"]) * [-1, -1, 1, 1]
    return p, R(q)


cache = {}
records = []
for i, m in enumerate(meta if args.only != "tracks" else []):
    ts = float(m["timestamp_us_realtime"]) / 1e6
    d = min(desc, key=lambda d: abs(float(d["timestamp_ms"]) / 1000 - ts))
    dt = float(d["timestamp_ms"]) / 1000 - ts
    if abs(dt) > args.max_depth_age:
        records.append(
            {
                "frameIndex": i,
                "timeSeconds": pts[i],
                "valid": False,
                "depthTimeOffsetSeconds": dt,
            }
        )
        continue
    key = d["timestamp_ms"]
    if key not in cache:
        raw = np.fromfile(P / "left_depth" / f"{key}.raw", dtype="<f4").reshape(
            int(d["height"]), int(d["width"])
        )
        valid = np.isfinite(raw) & (raw > 0) & (raw < 1)
        near = float(d["near_z"])
        far = float(d["far_z"])
        if np.isfinite(far):
            zz = far * near / (far - (far - near) * raw)
        else:
            zz = near / (1 - raw)
        valid &= (zz >= 0.1) & (zz <= 12)
        dh, dw = raw.shape
        yy, xx = np.mgrid[:dh, :dw]
        xt = -float(d["fov_left_angle_tangent"]) + (xx + 0.5) / dw * (
            float(d["fov_left_angle_tangent"]) + float(d["fov_right_angle_tangent"])
        )
        yt = float(d["fov_top_angle_tangent"]) - (yy + 0.5) / dh * (
            float(d["fov_top_angle_tangent"]) + float(d["fov_down_angle_tangent"])
        )
        pd, rd = pose(d, "create_pose_location_", "create_pose_rotation_")
        cache = {
            key: np.stack(
                [xt[valid] * zz[valid], yt[valid] * zz[valid], -zz[valid]], -1
            )
            @ rd.T
            + pd
        }
    p, rc = pose(m, "pose_pos_", "pose_rot_")
    cam = (cache[key] - p) @ rc
    uv = np.array(
        [
            (cx + fx * cam[:, 0] / -cam[:, 2]) * outw / iw,
            (cy - fy * cam[:, 1] / -cam[:, 2]) * outh / ih,
        ]
    ).T
    dep = np.full((320, 320), 65535, dtype=np.uint16)
    valid = (
        np.isfinite(uv).all(1)
        & (cam[:, 2] < -0.1)
        & (cam[:, 2] > -12)
        & (uv[:, 0] >= 0)
        & (uv[:, 0] < 320)
        & (uv[:, 1] >= 0)
        & (uv[:, 1] < 320)
    )
    u = uv[valid, 0].astype(int)
    v = uv[valid, 1].astype(int)
    z = np.clip(-cam[valid, 2] * 1000, 1, 65534).astype(np.uint16)
    np.minimum.at(dep, (v, u), z)
    dep[dep == 65535] = 0
    # Preserve holes. No inpainting, dilation, smoothing or temporal interpolation.
    rgb = np.stack([dep // 256, dep % 256, (dep > 0) * 255], -1).astype(np.uint8)
    name = f"{i:06d}.png"
    cv2.imwrite(str(D / name), rgb[:, :, ::-1])
    dep.astype("<u2").tofile((D / name).with_suffix(".bin"))
    records.append(
        {
            "frameIndex": i,
            "timeSeconds": pts[i],
            "valid": True,
            "depthTimeOffsetSeconds": dt,
            "coverage": float((dep > 0).mean()),
            "file": f"registered-depth/{name}",
            "binaryFile": f"registered-depth/{i:06d}.bin",
        }
    )
    if i % 200 == 0:
        print(i, flush=True)
if args.only != "tracks":
    json.dump(
        {
            "version": 1,
            "width": 320,
            "height": 320,
            "rgbImageWidth": iw,
            "rgbImageHeight": ih,
            "binaryEncoding": "uint16 little-endian 320x320 row-major upright millimetres;0invalid",
            "orientation": "upright top-left origin; same as vflip raw MP4",
            "encoding": "PNG RGB8: millimetres = R*256+G; B=255 valid, B=0 invalid. No color-space conversion. Axial camera depth, not Euclidean range.",
            "reprojection": "Raw float32 OpenGL normalized depth linearized with descriptor near/far; Unity XROcclusion pose converted to RH; per-RGB calibrated intrinsics/pose; nearest depth with configured age gate",
            "edgePolicy": "Nearest splats only; preserve all invalid holes. No inpainting or dilation. 5Hz depth cannot recover fast silhouettes.",
            "frames": records,
        },
        open(O / "registered-depth.json", "w"),
        indent=2,
    )
print("finished", len(records), flush=True)

# Genuine recorded hand-state events, no reconstructed or scripted gesture states.
if args.only != "depth":
    hands = hand_rows
    t0 = float(meta[0]["timestamp_us_realtime"]) / 1e6
    stats = {}
    events = []
    for side in ["left", "right"]:
        rows = [r for r in hands if r[side]["valid"] and r[side]["tracked"]]
        ages = np.array([r["ovrSeconds"] - r[side]["sampleTimestamp"] for r in rows])
        stats[side] = {
            "tracked": len(rows),
            "total": len(hands),
            "sampleAgePercentilesSeconds": np.percentile(
                ages, [0, 50, 90, 100]
            ).tolist()
            if len(ages)
            else [],
            "pinchPositiveSamples": sum(r[side]["pinches"] != 0 for r in rows),
        }
        for r in rows:
            h = r[side]
            age = r["ovrSeconds"] - h["sampleTimestamp"]
            if h["pinches"] and abs(age) < 0.15:
                events.append(
                    {
                        "t": r["unixMs"] / 1000 - t0,
                        "side": side,
                        "pinches": h["pinches"],
                        "strength": h["pinchStrength"],
                        "sampleAge": age,
                        "rootPosition": h["rootPosition"],
                    }
                )
    json.dump(
        {
            "handStats": stats,
            "pinchSamples": events,
            "limitation": "Recorded SDK pinch flags, not independently validated physical contact events. Joint alignment requires separate physical validation.",
        },
        open(O / "hand-events.json", "w"),
        indent=2,
    )
    if args.green_start is not None and args.green_end is not None:
        cap = cv2.VideoCapture(str(P / "left_camera.mp4"))
        maskdir = O / "bottle-masks"
        maskdir.mkdir(exist_ok=True)
        tracks = []
        for i, t in enumerate(pts):
            ok, im = cap.read()
            if not ok:
                raise ValueError("Video decoder ended before ffprobe frame count")
            if not args.green_start <= t <= args.green_end:
                continue
            im = cv2.flip(im, 0)
            hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
            mask = cv2.inRange(hsv, np.array([31, 85, 45]), np.array([85, 255, 255]))
            mask[: int(ih * 0.3125)] = 0
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, l, st, c = cv2.connectedComponentsWithStats(mask)
            candidates = [
                j for j in range(1, n) if st[j, 4] >= 350 and st[j, 3] > st[j, 2] * 0.65
            ]
            if not candidates:
                continue
            j = max(candidates, key=lambda j: st[j, 4])
            x, y, w, h, area = st[j].tolist()
            name = f"{i:06d}.png"
            cv2.imwrite(str(maskdir / name), (l == j).astype(np.uint8) * 255)
            tracks.append(
                {
                    "frameIndex": i,
                    "timeSeconds": t,
                    "centroid": c[j].tolist(),
                    "bbox": [x, y, w, h],
                    "area": area,
                    "mask": f"bottle-masks/{name}",
                }
            )
        cap.release()
        json.dump(
            {
                "method": "HSV connected-component segmentation in an explicitly inspected interval; not general object recognition or 6DoF tracking",
                "imageOrientation": "upright (vflip decoded MP4)",
                "width": iw,
                "height": ih,
                "frames": tracks,
                "limitation": "Only visible green pixels are masked. White labels and hands are excluded. Appearance thresholds and lower-image search region must be revalidated on each take.",
            },
            open(O / "bottle-track.json", "w"),
            indent=2,
        )
errors = [
    float(m["timestamp_us_realtime"]) / 1e6
    - float(meta[0]["timestamp_us_realtime"]) / 1e6
    - t
    for m, t in zip(meta, pts)
]
json.dump(
    {
        "acceptedMetadataFrames": len(meta),
        "decodedFrames": len(pts),
        "cameraVsPtsErrorSeconds": {
            "min": min(errors),
            "max": max(errors),
            "median": float(np.median(errors)),
        },
        "depthFrames": len(records),
        "depthGatedFrames": sum(not r["valid"] for r in records),
        "coveragePercentiles": [
            float(x)
            for x in np.percentile(
                [r["coverage"] for r in records if r["valid"]], [0, 50, 100]
            )
        ]
        if any(r["valid"] for r in records)
        else [],
    },
    open(O / "derivation-verification.json", "w"),
    indent=2,
)
