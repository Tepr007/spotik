import os
import json
import base64
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB
from typing import Optional, Dict
import io
from PIL import Image
from atomic_write_json import atomic_write_json

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    debug = settings["Debug"]


def compress_cover_base64(cover_base64: str, max_size: int = 500, quality: int = 75) -> str:
    """
    Сжимает и обрезает обложку до квадрата, возвращает base64 строку.
    max_size — максимальная ширина/высота после сжатия.
    quality — качество JPEG (0-100).
    """

    # 1. Убираем префикс data:image/...
    if "," in cover_base64:
        header, encoded = cover_base64.split(",", 1)
        mime = header.split(";")[0].replace("data:", "")
    else:
        encoded = cover_base64
        mime = "image/jpeg"  # по умолчанию
    img_format = "JPEG" if "jpeg" in mime else "PNG"

    # 2. Декодируем изображение
    img_bytes = base64.b64decode(encoded)
    img = Image.open(io.BytesIO(img_bytes))

    # # 3. Если стороны разные, обрезаем до квадрата по центру
    # width, height = img.size
    # if width != height:
    #     min_side = min(width, height)
    #     left = (width - min_side) // 2
    #     top = (height - min_side) // 2
    #     img = img.crop((left, top, left + min_side, top + min_side))

    # 4. Сжимаем пропорционально
    img.thumbnail((max_size, max_size))

    # 5. Сохраняем в память с нужным качеством
    buffer = io.BytesIO()
    if img_format == "JPEG":
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
    else:
        img.save(buffer, format=img_format, optimize=True)
    buffer.seek(0)

    # 6. Конвертируем обратно в base64
    new_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    return f"data:{mime};base64,{new_base64}"
def extract_mp3_metadata(fname: str) -> Dict[str, Optional[str]]:
    file_path = os.path.join("../music", fname)
    name = os.path.splitext(fname)[0]
    try:
        tags = ID3(file_path)

        # Название трека
        title_tag = tags.get("TIT2")
        title = title_tag.text[0] if title_tag else None

        # Автор
        artist_tag = tags.get("TPE1")
        artist = artist_tag.text[0] if artist_tag else None

        # Альбом
        album_tag = tags.get("TALB")
        album = album_tag.text[0] if album_tag else None

        # Обложка
        cover_data = None
        for tag in tags.values():
            if isinstance(tag, APIC):
                mime = tag.mime  # например: "image/jpeg" или "image/png"
                cover_data = f"data:{mime};base64," + base64.b64encode(tag.data).decode("utf-8")
                cover_data = compress_cover_base64(cover_data)
                break

        return {
            "id": name,
            "file": f"/music/{fname}",
            "name": title,
            "author": artist.replace('/', ', '),
            "album": album,
            "cover": cover_data
        }

    except Exception as e:
        if debug:
            print(f"Ошибка чтения тегов: {e}")
        else:
            print(f"Ошибка чтения тегов")
        return {
            "id": None,
            "file": None,
            "name": None,
            "author": None,
            "album": None,
            "cover": None
        }

def add_track(track_id):
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        tracks = json.load(file)
    fname = f"{track_id}.mp3"
    tracks[track_id] = extract_mp3_metadata(fname)

    atomic_write_json("../tracks.json", tracks)

def make_all_tracks():
    tracks = dict()
    for fname in os.listdir("../music"):
        if fname.endswith(".mp3"):
            name = os.path.splitext(fname)[0]
            tracks[name] = extract_mp3_metadata(fname)

    atomic_write_json("../tracks.json", tracks)