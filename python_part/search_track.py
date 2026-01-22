import json

def search(name: str, author: str) -> int:
    author = author.replace("/", ", ")
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        tracks = json.load(file)
    for track in tracks:
        if tracks[track]['name'] == name and tracks[track]['author'] == author:
            return track
    return -1