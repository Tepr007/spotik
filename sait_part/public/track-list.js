// public/track-list.js
// Функции для управления списком треков

function createTrackItem(track, playlistName) {
    const li = document.createElement("li");
    let track_id_in_playlist = playlist_tracks.findIndex(_track => _track.id === track.id);
    li.id = track_id_in_playlist;

    const BG = document.createElement("div");
    BG.className = "trackBG";

    const trackNumber = document.createElement("div");
    trackNumber.className = "number";
    const trackNum = track_id_in_playlist + 1;
    trackNumber.textContent = trackNum;

    const content = document.createElement("div");
    content.className = "trackContent";

    const trackName = document.createElement("div");
    trackName.className = "trackName";
    const name = track.name;
    trackName.textContent = name;

    const trackAuthor = document.createElement("div");
    trackAuthor.className = "trackAuthor";
    const author = track.author;
    trackAuthor.textContent = author;

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

    function createSVGAddButton() {

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("data-encore-id", "icon");
        svg.setAttribute("role", "img");
        svg.setAttribute("class", "addButtonImg");
        svg.setAttribute("viewBox", "0 0 16 16");

        const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8");

        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75");

        svg.appendChild(path1);
        svg.appendChild(path2);
        
        return svg;
    }

    function createSVGDownloadButton() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("data-encore-id", "icon");
        svg.setAttribute("role", "img");
        svg.setAttribute("class", "downloadButtonImg");
        svg.setAttribute("viewBox", "0 0 16 16");

        // Круг, как в оригинале
        const circlePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        circlePath.setAttribute("d", "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8");

        // Стрелка вниз для загрузки
        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrowPath.setAttribute("d", "M8 4a.75.75 0 0 1 .75.75v5l1.625-1.625a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06L7.25 9.75V4.75A.75.75 0 0 1 8 4z"); 

        svg.appendChild(circlePath);
        svg.appendChild(arrowPath);

        return svg;
    }


    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.title = "Удалить трек из плейлиста";
    deleteButton.onclick = () =>  deleteTrackFromPlaylist(track.id, playlistName);
    deleteButton.appendChild(createSVGDeleteButton());
    
    const addButton = document.createElement("button");
    addButton.className = "add-button";
    addButton.title = "Добавить трек в плейлист";
    addButton.onclick = () => openAddTrackToPlaylistPanel(track.id);
    addButton.appendChild(createSVGAddButton());
    
    const downloadButton = document.createElement("button");
    downloadButton.className = "download-button";
    downloadButton.title = "Скачать трек";
    downloadButton.onclick = () =>  downloadTrack(track.id);
    downloadButton.appendChild(createSVGDownloadButton());


    content.appendChild(trackName);
    content.appendChild(trackAuthor);

    async function click() {
        if (li.className === "now_track") {
            audio.paused ? audio.play() : audio.pause();
            return;
        }
        await loadSelectedTrack(track.id);
        document.querySelector(".now-playing-bar").style.bottom = "0px"; // Показываем панель воспроизведения
    }

    content.onclick = click;
    trackNumber.onclick = click;
    BG.onclick = click;

    li.appendChild(BG);
    li.appendChild(trackNumber);
    li.appendChild(content);
    li.appendChild(downloadButton);
    if (playlistName !== "Все треки") {
        li.appendChild(deleteButton);
    }
    li.appendChild(addButton);

    li.addEventListener("mouseenter", () => {
        li.querySelector(".number").textContent = "▶";
    });

    li.addEventListener("mouseleave", () => {
        li.querySelector(".number").textContent = track_id_in_playlist + 1;
    });
    return li;
}

function createTrackItems(playlist, playlistName) {
    playlist_tracks = playlist;

    trackList.innerHTML = ''; // Очищаем старые треки

    playlist_tracks.forEach((track) => {
        const li = createTrackItem(track, playlistName);
        trackList.appendChild(li);
    });
}

async function loadTracksFromPlaylist(playlistName) {
    do {
        try {
            await fetch(`/tracks?playlist=${encodeURIComponent(playlistName)}`)
                .then(res => res.json())
                .then(data => createTrackItems(data, playlistName))
            break;
        }
        catch (error) {
            console.error("Ошибка при загрузке треков из плейлиста:", error);
            await sleep(1000); // Ждем 1 секунду перед повторной попыткой
        }
    } while (true)
}



async function deleteTrackFromPlaylist(track_id, playlist_name) {
    if (!await fetch(`/passwords_is_enabled`)
    .then(res => res.json())
    .then(passwords_is_enabled => {
        return passwords_is_enabled;
    })) {
        if (!await my_confirm("Вы уверены, что хотите удалить трек из плейлиста?", "Да", "Нет")) {
            return;
        }
    }

    let password = await input_password();
    if (password === undefined) {
        return;
    }
    showLoading();

    const track = await get_track(track_id);
    fetch(`/delete_track_from_playlist?track_id=${track_id}&playlist_name=${playlist_name}&password=${password}&action=${request_access_ACTIONS.DELETE_TRACK}`, {
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
    .then(data => {
        if (!data.playlist_tracks) {
            throw new Error("Ошибка при удалении трека из плейлиста");
        }
        my_alert(`Трек ${track.name} успешно удален из плейлиста ${playlist_name}`);
        if (now_playlist === playlist_name) {
            createTrackItems(data.playlist_tracks, playlist_name);
        }
        console.log(`Трек ${track.name} успешно удален из плейлиста ${playlist_name}`);
        
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        console.error("Ошибка при удалении трека из плейлиста:", err);
        my_alert(`При удалении трека ${track.name} из плейлиста ${playlist_name} произошла ошибка :(`);
    });
}

async function openAddTrackToPlaylistPanel(track_id) {
    fetch(`/playlists`)
        .then(res => res.json())
        .then(playlists => {
            playlistListForAddTrackToPlaylistPanel.innerHTML = ''; // Очищаем список плейлистов
            createPlaylistItemsForAddTrackToPlaylistPanel(playlists, track_id);
            document.querySelector("#add-track-to-playlist-panel").style.right = "0px"; // Показываем панель воспроизведения
        });
}

// не используется
async function downloadTrack(track_id) {
    const track = await get_track(track_id);
    if (!track) {
        my_alert("Трек не найден");
        return;
    }
    const link = document.createElement("a");
    link.href = track.file;
    link.download = `${track.name} - ${track.author}.mp3` // `${track.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}