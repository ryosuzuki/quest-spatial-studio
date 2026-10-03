# 開発ガイド

[トップへ戻る](../README.md) · [使い方](QUICKSTART.md) · [検証状況](STATUS.md)

## コードの場所

| 場所 | 役割 |
| --- | --- |
| [recorder/](../recorder/) | Unityプロジェクト。元アプリと追加実装を含む |
| [SpatialCaptureExtras.cs](../recorder/Assets/SpatialCapture/SpatialCaptureExtras.cs) | 手・部屋などの追加記録 |
| [SpatialMicrophone.cs](../recorder/Assets/SpatialCapture/SpatialMicrophone.cs) | マイク音声と時刻情報 |
| [RoomGeometryExport.cs](../recorder/Assets/SpatialCapture/RoomGeometryExport.cs) | 部屋をThree.js向け形状へ変換 |
| [SpatialVideoEncoder.java](../recorder/Assets/Plugins/Android/SpatialVideo/SpatialVideoEncoder.java) | Android動画エンコーダ |
| [SpatialCaptureBuild.cs](../recorder/Assets/SpatialCapture/Editor/SpatialCaptureBuild.cs) | APKビルド設定・アプリID・バージョン |
| [editor/src/](../editor/src/) | Three.js再生・物体配置・部屋表示 |
| [editor/scripts/](../editor/scripts/) | データ変換、サンプル生成、動画書き出し |
| [scripts/](../scripts/) | ADBインストール・データ回収・録画設定 |
| [validate_spatial_take.py](../recorder/Tools/validate_spatial_take.py) | 実録画の動画・姿勢対応検証 |

元アプリの仕様は [recorder/README.md](../recorder/README.md)、追加分は [SpatialCapture/README.md](../recorder/Assets/SpatialCapture/README.md)。元アプリのパッケージ名・配布APKと、このプロジェクトのものは別です。

## UnityでAPKをビルド

Unity **6000.4.5f1**、Android Build Support、SDK、JDK **17**、NDK **r27c**、有効なUnityライセンスが必要です。`recorder/` をUnity Hubに追加し、パッケージ解決を完了させます。

リポジトリのルートから実行します。`/path/to/Unity` は実際のUnity実行ファイルに置き換えます。

```sh
mkdir -p recorder/Builds
SPATIAL_APK="$PWD/recorder/Builds/spatial-capture.apk" /path/to/Unity -batchmode -quit \
  -projectPath "$PWD/recorder" -buildTarget Android \
  -executeMethod SpatialCaptureBuild.Android -logFile "$PWD/build.log"
```

出力はDevelopment/ARM64/IL2CPP、アプリIDは `org.openclaw.spatialcapture`。現在の設定は0.1.3、versionCode 4です。カスタム署名鍵は使いません。別マシンで作ったAPKは署名が異なる場合があります。更新で署名エラーが出た場合、データを消すアンインストールはせず、まず元データを回収し、同じ署名のビルドを用意してください。

```sh
adb devices -l
bash scripts/install.sh QUEST_SERIAL recorder/Builds/spatial-capture.apk
```

`QUEST_SERIAL` は一覧の実機IDに置き換えます。インストーラはQuest 3/3Sを確認し、録画設定も配布します。

## 編集側のセットアップとテスト

```sh
cd editor
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm test
```

FFmpegとffprobeをPATHに用意してください。自動テストはJavaScriptの幾何処理とPythonの取り込み・動画対応を確認します。実機のカメラfps・手の追跡・音声同期の代わりにはなりません。

実機テストは[撮影手順](RECORDING.md)と[検証ツールの説明](../recorder/Tools/README.md)を使います。結果を更新する場合は、合成エンコーダテストと実カメラ撮影を区別して[STATUS.md](STATUS.md)に記録します。

## データと公開範囲

- APKはGitHub Releases、コードと手順はmainブランチ。
- 録画・音声・部屋スキャンはローカル保存。`editor/private/`、`captures/`、`sessions/`、`exports/` はGit管理対象外です。
- `pull.sh` はコピーのみでQuest内の録画を削除しません。
- 元実装のMITライセンスは [recorder/LICENSE](../recorder/LICENSE) に保持。Unity/Meta SDKは各提供元の利用条件に従います。
