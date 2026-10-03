#!/usr/bin/env python3
"""Validate each recorded stream independently; preserve evidence from partial takes."""
import csv
import json
import pathlib
import subprocess
import sys
import wave


def room_count(data):
    # MRUK V2 exports scene_META spatial entities; V1 exports Rooms.
    if isinstance(data.get('spatialEntities'), list):
        return sum(isinstance(entity, dict) and 'roomLayoutMETA' in entity
                   for entity in data['spatialEntities'])
    return len(data.get('Rooms', data.get('rooms', [])))


def csv_rows(path):
    with path.open() as stream:
        return list(csv.DictReader(stream))


def validate(path):
    p = pathlib.Path(path)
    result, errors = {}, []
    video_count = 0
    for side in ('left', 'right'):
        video = p / f'{side}_camera.mp4'
        if not video.exists():
            continue
        video_count += 1
        detail = result[side] = {'decoded': False}
        try:
            status = json.loads(pathlib.Path(str(video) + '.status.json').read_text())
            packets = csv_rows(pathlib.Path(str(video) + '.packets.csv'))
            meta = csv_rows(p / f'{side}_camera_mruk_frame_metadata.csv')
            pts = [int(x['pts_us']) for x in packets]
            expected = {int(x['timestamp_us_realtime']) - status['originCameraUs']
                        for x in meta if x['file_name'] == video.name}
            detail.update(frames=len(pts),
                          measuredFps=(len(pts)-1)*1e6/(pts[-1]-pts[0])
                          if len(pts) > 1 and pts[-1] > pts[0] else 0,
                          queueDropped=status['queueDropped'])
            if not status['complete'] or status['error']:
                errors.append(f'{side}: encoder incomplete/error')
            if not pts or any(b <= a for a, b in zip(pts, pts[1:])):
                errors.append(f'{side}: empty or nonmonotonic packet PTS')
            if set(pts) != expected:
                errors.append(f'{side}: packet/metadata PTS mismatch')
            if len(pts) != status['encoded'] or status['accepted'] != status['encoded']:
                errors.append(f'{side}: frame count mismatch')
        except (OSError, ValueError, KeyError, TypeError) as exc:
            errors.append(f'{side}: metadata unavailable/invalid: {exc}')
        try:
            subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(video),
                            '-f', 'null', '-'], check=True, capture_output=True, timeout=60)
            detail['decoded'] = True
        except (OSError, subprocess.SubprocessError) as exc:
            detail['decodeError'] = type(exc).__name__
            errors.append(f'{side}: video decode failed ({type(exc).__name__})')
    if not video_count:
        errors.append('No videos')

    try:
        samples = [json.loads(x) for x in (p / 'hands.jsonl').read_text().splitlines() if x]
        result['handSamples'] = len(samples)
        for side in ('left', 'right'):
            tracked = [x[side] for x in samples if x[side]['valid']
                       and x[side]['tracked'] and x[side].get('boneRotations')]
            result[side + 'TrackedSamples'] = len(tracked)
            if not tracked:
                errors.append(side + ': no tracked hand joints')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors.append(f'Hand samples unavailable/invalid: {exc}')

    try:
        data = json.loads((p / 'room-scan.json').read_text())
        result['roomTopLevelKeys'] = list(data)
        result['roomCount'] = room_count(data)
        if not result['roomCount']:
            errors.append('Room export has no rooms')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors.append(f'Room export unavailable/invalid: {exc}')

    audio = p / 'audio.wav'
    if audio.exists():
        try:
            with wave.open(str(audio), 'rb') as wav:
                result['audio'] = {'sampleCount': wav.getnframes(), 'sampleRate': wav.getframerate(),
                                   'durationSeconds': wav.getnframes() / wav.getframerate(),
                                   'channels': wav.getnchannels()}
                if not wav.getnframes():
                    errors.append('Audio contains no samples')
        except (OSError, ValueError, EOFError, wave.Error) as exc:
            errors.append(f'Audio unavailable/invalid: {exc}')
    if (p / 'hmd_poses.csv').exists():
        try:
            result['hmdSamples'] = len(csv_rows(p / 'hmd_poses.csv'))
        except (OSError, ValueError, csv.Error) as exc:
            errors.append(f'HMD samples unavailable/invalid: {exc}')
    result['errors'] = errors
    result['passed'] = not errors
    return result


if __name__ == '__main__':
    r = validate(sys.argv[1])
    print(json.dumps(r, indent=2))
    sys.exit(0 if r['passed'] else 1)
