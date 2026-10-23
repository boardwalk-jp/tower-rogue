# index.html の css/js 読み込みに「?v=日時」を付け直す（スマホが古いファイルを使い回すのを防ぐ）
# 使い方：python3 tools/stamp.py   （ファイルを変えて公開する前に毎回実行）
import re, time, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
v = time.strftime('%Y%m%d%H%M%S')
s = p.read_text(encoding='utf-8')
s = re.sub(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + v + '"', s)
# タイトル画面の右下に版（日時）を出す：古い版のまま遊んでいないか確かめられるように
# id="ver" の後ろに role や aria-label などの属性が付いていても書き換えられるようにする（2026-10-24 修正：属性を足した後、版の時刻が更新されなくなっていた）
s, n = re.subn(r'(id="ver"[^>]*>)[^<]*<', lambda m: m.group(1) + '版 ' + v[4:6] + '/' + v[6:8] + ' ' + v[8:10] + ':' + v[10:12] + '<', s)
if n != 1:
    raise SystemExit('NG: index.html の id="ver" の行が見つからない（または複数ある）ので、版を更新できません')
p.write_text(s, encoding='utf-8')
# 統計ページ（stats.html）のグラフ用ファイルにも同じ番号を付ける（2026-10-23）
q = p.parent / 'stats.html'
t = q.read_text(encoding='utf-8')
q.write_text(re.sub(r'(src="js/statsgraph\.js)(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + v + '"', t), encoding='utf-8')
print('v=' + v)
