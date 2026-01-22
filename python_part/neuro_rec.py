import json
import random
import embedding
import faiss
import numpy as np
import os
import sys

embeddings = None
index = None
eps = 3.4e-38 # минимум для избежания деления на ноль
music_dir = '../music'
IDs = []
with open("../tracks.json", 'r', encoding="utf-8") as file:
    tracks = json.load(file)
with open("../private_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    debug = settings["Debug"]
with open("../public_settings.json", 'r', encoding="utf-8") as file:
    settings = json.load(file)
    # ввод от пользователя
    probability_tracks_from_playlist = settings["Probability_tracks_from_playlist"]  # процент треков из плейлиста
    sensitivity = settings["Sensitivity"]  # чувствительность к расстоянию

def next(playlist, song_index, played_tracks):
    global sensitivity, probability_tracks_from_playlist, debug
    n = len(IDs)

    # текущая позиция
    current_position = embeddings[song_index].reshape(1, -1).astype('float32')

    # Найдём все точки от самых близких до самых дальних
    distances, indices = index.search(current_position, n)
    distances = distances[0]
    indices = indices[0]
    inaccuracy = 1e-3
    first = 1
    while distances[first] < 2.5:
        first += 1

    k = int(((n - 1)**(-sensitivity)) * (n - 1))  # кол-во треков, вероятность которых не равна 0 (eps)

    def find_sensitivity():
        def ratio(sens):
            s_total = sum(sens**(-distances[first:]))
            s_k = sum(sens**(-distances[first:k+1]))
            return s_k / s_total

        L, R = 1 + eps, 1e38  # границы поиска
        for _ in range(500):
            mid = (L + R) / 2
            s = ratio(mid)
            if s < 1 - inaccuracy:
                L = mid
            else:
                R = mid
        return (L + R) / 2

    sensitivity = find_sensitivity()  # считаем чувствительность к расстоянию бинарным поиском (бисекцией)

    weights = 1 / (sensitivity**distances)  # рассчитываем веса
    weights = np.clip(weights, eps, weights.max())  # заменяем 0 на eps
    for i in range(first):
        weights[i] = 0  # убираем из весов изначальный трек

    mask_playlist = np.array([(IDs[i] in playlist and not (IDs[i] in played_tracks)) for i in indices[1:k + 1]])
    sum_playlist = np.array(weights[1:k + 1])[mask_playlist].sum()
    sum_all = np.array(weights[1:k + 1]).sum()

    # ограничение значений
    probability_tracks_from_playlist = np.clip(probability_tracks_from_playlist, eps, 1)
    sum_all = np.clip(sum_all, eps, sum_all)
    sum_playlist = np.clip(sum_playlist, eps, sum_all)

    boost_for_playlist = ((probability_tracks_from_playlist - eps) / (1 - probability_tracks_from_playlist + eps) *
        np.clip((sum_all - sum_playlist) / sum_playlist, 1,
        (3.4*1e38 * (1 - probability_tracks_from_playlist + eps))/(n * np.array(weights).max() * (probability_tracks_from_playlist - eps))))

    for i in range(1, n):
        if IDs[indices[i]] in playlist:
            weights[i] *= boost_for_playlist
        if IDs[indices[i]] in played_tracks:
            weights[i] = 0
    if debug:
        print(f"boost_for_playlist: {boost_for_playlist}, sum_playlist: {sum_playlist}, sum_all: {sum_all}")
        print("Вероятности быть следующим:")
        print(*[f"{i[1]}: {float(round(i[0] / np.array(weights).sum() * 100, 2))}%, {float(round(i[2], 2))}" for i in sorted([(weights[j], tracks[IDs[indices[j]]]["name"], distances[j]) for j in range(n)], reverse=True)[:10]])
        print(f"Топ {k} треков выпадут с шансом: {sum(sorted(weights, reverse=True)[:k]) / (np.array(weights).sum()) * 100}%")
    nextTrack = random.choices(indices, weights=weights, k=1)[0]
    nextTrack = IDs[nextTrack]
    print(f"Следующий трек: {tracks[nextTrack]["name"]}")
    return nextTrack




if __name__ == "__main__":
    args = sys.argv
    playlist_name = args[1]
    played_tracks = json.loads(args[2])
    song_id = args[3]
    # playlist_name = 'Hollow Knight: Silksong (Original Soundtrack)'
    # played_tracks = []
    # song_id = '61a5e9d8-4a6a-4de2-8f3f-9396b073715b'

    with open("../playlists.json", 'r', encoding="utf-8") as file:
        playlist = json.load(file)[playlist_name]

    IDs, embeddings = embedding.loading_embedding()
    embeddings.astype('float32')
    song_index = IDs.index(song_id)

    # Строим индекс (L2 = евклидово расстояние)
    index = faiss.IndexFlatL2(embeddings.shape[1])
    # Добавляем все векторы в индекс
    index.add(embeddings)
    print(next(playlist, song_index, played_tracks))
