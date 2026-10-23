# push 前の確認：ゲームのファイルを変えたのに、タイトル右下の版（stamp）が新しくなっていないと失敗する
# 使い方：python3 tools/check-stamp.py   （origin/main と今の状態を比べる。先に git fetch origin main しておく）
import subprocess, sys, re

GAME = re.compile(r'^(index\.html|css/|js/|functions/|db/)')

def git(*a):
    return subprocess.run(['git'] + list(a), capture_output=True, text=True, check=True).stdout

try:
    changed = [f for f in git('diff', '--name-only', 'origin/main').splitlines() if GAME.match(f)]
    ver_diff = git('diff', 'origin/main', '--', 'index.html')
except subprocess.CalledProcessError as e:
    print('NG: origin/main と比べられません。先に git fetch origin main を実行してください')
    sys.exit(2)

if not changed:
    print('OK: ゲームのファイルに変更なし（stamp は不要）')
    sys.exit(0)

# 版の「日時」の文字そのものが変わっているか（aria-label などの別の変更では OK にしない）
old = re.findall(r'^-.*id="ver"[^>]*>(版 [^<]*)<', ver_diff, re.M)
new = re.findall(r'^\+.*id="ver"[^>]*>(版 [^<]*)<', ver_diff, re.M)
if new and old != new:
    print('OK: 版が新しくなっています（' + new[-1] + '）')
    sys.exit(0)

print('NG: ゲームのファイルを変えたのに、版が新しくなっていません。')
print('    変更したファイル：' + ', '.join(changed))
print('    python3 tools/stamp.py を実行してから commit してください')
sys.exit(1)
