"""Use a source IPA block only when its exact stressed spelling and phone inventory match."""
import json,unicodedata
from pathlib import Path
_path=Path('public/audio/pronunciations.json');_mtime=None;_entries={}
def speech_text(text,voice):
 global _mtime,_entries
 if not _path.exists():return text
 stamp=_path.stat().st_mtime_ns
 if stamp!=_mtime:_entries=json.loads(_path.read_text());_mtime=stamp
 key=unicodedata.normalize('NFC',unicodedata.normalize('NFD',text.strip().rstrip('.!?…').lower().replace('ѝ','\ue000')).replace('\u0300','\u0301')).replace('\ue000','ѝ')
 item=_entries.get(key)
 if not item:return text
 ipa=item['ipa']
 if not all(phone in voice.config.phoneme_id_map for phone in ipa):return text
 return '[['+ipa+']]'
