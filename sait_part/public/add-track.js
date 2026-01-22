async function handleAddTrack() {
    const input_url = document.getElementById("new-track-url");
    const url = input_url.value.trim(); // trim — убирает лишние пробелы
    input_url.value = ""; // очищаем поле ввода после добавления
    const currentPlaylistName = document.querySelector(".now_playlist .playlistName").textContent.trim(); // Получаем текущее имя плейлиста

    if (!url) {
        return;
    }

    
    let password = await input_password();
    if (password === undefined) {
        return;
    }

    console.log("Добавляем трек:", url, "в плейлист:", currentPlaylistName);
    // здесь можешь отправить его на сервер, добавить в DOM и т.д.
    fetch('/add_track', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, playlist_name: currentPlaylistName, password, action: request_access_ACTIONS.ADD_TRACK }) // используем текущее имя плейлиста
    })
    .then(async res => {
        if (!res.ok) {
            const msg = await res.text();
            if (msg === "Неверный пароль") {
                my_alert("Неверный пароль");
                throw new Error("Неверный пароль");
            }
            throw new Error(msg);
        }

        return res.json();
    })
    .then(data => {
        console.log("Треки и плейлист обновлены:", data);
        if (now_playlist === currentPlaylistName) {
            playlist_tracks = data.playlist_tracks; // Обновляем список треков текущего
            loadTracksFromPlaylist(currentPlaylistName);
        }
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        my_alert(`При добавлении трека произошла ошибка :(`);
        console.error("Ошибка добавления трека:", err);
    });
}