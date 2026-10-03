#!/usr/bin/env python3
"""Connect-later setup and lossless capture retrieval. Never starts recording."""
import argparse, datetime, json, os, re, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
REMOTE = '/sdcard/Android/data/com.t34400.QuestRealityCapture/files'

def run(args):
    return subprocess.check_output(args, text=True).strip()

def select_quest(adb, serial=None):
    lines = run([adb, 'devices']).splitlines()[1:]
    devices = [line.split()[0] for line in lines if len(line.split()) >= 2 and line.split()[1] == 'device']
    matches = []
    for item in devices:
        if serial and item != serial: continue
        model = run([adb, '-s', item, 'shell', 'getprop', 'ro.product.model'])
        if model in ('Quest 3', 'Quest 3S'): matches.append(item)
    if len(matches) != 1:
        raise ValueError('接続・USB許可済みのQuest 3/3Sを1台だけ接続してください。複数台なら --serial で指定。ほかの端末には変更しません。')
    return matches[0]

def safe_sessions(names):
    return sorted(n for n in names.splitlines() if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', n))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['setup', 'import'])
    parser.add_argument('--serial'); parser.add_argument('--session')
    parser.add_argument('--row-order', choices=['bottom-up','top-down'], default='bottom-up')
    a=parser.parse_args()
    adb=os.environ.get('ADB') or shutil.which('adb') or str(Path.home()/'Library/Android/sdk/platform-tools/adb')
    if not Path(adb).is_file(): raise ValueError('ADBが見つかりません: Android Platform Toolsが必要です。')
    serial=select_quest(adb,a.serial); prefix=[adb,'-s',serial]
    if a.action=='setup':
        subprocess.run(['bash',str(ROOT/'recording/install.sh'),serial],env={**os.environ,'ADB':adb},check=True)
        return
    names=safe_sessions(run(prefix+['shell','ls','-1',REMOTE]))
    sessions=[]
    for name in names:
        result=subprocess.run(prefix+['shell','test','-f',f'{REMOTE}/{name}/session_info.json'],capture_output=True)
        if result.returncode==0:sessions.append(name)
    if a.session:
        if a.session not in sessions:raise ValueError('指定セッションが見つかりません。')
        name=a.session
    elif not sessions: raise ValueError('録画がありません。ヘッドセット内で短い録画を開始・停止してから再実行してください。')
    else:
        print('録画を停止済みのセッションを選択してください:')
        for i,n in enumerate(sessions):print(f'{i+1}: {n}')
        index=int(input('番号: '))-1
        if not 0<=index<len(sessions):raise ValueError('範囲外の番号です。')
        name=sessions[index]
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    raw=ROOT/'captures'/stamp/name;raw.parent.mkdir(parents=True)
    subprocess.run(prefix+['pull',f'{REMOTE}/{name}',str(raw)],check=True)
    from import_mruk import convert
    destination=ROOT/'sessions'/f'take-{stamp}'
    manifest=convert(raw,destination,row_order=a.row_order)
    receipt={'device':serial,'sourceSession':name,'raw':str(raw),'report':manifest['report'],'physicalValidation':'pending'}
    (destination/'import-receipt.json').write_text(json.dumps(receipt,indent=2))
    relative=destination.relative_to(ROOT).as_posix()+'/session.json'
    (ROOT/'sessions/latest.txt').write_text(relative)
    print(f"取り込み完了: {manifest['report']['accepted']} フレーム。元データは captures/ に保存。\n画像の上下と実機精度は確認が必要です。")
    print('START.command でこのセッションを開けます。')

if __name__=='__main__':
    try:main()
    except (ValueError,OSError,subprocess.CalledProcessError) as error:
        print(str(error),file=sys.stderr);sys.exit(1)
