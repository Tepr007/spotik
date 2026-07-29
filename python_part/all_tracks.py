import json
import ijson
from atomic_write_json import atomic_write_json

def update():
    with open("../playlists.json", 'r', encoding="utf-8") as file:
        playlists = json.load(file)
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        # tracks = {}
        # for track_id, track in ijson.kvitems(file, ""):
        #     track.pop("cover", None)
        #     tracks[track_id] = track
        tracks = json.load(file)
    playlists["Все треки"] = []
    for i in tracks:
        playlists["Все треки"].append(i)
    atomic_write_json("../playlists.json", playlists)