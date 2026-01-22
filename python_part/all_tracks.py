import json
from atomic_write_json import atomic_write_json

def update():
    with open("../playlists.json", 'r', encoding="utf-8") as file:
        playlists = json.load(file)
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        tracks = json.load(file)
    playlists["Все треки"] = []
    for i in tracks:
        playlists["Все треки"].append(i)
    atomic_write_json("../playlists.json", playlists)