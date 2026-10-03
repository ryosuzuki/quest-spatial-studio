#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/editor"
if [ ! -d node_modules/three ]; then PATH="/opt/homebrew/bin:$PATH" npm ci; fi
if [ ! -f sessions/demo/session.json ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
  .venv/bin/python scripts/demo.py
fi
if ! curl -fsS http://127.0.0.1:8766/index.html >/dev/null 2>&1; then
 nohup python3 -m http.server 8766 --bind 127.0.0.1 > /tmp/quest-spatial-studio-server.log 2>&1 &
fi
open http://127.0.0.1:8766
