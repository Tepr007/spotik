import subprocess
import sys
import json

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    debug = settings["Debug"]

PARSERS = [
    "spotdl",
    "yt-dlp",
]

def update_parsers():
    cmd = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--upgrade",
        *PARSERS
    ]
    if not debug:
        cmd.append("--quiet")

    print("Updating parsers:", ", ".join(PARSERS))
    subprocess.run(cmd, check=debug)

if __name__ == "__main__":
    try:
        print("Обновляем парсеры...")
        update_parsers()
        print("Парсеры успешно обновлены")
    except Exception as e:
        if debug:
            print(f"Ошибка при обновлении парсеров: {e}")
        else:
            print("Ошибка при обновлении парсеров")