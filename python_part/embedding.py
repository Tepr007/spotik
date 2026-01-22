"""Запускать этот скрипт можно только в окружении openl3-env
Весь проект работает на python 3.12, а для OpenL3 нужен python 3.11, поэтому для него отдельное окружение
При желании можешь заменить OpenL3 на другие модели, закомментировав блоки кода с OpenL3 и раскомментировав блоки для другой модели
НО для другой модели надо будет заново пересоздавать все эмбеддинги"""


import os
import librosa
import numpy as np
import json
import sys

# Пути к папкам
input_dir = "../music"
output_dir = "../music_embeddings"
os.makedirs(output_dir, exist_ok=True)

with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    debug = settings["Debug"]

def loading_embedding():
    # Папка с эмбеддингами
    embeddings = []
    fnames = []
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        tracks = json.load(file)
    # Загрузка всех эмбеддингов
    for fname in os.listdir(output_dir):
        if fname.endswith(".npy") and fname[:-4] in tracks:
            path = os.path.join(output_dir, fname)
            path = os.path.abspath(path)
            # if os.name == 'nt':
            #     path = '\\\\?\\' + path.replace('/', '\\')
            fnames.append(fname[:-4])
            embeddings.append(np.load(path))
    embeddings = np.stack(embeddings)
    return fnames, embeddings

# Функция для обработки одного файла
def extract_embedding(mp3_path): #, model, device
    """OpenL3"""
    import openl3
    waveform, sr = librosa.load(mp3_path, sr=16000, mono=True)

    # генерируем эмбеддинг
    emb, ts = openl3.get_audio_embedding(
        waveform,
        sr,
        embedding_size=512,  # 512 или 6144
        content_type="music",  # "music" или "env"
        input_repr="mel128",    # спектрограмма
        hop_size=1  # по умолчанию 0.1 сек
    )

    # усредняем по времени
    emb_mean = np.mean(emb, axis=0)
    return emb_mean

    """CLAP"""
    # import torch
    # waveform, sr = librosa.load(mp3_path, sr=48000, mono=True)
    # waveform = torch.tensor(waveform, dtype=torch.float32).unsqueeze(0).to(device)
    #
    # with torch.no_grad():
    #     emb = model.get_audio_embedding_from_data(waveform, use_tensor=True)
    #
    # return emb.squeeze().cpu().numpy()

    """YAMnet"""
    # import tensorflow as tf
    # import tensorflow_hub as hub
    # # Загружаем модель YAMNet
    # yamnet_model = hub.load(r"C:\Users\ИМЯ\.cache\kagglehub\models\google\yamnet\tensorFlow2\yamnet\1") #hub.load('https://www.kaggle.com/models/google/yamnet/TensorFlow2/yamnet/1')
    #
    # # Загрузка аудио и ресемплинг до 16 kHz моно
    # waveform, sr = librosa.load(mp3_path, sr=16000, mono=True)
    # waveform = waveform.astype(np.float32)
    #
    # # Получение эмбеддингов
    # _, embeddings, _ = yamnet_model(waveform)
    # embedding = tf.reduce_mean(embeddings, axis=0).numpy()  # (1024,)
    # return embedding

def make_embedding_for_track(track):
    # import laion_clap
    # # Загружаем и настраиваем модель CLAP
    # model = laion_clap.CLAP_Module(enable_fusion=False)
    # model.load_ckpt()

    filename = f"{track}.mp3"
    if filename.endswith(".mp3"):
        song_name = os.path.splitext(filename)[0]
        mp3_path = os.path.join(input_dir, filename)
        try:
            emb = extract_embedding(mp3_path)
            save_path = os.path.join(output_dir, f"{song_name}.npy")
            np.save(save_path, emb)
            print(f"[✓] Обработано: {filename}")
        except Exception as e:
            if debug:
                print(f"[!] Ошибка при обработке {filename}: {e}")
            else:
                print(f"[!] Ошибка при обработке {filename}")
def make_embedding_for_tracks(tracks):
    # import laion_clap
    # # Загружаем и настраиваем модель CLAP
    # model = laion_clap.CLAP_Module(enable_fusion=False)
    # model.load_ckpt()

    # Обработка всех файлов
    for i in range(len(tracks)):
        filename = f"{tracks[i]}.mp3"
        if filename.endswith(".mp3"):
            song_name = os.path.splitext(filename)[0]
            mp3_path = os.path.join(input_dir, filename)
            try:
                emb = extract_embedding(mp3_path)
                save_path = os.path.join(output_dir, f"{song_name}.npy")
                np.save(save_path, emb)
                print(f"[✓] Обработано ({i + 1}/{len(tracks)}) : {filename}")
            except Exception as e:
                if debug:
                    print(f"[!] Ошибка при обработке {filename}: {e}")
                else:
                    print(f"[!] Ошибка при обработке {filename}")


def make_embedding_for_all_tracks():
    # import laion_clap
    # # Загружаем и настраиваем модель CLAP
    # model = laion_clap.CLAP_Module(enable_fusion=False)
    # model.load_ckpt()

    # Обработка всех файлов
    for i in range(len(os.listdir(input_dir))):
        filename = os.listdir(input_dir)[i]
        if filename.endswith(".mp3"):
            song_name = os.path.splitext(filename)[0]
            mp3_path = os.path.join(input_dir, filename)
            try:
                emb = extract_embedding(mp3_path)
                save_path = os.path.join(output_dir, f"{song_name}.npy")
                np.save(save_path, emb)
                print(f"[✓] Обработано ({i + 1}/{len(os.listdir(input_dir))}) : {filename}")
            except Exception as e:
                if debug:
                    print(f"[!] Ошибка при обработке {filename}: {e}")
                else:
                    print(f"[!] Ошибка при обработке {filename}")


if __name__ == "__main__":
    args = sys.argv
    func = args[1]
    match func:
        case "make_embedding_for_all_tracks":
            make_embedding_for_all_tracks()
        case "make_embedding_for_tracks":
            tracks = args[2]
            make_embedding_for_tracks(tracks)
        case "make_embedding_for_track":
            track = args[2]
            make_embedding_for_track(track)
