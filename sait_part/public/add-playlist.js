async function handleAddPlaylist() {
    const input_url = document.getElementById("new-playlist-url");
    const url = input_url.value.trim(); // trim — убирает лишние пробелы
    input_url.value = ""; // очищаем поле ввода после добавления
    const input_name = document.getElementById("new-playlist-name");
    const name = input_name.value.trim(); // trim — убирает лишние пробелы
    input_name.value = ""; // очищаем поле ввода после добавления

    if (!url && !name) {
        return;
    }

    
    let password = await input_password();
    if (password === undefined) {
        return;
    }

    console.log("Добавляем плейлист:", name, url);
    // здесь можешь отправить его на сервер, добавить в DOM и т.д.
    fetch("/add_playlist", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, name, password, action: request_access_ACTIONS.ADD_PLAYLIST }) 
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
        if (now_playlist === name) {
            playlist_tracks = data.playlist_tracks;
            loadTracksFromPlaylist(name); // Обновляем список треков текущего плейлиста
        }
        playlists = data.playlists;
        loadPlaylists(); // Обновляем список плейлистов
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        my_alert(`Ошибка при добавлении плейлиста :(`);
        console.error("Ошибка добавления плейлиста:", err);
    });
}