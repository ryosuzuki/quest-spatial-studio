#!/usr/bin/env bash
set -euo pipefail
serial=${1:?Usage: pull.sh QUEST_SERIAL PRIVATE_DESTINATION}
dest=${2:?Destination required}
mkdir -p "$dest"
"${ADB:-adb}" -s "$serial" pull /sdcard/Android/data/org.openclaw.spatialcapture/files "$dest/"
# Never delete device recordings.
