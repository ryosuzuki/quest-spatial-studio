# 撮影手順

[トップへ戻る](../README.md) · [クイックスタート](QUICKSTART.md) · [開発ガイド](DEVELOPMENT.md)

最新の配布APKは [Spatial Capture 0.1.3テスト版](https://github.com/ryosuzuki/quest-spatial-studio/releases/tag/v0.1.3-test) のAssetsにあります。以下のコマンドはリポジトリのルートで実行し、`QUEST_SERIAL` とパスは実際の値に置き換えます。

## 準備

1. Quest 3/3Sで部屋のスキャンを済ませます。既に済んでいればやり直し不要です。
2. データ通信対応のUSBでMacに接続。USBデバッグを許可します。
3. `adb devices -l` が対象のQuestを `device` と表示することを確認します。
4. ビルド済みAPKを `scripts/install.sh QUEST_SERIAL spatial-capture.apk` でインストールします。
5. 提供元不明 → **Spatial Capture** を起動。カメラ・マイク・空間データの権限を許可します。

## 短いテスト

- まずアプリを起動するだけで部屋の書き出しを試みます。新しいスキャンは自動開始しません。
- 左コントローラのメニューボタンで録画開始／停止（既存アプリと同じ操作）。
- 20秒程度、静止した机を見て、頭を回すだけでなく少し横へ動いて撮影します。
- 手を記録する場合はコントローラを置き、Questのハンドトラッキングを有効にします。机上で左右の手を開いたり指を動かしたりします。
- 画面に見える位置で1回拍手すると、映像と音声の同期確認ができます。
- 停止後は10秒ほど待ち、MP4の確定を待ってから取り込みます。録画中の強制終了はしないでください。

USBを外しても既存データは消えません。アプリ更新と取り込みには接続が必要です。録画自体はQuest単体で行う構成です。

## 取り込みと検証

```sh
scripts/pull.sh QUEST_SERIAL /path/to/private-captures
python3 recorder/Tools/validate_spatial_take.py /path/to/private-captures/files/TAKE
```

`pull.sh` は保存先の下に `files/` を作ります。`TAKE` はその中の撮影日時フォルダです。元データは削除しません。

`room-export-status.json` の成功と、実際の `room-geometry-latest.json` の形状を確認します。手は `tracked=true` のサンプルと関節配列、音声は空でないWAV、動画は全フレームのデコードとPTS対応を確認します。実機未検証の段階で「全部録れた」と判断しないでください。

## 編集用に取り込む

```sh
cd editor
.venv/bin/python scripts/import_video.py /path/to/TAKE sessions/my-take --row-order bottom-up
npm start
```

`http://localhost:8766/?session=sessions/my-take/session.json` を開きます。音声・部屋・手のデータがあれば同時に読み込みます。映像の上下方向は非対称な目印で必ず確認してください。WebXR表示は別途HTTPS配信が必要です。

配置を保存した後は、ローカルサーバーを動かしたまま次でMP4を書き出せます。

```sh
node scripts/export.mjs sessions/my-take/session.json exports/my-take /path/to/placement.json
```

音声がある場合は推定オフセットで合成します。拍手などで同期誤差を確認してください。
