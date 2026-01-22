import os
import locale

import yt_dlp.utils

print("DEFAULT ENCODING:", locale.getpreferredencoding())
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import subprocess
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import all_tracks
from atomic_write_json import atomic_write_json
from add_track import download_track_from_youtube, download_track_from_spotify, TheTrackIsNotOnYoutube

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    SPOTIFY_CLIENT_ID = settings["SPOTIFY_CLIENT_ID"]
    SPOTIFY_CLIENT_SECRET = settings["SPOTIFY_CLIENT_SECRET"]
    debug = settings["Debug"]

output_dir = "../music"

os.makedirs(output_dir, exist_ok=True)

with open("../playlists.json", 'r', encoding="utf-8") as file:
    playlists = json.load(file)



# Настройка авторизации
auth_manager = SpotifyClientCredentials(client_id=SPOTIFY_CLIENT_ID,
                                        client_secret=SPOTIFY_CLIENT_SECRET)
sp = spotipy.Spotify(auth_manager=auth_manager)
def get_track_spotify_urls(playlist_url):
    urls = []
    if playlist_url.split('/')[3] == "playlist":
        results = sp.playlist_items(playlist_url)
        tracks = results['items']

        # Если плейлист большой — пагинация
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])

        for item in tracks:
            track = item['track']
            if track is not None:
                urls.append(track['external_urls']['spotify'])
    elif playlist_url.split('/')[3] == "album":
        results = sp.album_tracks(playlist_url)
        tracks = results['items']

        # Если плейлист большой — пагинация
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])

        for track in tracks:
            if track is not None:
                urls.append(track['external_urls']['spotify'])
    else:
        return playlist_url

    return urls


def download_tracks_from_spotify(track_urls, PLAYLIST_name):
    playlists[PLAYLIST_name] = []
    atomic_write_json("../playlists.json", playlists)
    for i in range(len(track_urls)):
        run = 5
        while run > 0:
            try:
                url = track_urls[i]

                print(f"🎵 Скачиваю: {url} ({i + 1}/{len(track_urls)})")

                track_id = download_track_from_spotify(url, PLAYLIST_name)
                if isinstance(track_id, Exception):
                    raise track_id

                run = 0

            except TheTrackIsNotOnYoutube:
                print("Трека нет на YouTube")

                run = 0
                continue

            except Exception as e:
                if debug:
                    print(f"Баги гугла (или мои ☠) {e}")
                print(f"Трек не загружен! Осталось {run - 1} попыток")
                run -= 1
                continue

def get_playlist_info(playlist_url):
    import yt_dlp
    ydl_opts = {
        "quiet": True,
        "extract_flat": True,
        "skip_download": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)

    return info
def get_track_youtube_urls(playlist_info):
    return [
        f"https://www.youtube.com/watch?v={entry['id']}"
        for entry in playlist_info.get("entries", [])
        if entry.get("id")
    ]


def download_tracks_from_youtube(track_urls, PLAYLIST_name):
    playlists[PLAYLIST_name] = []
    atomic_write_json("../playlists.json", playlists)
    for i in range(len(track_urls)):
        run = True
        while run:
            try:
                url = track_urls[i]
                print(f"🎵 Скачиваю: {url} ({i + 1}/{len(track_urls)})")

                track_id = download_track_from_youtube(url, PLAYLIST_name)
                if isinstance(track_id, Exception):
                    raise track_id

                run = False

            except subprocess.CalledProcessError as e:
                print("Трека нет на YouTube")
                print(e.stdout)
                print(e.stderr)

                run = False

            except yt_dlp.utils.DownloadError as e:
                run = False

            except Exception as e:
                if debug:
                    print(f"Баги гугла (или мои ☠) {e}")
                continue
def Spotify_main(PLAYLIST_URL, PLAYLIST_name):
    if not PLAYLIST_name:
        if PLAYLIST_URL.split('/')[3] == "playlist":
            ID = PLAYLIST_URL.split('/')[4].split('?')[0]
            PLAYLIST_name = sp.playlist(ID)['name']
        elif PLAYLIST_URL.split('/')[3] == "album":
            ID = PLAYLIST_URL.split('/')[4].split('?')[0]
            PLAYLIST_name = sp.album(ID)['name']
        else:
            return

    urls = get_track_spotify_urls(PLAYLIST_URL)
    print(f"🔎 Найдено {len(urls)} треков.")
    download_tracks_from_spotify(urls, PLAYLIST_name)

    all_tracks.update()

def Youtube_main(PLAYLIST_URL, PLAYLIST_name):
    playlist_info = get_playlist_info(PLAYLIST_URL)

    if not PLAYLIST_name:
        PLAYLIST_name = playlist_info.get("title")

    urls = get_track_youtube_urls(playlist_info)
    print(f"🔎 Найдено {len(urls)} треков.")
    download_tracks_from_youtube(urls, PLAYLIST_name)

    all_tracks.update()



if __name__ == "__main__":
    args = sys.argv
    PLAYLIST_URL = args[1]
    PLAYLIST_name = args[2]
    # PLAYLIST_URL = "https://youtube.com/playlist?list=PLjl8I_uytVg8JSiMS-nCX8p3Y30jOr5MV&si=_sFvVOMfT12ywChz"
    # PLAYLIST_URL = "https://open.spotify.com/album/2mvEK1s3lpArLiUVRkqoD5?si=7X3hizoZRWOp3QHey_R8aQ"
    # PLAYLIST_name = ""

    if not PLAYLIST_URL:
        playlists[PLAYLIST_name] = []
        atomic_write_json("../playlists.json", playlists)
        exit()


    match PLAYLIST_URL.split('/')[2]:
        case "open.spotify.com":
            Spotify_main(PLAYLIST_URL, PLAYLIST_name)
            all_tracks.update()
            print("Скачивание завершено")
        case "youtube.com" | "www.youtube.com" | "youtu.be":
            Youtube_main(PLAYLIST_URL, PLAYLIST_name)
            all_tracks.update()
            print("Скачивание завершено")
        case _:
            print("Некорректная ссылка")


