import json
from pathlib import Path

payload = json.loads(Path('/tmp/3tshan-public.json').read_text(encoding='utf-8'))
rows = payload.get('data', [])
status_counts = {}
photo_sizes = []
for row in rows:
    status_counts[row.get('status')] = status_counts.get(row.get('status'), 0) + 1
    photo = row.get('photo_url') or ''
    if photo.startswith('data:'):
        photo_sizes.append(len(photo))
print('rows=', len(rows))
print('statuses=', status_counts)
print('base64_photo_count=', len(photo_sizes))
print('base64_photo_bytes=', sum(photo_sizes))
print('max_photo_chars=', max(photo_sizes, default=0))
