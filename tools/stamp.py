# index.html の css/js 読み込みに「?v=日時」を付け直す（スマホが古いファイルを使い回すのを防ぐ）
# 使い方：python3 tools/stamp.py   （ファイルを変えて公開する前に毎回実行）
import re, time, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
v = time.strftime('%Y%m%d%H%M%S')
s = p.read_text(encoding='utf-8')
s = re.sub(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + v + '"', s)
p.write_text(s, encoding='utf-8')
print('v=' + v)
