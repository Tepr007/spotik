import json
import os
import tempfile

def atomic_write_json(path, data):
    dir_ = os.path.dirname(path)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=dir_, delete=False) as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=4)
        tmp_path = tmp.name

    os.replace(tmp_path, path)  # атомарно