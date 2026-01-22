
import subprocess
import json

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    debug = settings["Debug"]

# Путь к python в нужном окружении
python_path = r"..\openl3-env\Scripts\python.exe"
script_path = r"..\python_part\embedding.py"
def make_embedding_for_track(track_id):
    # Формируем команду
    cmd = [python_path, script_path] + ["make_embedding_for_track", track_id]

    # Запуск скрипта в нужном окружении
    try:
        result = subprocess.run(cmd, check=True)
        print("Скрипт выполнен успешно")
    except subprocess.CalledProcessError as e:
        if debug:
            print(f"Ошибка при запуске скрипта: {e}")
        else:
            print(f"Ошибка при запуске скрипта")

def make_embedding_for_tracks(tracks):
    # Формируем команду
    cmd = [python_path, script_path] + ["make_embedding_for_track", list(map(str, tracks))]

    # Запуск скрипта в нужном окружении
    try:
        result = subprocess.run(cmd, check=True)
        print("Скрипт выполнен успешно")
    except subprocess.CalledProcessError as e:
        if debug:
            print(f"Ошибка при запуске скрипта: {e}")
        else:
            print(f"Ошибка при запуске скрипта")

def make_embedding_for_all_tracks():
    # Формируем команду
    cmd = [python_path, script_path] + ["make_embedding_for_all_tracks"]

    # Запуск скрипта в нужном окружении
    try:
        result = subprocess.run(cmd, check=True)
        print("Скрипт выполнен успешно")
    except subprocess.CalledProcessError as e:
        if debug:
            print(f"Ошибка при запуске скрипта: {e}")
        else:
            print(f"Ошибка при запуске скрипта")
