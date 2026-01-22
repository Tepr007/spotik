
const playlistListForAddTrackToPlaylistPanel = document.getElementById("add-track-to-playlist-content");


function close_add_track_to_playlist_panel() {
    document.querySelector("#add-track-to-playlist-panel").style.right = "-768px"; // Скрываем панель воспроизведения
    playlistListForAddTrackToPlaylistPanel.innerHTML = ''; // Очищаем список плейлистов
}

function createPlaylistItemForAddTrackToPlaylistPanel(playlist_name, track_id) {
    const div = document.createElement("div");

    const BG = document.createElement("div");
    BG.className = "playlistBG";
    
    function createSVGAddTrackToPlaylistMarker() {
        const svgNS = "http://www.w3.org/2000/svg";
        const size = 24; 
        const color = "white";

        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", "0 0 24 24");

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", "3");
        rect.setAttribute("y", "3");
        rect.setAttribute("width", "18");
        rect.setAttribute("height", "18");
        rect.setAttribute("rx", "2");
        rect.setAttribute("stroke", color);
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("fill", "none");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M12 8V16M8 12H16");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");

        svg.appendChild(rect);
        svg.appendChild(path);
        return svg;
    }

    const playlistMarker = createSVGAddTrackToPlaylistMarker();
    playlistMarker.setAttribute("class", "marker");

    const playlistName = document.createElement("div");
    playlistName.className = "playlistName";
    playlistName.textContent = playlist_name;

    div.appendChild(BG);
    div.appendChild(playlistMarker);
    div.appendChild(playlistName);

    div.addEventListener("click", async () => {
        addTrackToPlaylist(track_id, playlist_name);
    });
    return div;
}

function createPlaylistItemsForAddTrackToPlaylistPanel(playlists, track_id) {
    Object.keys(playlists).forEach(name => {
        if (playlists[name].includes(track_id)) return; // Пропускаем плейлист, если трек уже в нем есть
        const div = createPlaylistItemForAddTrackToPlaylistPanel(name, track_id);
        playlistListForAddTrackToPlaylistPanel.appendChild(div);
    });
}

async function addTrackToPlaylist(track_id, playlist_name) {
    let password = await input_password();
    if (password === undefined) {
        return;
    }
    showLoading();
    close_add_track_to_playlist_panel();
    fetch("/add_track_to_playlist", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            track_id: track_id,
            playlist_name: playlist_name,
            password: password,
            action: request_access_ACTIONS.ADD_TRACK_TO_PLAYLIST
        })
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
        my_alert(`Трек успешно добавлен в плейлист ${playlist_name}`);
        console.log("Трек успешно добавлен в плейлист:", data);
        if (playlist_name === now_playlist) {
            loadTracksFromPlaylist(playlist_name);
        }
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        my_alert(`При добавлении трека в плейлист ${playlist_name} произошла ошибка :(`);
        console.error("Ошибка добавления трека в плейлист:", err);
    });
}