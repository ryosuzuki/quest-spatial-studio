# Quest Spatial Studio

Questで一度撮影し、部屋・カメラ軌跡を使って後からAR動画を編集する実験環境。

**開発中です。コードの存在、ビルド成功、実機取得成功は区別します。** 最新の確認状況は [STATUS.md](docs/STATUS.md)。自宅の映像・音声・部屋スキャン・認証情報はこのリポジトリに含めません。

## 構成

- **recorder/** — Unity/Questネイティブ録画アプリ。既存のQuestRealityCaptureを拡張。
- **editor/** — Three.jsの映像合成＋3D俯瞰・カメラ軌跡・配置編集。WebXR表示の入口も実装。
- **scripts/** — インストール・データ回収用コマンド。
- **docs/** — 撮影手順、ファイル形式、検証状況。

## 目指す録画セット

- `left_camera.mp4` ＋各フレームのカメラ姿勢・内部パラメータ
- `audio.wav` ＋ `audio-timing.json`（音声の開始時刻は推定。拍手で同期を検証）
- `hands.jsonl` ＋手の骨格定義・追跡信頼度・欠測状態
- `room-scan.json`（MRUKの原形式）＋ `room-geometry.json`（Three.js用の実測メッシュ／空間アンカーの境界）
- 頭・コントローラ姿勢、深度（既存レコーダー由来）

30fpsは目標値で、端末での測定結果ではありません。映像のPTSと実際にエンコードされたフレームの照合が必要です。部屋スキャンとカメラ映像の座標系はそのまま混ぜず、変換・位置合わせを検証します。

## まず編集画面を試す（Quest不要）

```sh
cd editor
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/demo.py
npm start
```

`http://localhost:8766` を開きます。左が撮影カメラからの合成、右が自由視点の3D空間です（狭い画面では上下）。3D空間の矢印をドラッグすると、同じ物体の配置が映像にも反映されます。合成サンプルは人工データと明示しています。

`room-geometry.json` を読み込むとスキャンした部屋を表示できます。必ず同じ録画セッションのファイルを使ってください。別セッションやPolycamは別途位置合わせが必要です。

WebXRは対応ブラウザとHTTPS（localhostは例外）が必要です。デスクトップ動作確認とQuestブラウザでのXR動作確認は別です。

## 部屋だけを見る

`editor/room.html` を開き、`room-geometry.json` を選ぶと実測メッシュと家具の境界を自由視点で表示できます。映像なしで使えます。部屋のローカルJSONはGit管理対象外の `editor/private/` に置いてください。別の起動時に撮った映像へ自動で位置合わせはしません。

## Questアプリ

[撮影・導入手順](docs/RECORDING.md) / [録画実装の説明](recorder/Assets/SpatialCapture/README.md)

アプリ名は **Spatial Capture**、パッケージは `org.openclaw.spatialcapture`。既存のQuestRealityCaptureと別アプリなので元の録画を消しません。

ビルド：Unity **6000.4.5f1**、Android Build Support、JDK17、NDK r27c。`recorder/` をUnityプロジェクトとして開きます。公開Unity/Metaパッケージを使います。

```sh
SPATIAL_APK="$PWD/spatial-capture.apk" /path/to/Unity -batchmode -quit \
  -projectPath "$PWD/recorder" -buildTarget Android \
  -executeMethod SpatialCaptureBuild.Android -logFile build.log
```

## 遮蔽・動く物体

部屋メッシュによる静的遮蔽は編集側に実装済み。家具の細かい形状がない場合は遮蔽も粗くなります。録画後の2D追跡、マスク、深度との融合で動く物体にも拡張できますが、一般的な動的物体の6DoF追跡はまだ実装していません。2D点＋机面へのレイ投射は机上の拘束された動きに有効で、空中の任意の動きには追加情報が必要です。

## 出典

Recorder upstream: [t-34400/QuestRealityCapture](https://github.com/t-34400/QuestRealityCapture), snapshot `649c012a3d95363101aa7f9fe53d67c59cbecbec` (MIT; [原ライセンス](recorder/LICENSE)を保持)。Meta/Unity SDKはそれぞれの利用条件に従います。独自拡張と元の実装を区別し、upstreamへの貢献／公式製品とは称しません。
