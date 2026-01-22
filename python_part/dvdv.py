"""Этот файл не содержит ничего важного,
но можешь удалить трек, если хочешь. НО так как tracks – список, то удалить что-то из него нельзя, только заменить"""
import json
import os


music_path = r"../music"
music_embeddings_path = r"../music_embeddings"

with open("../tracks.json", 'r', encoding="utf-8") as file:
    tracks = json.load(file)
with open("../playlists.json", 'r', encoding="utf-8") as file:
    playlists = json.load(file)

def delete_track(id):
    global tracks, playlists
    with open("../tracks.json", 'r', encoding="utf-8") as file:
        tracks = json.load(file)
    with open("../playlists.json", 'r', encoding="utf-8") as file:
        playlists = json.load(file)

    try:
        os.remove(os.path.join(music_path, f"{id}.mp3"))
    except:
        print(f"Ошибка при удалении {id}.mp3")
    try:
        os.remove(os.path.join(music_embeddings_path, f"{id}.npy"))
    except:
        print(f"Ошибка при удалении {id}.npy")
    new_playlists = {}
    for playlist in playlists:
        new_playlists[playlist] = []
        for track in playlists[playlist]:
            if track != id:
                new_playlists[playlist].append(track)

    del tracks[id]

    with open("../tracks.json", 'w', encoding="utf-8") as file:
        json.dump(tracks, file, indent=4, ensure_ascii=False)
    with open("../playlists.json", 'w', encoding="utf-8") as file:
        json.dump(new_playlists, file, indent=4, ensure_ascii=False)



# def show_distances():
#     import embedding
#     import faiss
#     embeddings = embedding.loading_embedding().astype('float32')
#
#     # Строим индекс (L2 = евклидово расстояние)
#     index = faiss.IndexFlatL2(embeddings.shape[1])
#     # Добавляем все векторы в индекс
#     index.add(embeddings)
#     songs = []
#     music_dir = '../music'
#     for i in range(len(os.listdir(music_dir))):
#         filename = os.listdir(music_dir)[i]
#         if filename.endswith(".mp3"):
#             song_name = os.path.splitext(filename)[0]
#             songs.append(int(song_name))
#
#     n = len(songs)
#
#     # координаты точек
#     points = dict()
#     for song_id in range(n):
#         # текущая позиция
#         current_position = embeddings[song_id].reshape(1, -1).astype('float32')
#
#         # Найдём все точки от самых близких до самых дальних
#         distances, _ = index.search(current_position, n)
#         for i in distances[0][1:]:
#             if not i in points:
#                 points[i] = 0
#             points[i] += 1
#
#
#     import matplotlib.pyplot as plt
#
#     x = []
#     y = []
#     for i in points:
#         x.append(i)
#         y.append(0)  # points[i]
#
#     plt.scatter(x, y, s=1)
#     plt.xlabel("X")
#     plt.ylabel("Y")
#     plt.title("Точечный график")
#
#     plt.show()
#
# def show_embeddings_in_2D():
#     import embedding
#     embeddings = embedding.loading_embedding().astype('float32')
#
#     import umap
#     import plotly.express as px
#
#     # данные
#     names = [tracks[i]["name"] for i in range(len(embeddings))]
#     labels = ["" for i in range(len(embeddings))]
#     for i in playlists:
#         for j in playlists[i]:
#             labels[j] = i
#
#     # UMAP
#     emb_2d = umap.UMAP(
#         n_components=2,
#         metric="cosine",
#         random_state=42
#     ).fit_transform(embeddings)
#
#     # интерактивный график
#     fig = px.scatter(
#         x=emb_2d[:, 0],
#         y=emb_2d[:, 1],
#         color=labels,
#         hover_name=names
#     )
#     fig.update_traces(marker=dict(size=4))
#     fig.update_layout(
#         hoverlabel=dict(font_size=16),
#         title="UMAP embeddings"
#     )
#
#     fig.show()

num_to_id = dict()
def tracks_to_Object():
    import uuid, make_tracks
    for fname in os.listdir("../music"):
        if fname.endswith(".mp3"):
            name = os.path.splitext(fname)[0]
            num_to_id[name] = uuid.uuid4()

            old_name = os.path.join("../music", f"{name}.mp3")
            new_file = f"{num_to_id[name]}.mp3"
            new_name = os.path.join("../music", new_file)
            os.rename(old_name, new_name)

            old_name = os.path.join("../music_embeddings", f"{name}.npy")
            new_file = f"{num_to_id[name]}.npy"
            new_name = os.path.join("../music_embeddings", new_file)
            os.rename(old_name, new_name)
    new_playlists = {}
    for playlist in playlists:
        new_playlists[playlist] = []
        for i in playlists[playlist]:
            new_playlists[playlist].append(num_to_id[i])
    make_tracks.make_all_tracks()
    with open("../playlists.json", 'w', encoding="utf-8") as file:
        json.dump(new_playlists, file, indent=4, ensure_ascii=False)