// public/playlist-list.js
// Функции для управления списком плейлистов


function createPlaylistItem(playlist_name) {
    const li = document.createElement("li");

    const BG = document.createElement("div");
    BG.className = "playlistBG";

    const playlistMarker = document.createElement("div");
    playlistMarker.className = "marker";
    playlistMarker.textContent = "▷";

    const playlistName = document.createElement("div");
    playlistName.className = "playlistName";
    playlistName.textContent = playlist_name;

    function createSVGDeleteButton() {

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("data-encore-id", "icon");
        svg.setAttribute("role", "img");
        svg.setAttribute("class", "deleteButtonImg");
        svg.setAttribute("viewBox", "0 0 16 16");

        const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8");

        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M4.5 8a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 4.5 8z");
        
        svg.appendChild(path1);
        svg.appendChild(path2);
        
        return svg;
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.title = "Удалить плейлист";
    deleteButton.onclick = () =>  deletePlaylist(playlistName.textContent);
    deleteButton.appendChild(createSVGDeleteButton());

    async function click () {
        if (li.classList.contains("now_playlist")) {
            close_playlist_list(li);
            return;
        }
        loadTracksFromPlaylist(playlist_name);
        const nowPlaylist = document.querySelector("#playlist-list li.now_playlist");
        if (nowPlaylist) {
            nowPlaylist.querySelector(".marker").textContent = "▷";
            nowPlaylist.classList.remove("now_playlist");
        }
        li.classList.add("now_playlist");
        li.querySelector(".marker").textContent = "▶";
        now_playlist = playlist_name;
        await resetNextTrack(); // Сбрасываем следующий трек при смене плейлиста
        document.getElementById("add-track").style.display = "flex"; // Показываем форму добавления трека
    }

    BG.onclick = click;
    playlistName.onclick = click;
    playlistMarker.onclick = click;

    li.appendChild(BG);
    li.appendChild(playlistMarker);
    li.appendChild(playlistName);
    if (playlistName.textContent !== "Все треки") {
        li.appendChild(deleteButton);
    }

    li.addEventListener("mouseenter", () => {
        if (now_playlist === playlist_name) {
            return;
        }
        li.querySelector(".marker").textContent = "▶";
    });

    li.addEventListener("mouseleave", () => {
        if (now_playlist === playlist_name) {
            return;
        }
        li.querySelector(".marker").textContent = "▷";
    });
    return li;
}

function createPlaylistItems(playlists) {
    playlistList.innerHTML = ''; // Очищаем старые плейлисты
    Object.keys(playlists).forEach(name => {
            const li = createPlaylistItem(name);
            playlistList.appendChild(li);
        });
}

async function loadPlaylists() {
    do {
        try {
            fetch('/playlists')
                .then(res => res.json())
                .then(playlists => createPlaylistItems(playlists));
                //.catch(err => console.error('Ошибка при получении плейлистов:', err));
            break;
        }
        catch (error) {
            console.error("Ошибка при загрузке плейлистов:", error);
            await sleep(1000); // Ждем 1 секунду перед повторной попыткой
        }
    } while (true)
}

async function close_playlist_list(li) {
    li.querySelector(".marker").textContent = "▷";
    li.classList.remove("now_playlist");
    trackList.innerHTML = ''; // Очищаем старые треки
    document.getElementById("add-track").style.display = "none"; // Скрываем форму добавления трека
}

async function deletePlaylist(playlist_name) {
    if (!await fetch(`/passwords_is_enabled`)
    .then(res => res.json())
    .then(passwords_is_enabled => {
        return passwords_is_enabled;
    })) {
        if (!await my_confirm("Вы уверены, что хотите удалить плейлист?", "Да", "Нет")) {
            return;
        }
    }
    
    let password = await input_password();
    if (password === undefined) {
        return;
    }
    showLoading();

    fetch(`/delete_playlist?playlist_name=${playlist_name}&password=${password}&action=${request_access_ACTIONS.DELETE_PLAYLIST}`, {
        method: "DELETE"
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
    .then(async data => {
        if (data.message !== "Плейлист успешно удален") {
            throw new Error("Ошибка при удалении плейлиста");
        }
        const li = Array.from(document.querySelectorAll("#playlist-list li")).find(li => {
            const child = li.querySelector(".playlistName");
            return child && child.textContent.trim() === playlist_name;
        });
        if (now_playlist === playlist_name) {
            await close_playlist_list(li);
            now_playlist = null;
        }
        li.remove();
        loadPlaylists(); // Обновляем список плейлистов
        console.log(`Плейлист ${playlist_name} успешно удален`);
        my_alert(`Плейлист ${playlist_name} успешно удален`);
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        console.error("Ошибка при удалении плейлиста: " + err);
        my_alert(`При удалении плейлиста ${playlist_name} произошла ошибка :(`);
    });
}