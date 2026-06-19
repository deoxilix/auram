"""Check latest conversation turns in DB."""
import psycopg2
from app.core.config import settings

conn = psycopg2.connect(settings.database_url)
cur = conn.cursor()
cur.execute("""
    SELECT speaker_id, text, segment_index, timestamp
    FROM conversation_turns
    ORDER BY timestamp DESC LIMIT 10
""")
rows = list(cur.fetchall())
rows.reverse()
for r in rows:
    print(f"  speaker={r[0]} seg={r[2]}: {r[1][:70]}")
cur.close()
conn.close()
