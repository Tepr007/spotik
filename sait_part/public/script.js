const audio = document.getElementById("audio-player");
const trackList = document.getElementById("track-list");
const playlistList = document.getElementById("playlist-list");
const prevBtn = document.getElementById('prev');
const playBtn = document.getElementById('play');
const nextBtn = document.getElementById('next');
const progressBar = document.getElementById('progress-bar');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');
const volumeControl = document.getElementById('volume-control');
const playbackOrder = document.getElementById('playback-order');
const request_access_ACTIONS = {
    ADD_PLAYLIST: 'add_playlist',
    ADD_TRACK: 'add_track',
    ADD_TRACK_TO_PLAYLIST: 'add_track_to_playlist',
    DELETE_TRACK: 'delete_track',
    DELETE_PLAYLIST: 'delete_playlist',
    SAVE_SETTINGS: 'save_settings'
};

const id = (s) => document.getElementById(s);

// var tracks = []; // Список всех треков
var playlist_tracks = []; // Список треков текущего плейлиста
var played_tracks = [];
var now_playlist = null;


// Получаем и отображаем плейлисты
fetch('/playlists')
    .then(res => res.json())
    .then(playlists => createPlaylistItems(playlists))
    .catch(err => console.error('Ошибка при получении плейлистов:', err));
    

function showModal() {
    id('modal').style.display = 'flex';
}
function hideModal() { 
    id('modal').style.display = 'none'; 
    id('modal-content').innerHTML = ""
}

// стандартные функции
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function get_track(track_id) {
    return fetch(`/get_track?track_id=${track_id}`)
    .then(res => {
        if (!res.ok) {
            throw new Error('Ошибка при получении трека');
        }
        return res.json();
    });
}

async function showLoading(text = "Загрузка...") {
    const container = id("modal-content");
    if (!container) {
        throw new Error('div id="modal-content" не найден');
    }

    container.innerHTML = `
        <div class="loading-wrapper">
        <div class="spinner"></div>
        <div class="loading-text">${text}</div>
        </div>
    `;
    showModal();
    // дать браузеру реально отрисовать загрузку
    await new Promise(requestAnimationFrame);
}

function my_alert(textContent) {
    id("modal-content").innerHTML = `
        <div class="big">
            ${textContent}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
            <button class="btn" id="modal-close">Ok</button>
        </div>`
    showModal();
    id('modal-close').addEventListener('click', () => {
        hideModal();
        return undefined;
    });
}

function my_confirm(textContent, textOk = "Ok", textCancel = "Отмена") {
    return new Promise(async (resolve) => {
        id("modal-content").innerHTML = `
            <div class="big">
                ${textContent}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
                <button class="btn" id="modal-ok">${textOk}</button>
                <button class="btn" id="modal-cancel">${textCancel}</button>
            </div>`
        showModal();
        id('modal-ok').addEventListener('click', () => {
            hideModal();
            return resolve(true);
        });
        id('modal-cancel').addEventListener('click', () => {
            hideModal();
            return resolve(false);
        });
    });
}

function input_password() {
    return new Promise(async (resolve) => {
        showLoading()
        if (!await fetch(`/passwords_is_enabled`)
        .then(res => res.json())
        .then(passwords_is_enabled => {
            return passwords_is_enabled;
        })) {
            hideModal();
            return resolve('');
        }
        id("modal-content").innerHTML = `
            <h3 style="margin:0 0 6px 0">Введите пароль</h3>
            <label>Пароль</label>
            <input id="inp-password" type="text" style="-webkit-text-security: disc;">
            <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
                <button class="btn" id="modal-close">Отмена</button>
                <button class="btn" id="modal-confirm">Подтвердить</button>
            </div>`
        showModal()
        id('modal-close').addEventListener('click', () => {
            hideModal();
            return resolve(undefined);
        });
        id('modal-confirm').addEventListener('click', () => {
            const password = id('inp-password').value.trim();
            hideModal();
            return resolve(password);
        });
    });
}