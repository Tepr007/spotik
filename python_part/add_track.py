import os
import locale
print("DEFAULT ENCODING:", locale.getpreferredencoding())
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')
import json
import subprocess
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import yt_dlp
import uuid
import run_in_openl3_env
import make_tracks
import search_track
import all_tracks
from atomic_write_json import atomic_write_json

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    SPOTIFY_CLIENT_ID = settings["SPOTIFY_CLIENT_ID"]
    SPOTIFY_CLIENT_SECRET = settings["SPOTIFY_CLIENT_SECRET"]
    debug = settings["Debug"]

output_dir = "../music"
FFMPEG_PATH = "../.ffmpeg/bin/ffmpeg.exe"
FFMPEG_PARENT_PATH = "../.ffmpeg/bin"

os.makedirs(output_dir, exist_ok=True)


with open("../playlists.json", 'r', encoding="utf-8") as file:
    playlists = json.load(file)


# Настройка авторизации
auth_manager = SpotifyClientCredentials(client_id=SPOTIFY_CLIENT_ID,
                                        client_secret=SPOTIFY_CLIENT_SECRET)
sp = spotipy.Spotify(auth_manager=auth_manager)

class TrackAlreadyDownloaded(Exception):
    pass
class TrackAlreadyInTracks(Exception):
    pass
class TheTrackIsNotOnYoutube(Exception):
    pass

def download_track_from_spotify(url, PLAYLIST_name):
    spotdl_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.venv', 'Scripts', 'spotdl.exe'))
    before = set(os.listdir(output_dir))

    track_info = sp.track(url)
    track_name = track_info['name']
    track_artists = ", ".join([artist['name'] for artist in track_info['artists']])
    track_id = search_track.search(track_name, track_artists)

    if track_id == -1 and not f"{track_id}.mp3" in os.listdir(output_dir):
        track_id = str(uuid.uuid4())

        try:
            output = subprocess.run([spotdl_path, url, "--output", output_dir, "--ffmpeg", str(FFMPEG_PATH)],
                                    #capture_output=True,
                                    text=True,
                                    encoding="utf-8",
                                    errors="replace")#
            if "LookupError: No results found" in output.stdout:
                return TheTrackIsNotOnYoutube()

            # ждём, чтобы точно успело сохраниться
            time.sleep(1)

            after = set(os.listdir(output_dir))
            new_file = list(after - before)[0]

            old_name = os.path.join(output_dir, new_file)
            new_file = f"{track_id}.mp3"
            new_name = os.path.join(output_dir, new_file)
            os.rename(old_name, new_name)
        except subprocess.CalledProcessError as e:
            if debug:
                print("=== STDOUT ===")
                print(e.stdout)
                print("=== STDERR ===")
                print(e.stderr)  # ← главное
            delete_unfinished_tracks()
            return e
        except Exception as e:
            if debug:
                print(f"Баги гугла (или мои ☠) {e}")
            delete_unfinished_tracks()
            return e

    # регистрация трека
    run_in_openl3_env.make_embedding_for_track(track_id)
    try:
        make_tracks.add_track(track_id)
    except Exception as e:
        print(e)

    if not PLAYLIST_name in playlists:
        playlists[PLAYLIST_name] = []
    if not track_id in playlists[PLAYLIST_name]:
        playlists[PLAYLIST_name].append(track_id)

    atomic_write_json("../playlists.json", playlists)

    return track_id



def get_youtube_metadata(url):
    ydl_opts = {
        "cookiesfrombrowser": ("firefox",),
        "quiet": True,
        "skip_download": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            return e

        title = info.get("title", "Без названия")
        uploader = info.get("uploader", "Без автора")

        return {
            "title": title,
            "uploader": uploader
        }
def download_track_from_youtube(url, PLAYLIST_name):
    track_info = get_youtube_metadata(url)
    if isinstance(track_info, yt_dlp.utils.DownloadError):
        msg = str(track_info)
        if "Video unavailable" in msg:
            print("Видео недоступно")
        elif "Private video" in msg:
            print("Приватное видео")
        else:
            print("Другая ошибка yt-dlp:", msg)
        return track_info
    track_title = track_info['title']
    track_uploader = track_info['uploader']
    track_id = search_track.search(track_title, track_uploader)

    if track_id == -1:
        track_id = str(uuid.uuid4())
        output_path = os.path.join(output_dir, f"{track_id}.%(ext)s")

        ydl_opts = {
            "cookiesfrombrowser": ("firefox",),
            'format': 'bestaudio/best',
            'outtmpl': output_path,
            'quiet': True,
            'ffmpeg_location': FFMPEG_PARENT_PATH,
            'writethumbnail': True,
            'prefer_ffmpeg': True,
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                },
                {'key': 'EmbedThumbnail'},
                {'key': 'FFmpegMetadata'},
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                print(f"Скачиваю {track_title}...")
                info = ydl.extract_info(url, download=True)
                track_info = make_tracks.extract_mp3_metadata(f"{track_id}.mp3")
                track_title = track_info['name']
                track_uploader = track_info['author']
                check_track_id = search_track.search(track_title, track_uploader)
                if check_track_id != -1 and f"{check_track_id}.mp3" in os.listdir(output_dir):
                    raise TrackAlreadyDownloaded()
                if check_track_id != -1 and not f"{check_track_id}.mp3" in os.listdir(output_dir):
                    raise TrackAlreadyInTracks()
                print(f"Скачано: {info['title']}")

            except yt_dlp.utils.DownloadError as e:
                msg = str(e)
                if "Video unavailable" in msg:
                    print("Видео недоступно")
                elif "Private video" in msg:
                    print("Приватное видео")
                else:
                    print("Другая ошибка yt-dlp:", msg)
                return e

            except TrackAlreadyDownloaded:
                print("Такой трек уже скачен")
                os.remove(os.path.join(output_dir, f"{track_id}.mp3"))
                track_id = check_track_id

            except TrackAlreadyInTracks:
                print("Такой трек уже есть в tracks.json, но не был скачен")
                src = os.path.join(output_dir, f"{track_id}.mp3")  # track_id в f-string
                dst = os.path.join(output_dir, f"{check_track_id}.mp3")  # check_track_id в f-string
                os.replace(src, dst)  # безопаснее, чем os.rename
                track_id = check_track_id


            except Exception as e:
                if debug:
                    print("Ошибка при скачивании:", e)
                else:
                    print("Ошибка при скачивании")
                # удаляем оставшиеся .webp и .webp.part
                delete_unfinished_tracks()
                return e



    # регистрация трека
    run_in_openl3_env.make_embedding_for_track(track_id)
    make_tracks.add_track(track_id)

    if not PLAYLIST_name in playlists:
        playlists[PLAYLIST_name] = []
    if not track_id in playlists[PLAYLIST_name]:
        playlists[PLAYLIST_name].append(track_id)

    atomic_write_json("../playlists.json", playlists)

    return track_id

def delete_unfinished_tracks():
    # удаляем оставшиеся .webp, .webp.part и тд
    for fname in os.listdir(output_dir):
        if not fname.endswith(".mp3"):
            path = os.path.join(output_dir, fname)
            try:
                os.remove(path)
                if debug:
                    print(f"Удалён файл: {fname}")
            except Exception as remove_err:
                if debug:
                    print(f"Не удалось удалить {fname}: {remove_err}")




if __name__ == "__main__":
    # args = sys.argv
    # TRACK_URL = args[1]
    # PLAYLIST_name = args[2]
    TRACK_URL = "https://open.spotify.com/track/6bX8I0kg3J6IXWVlyVknh1?si=edd0ab61543e455f"
    PLAYLIST_name = "Все треки"

    match TRACK_URL.split('/')[2]:
        case "open.spotify.com":
            track_id = download_track_from_spotify(TRACK_URL, PLAYLIST_name)
            if isinstance(track_id, Exception):
                print("Трек не удалось скачать")
                if debug:
                    print(str(track_id))
                exit()
            all_tracks.update()
            print("Скачивание завершено")
        case "youtube.com" | "www.youtube.com" | "youtu.be":
            track_id = download_track_from_youtube(TRACK_URL, PLAYLIST_name)
            if isinstance(track_id, Exception):
                print("Трек не удалось скачать")
                if debug:
                    print(str(track_id))
                exit()
            all_tracks.update()
            print("Скачивание завершено")
        case _:
            print("Некорректная ссылка")



