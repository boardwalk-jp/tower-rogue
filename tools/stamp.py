# index.html の css/js 読み込みに「?v=日時」を付け直す（スマホが古いファイルを使い回すのを防ぐ）
# 使い方：python3 tools/stamp.py   （ファイルを変えて公開する前に毎回実行）
import re, time, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
v = time.strftime('%Y%m%d%H%M%S')
s = p.read_text(encoding='utf-8')
s = re.sub(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + v + '"', s)
# タイトル画面の右下に版（日時）を出す：古い版のまま遊んでいないか確かめられるように
s = re.sub(r'id="ver">[^<]*<', 'id="ver">版 ' + v[4:6] + '/' + v[6:8] + ' ' + v[8:10] + ':' + v[10:12] + '<', s)
p.write_text(s, encoding='utf-8')
print('v=' + v)
