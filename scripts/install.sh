#!/usr/bin/env bash
set -euo pipefail
serial=${1:?Usage: install.sh QUEST_SERIAL APK}
apk=${2:?APK required}
adb_bin=${ADB:-adb}
model=$("$adb_bin" -s "$serial" shell getprop ro.product.model | tr -d '\r')
case "$model" in 'Quest 3'|'Quest 3S') ;; *) echo "Wrong target: $model" >&2; exit 2;; esac
"$adb_bin" -s "$serial" install -r "$apk"
base=/sdcard/Android/data/org.openclaw.spatialcapture/files
"$adb_bin" -s "$serial" shell mkdir -p "$base"
"$adb_bin" -s "$serial" push "$(dirname "$0")/recording_config.json" "$base/recording_config.json"
"$adb_bin" -s "$serial" shell pm path org.openclaw.spatialcapture
