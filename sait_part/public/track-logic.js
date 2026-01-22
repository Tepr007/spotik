// public/player-logic.js
// Логика воспроизведения треков

let play_now = null; // Текущий трек, который играет
let NextTrackInfo = null; // Информация о следующем треке, который будет играть
let PastTrackInfo = null; // Информация предыдущем треке, который играл
let preloadedNextTrack = null; // Следующий трек, который будет играть
let preloadedPastTrack = null; // Предыдущий трек, который играл
let index_queue = 0; // Индекс текущего трека в очереди воспроизведения
let isOnline = navigator.onLine; // начальное значение
let currentAbortControllerForPastTrack = { controller: null}; // Текущий контроллер для отмены fetch предыдущего трека
let currentAbortControllerForNextTrack = { controller: null}; // Текущий контроллер для отмены fetch следующего трека

const GET_TRACK_LOGIC = {
    play_now: () => play_now,
    next_track: () => NextTrackInfo,   
    past_track: () => PastTrackInfo,
    index_queue: () => index_queue,
    isOnline: () => isOnline
};

// Функция периодической проверки реального интернета
async function updateInternetStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("/ping", { signal: controller.signal });
        clearTimeout(timeoutId);

        isOnline = response.ok;
    } catch (e) {
        // if (isOnline) {
        //     get_tracks_offline(); // если только что был онлайн, то запускаем оффлайн функцию
        // }
        isOnline = false;
    }
}

// Проверка каждые 10 секунд
setInterval(updateInternetStatus, 10000);
updateInternetStatus(); // сразу первая проверка

async function determineNextTrack() {
    //NextTrackInfo = null; // Сбрасываем следующий трек
    let _nextTrackId;
    if (playlist_tracks.every(track => played_tracks.includes(track.id))) {
        played_tracks = [];
    }
    if (index_queue === 0) {
        switch (GET_PLATBACK_ORDER.playback_order()) {
            case GET_PLATBACK_ORDER.random:
                do {
                    _nextTrackId = playlist_tracks[Math.floor(Math.random() * playlist_tracks.length)].id;
                } while (played_tracks.includes(_nextTrackId));
                break;
            case GET_PLATBACK_ORDER.successively:
                _nextTrackId = playlist_tracks[(playlist_tracks.findIndex(track => track.id === play_now) + 1) % playlist_tracks.length].id;
                break;
            case GET_PLATBACK_ORDER.neuro:
                // console.log(play_now);
                await getNextNeuroTrack()
                .then(track => {
                    // console.log("Следующий трек:", track);
                    _nextTrackId = track;
                })
                .catch(err => {
                    _nextTrackId = play_now;
                    console.error(err);
                });
                break;
        }
    }
    else {
        switch (GET_PLATBACK_ORDER.playback_order()) {
            case GET_PLATBACK_ORDER.successively:
                _nextTrackId = playlist_tracks[(playlist_tracks.findIndex(track => track.id === play_now) + 1) % playlist_tracks.length].id;
                break;
            case GET_PLATBACK_ORDER.neuro:
            case GET_PLATBACK_ORDER.random:
                _nextTrackId = played_tracks[played_tracks.length - index_queue];
                break;
        }
        
    }
    NextTrackInfo = await get_track(_nextTrackId);
}

async function determinePastTrack() {
    let _pastTrackId;
    switch (GET_PLATBACK_ORDER.playback_order()) {
            case GET_PLATBACK_ORDER.successively:
                _pastTrackId = playlist_tracks[(playlist_tracks.length + playlist_tracks.findIndex(track => track.id === play_now) - 1) % playlist_tracks.length].id;
                break;
            case GET_PLATBACK_ORDER.neuro:
            case GET_PLATBACK_ORDER.random:
                //console.log("play_now:", play_now);
                if (played_tracks.length === 0) {
                    _pastTrackId = play_now;
                    break;
                }
                _pastTrackId = played_tracks[Math.max(0, played_tracks.length - index_queue - 2)];
                break;
        }
    
    PastTrackInfo = await get_track(_pastTrackId);
}

async function getNextNeuroTrack() {
        
    if (!isOnline) {
        console.warn("Нет интернета");
    }

    while (!isOnline) {
        continue; // Ждем, пока не появится интернет
    }
    return await fetch("/next_neuro_track", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ played_tracks: played_tracks, playlist: now_playlist, pastTrack: play_now })
    })
    .then(async res => {
        const text = await res.text();

        // Проверим статус
        if (!res.ok) {
            // console.error("Сервер вернул ошибку:", text);
            throw new Error("Сервер вернул ошибку: " + text);
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error("Невалидный JSON: " + text);
        }
    })
    .then(data => {
        console.log(data.output);
        return data.nextTrack;
    })
}

async function loadNextTrack() {
    await determinePastTrack();
    preloadPastTrack();
    await loadTrack(NextTrackInfo, preloadedNextTrack); // после switch чтобы не добавлять последний трек в played_tracks снова
    switch (GET_PLATBACK_ORDER.playback_order()) {
        case GET_PLATBACK_ORDER.successively:
            index_queue = 0;
            break;
        case GET_PLATBACK_ORDER.neuro:
        case GET_PLATBACK_ORDER.random:
            index_queue -= index_queue ? 1 : 0 ;
            break;
    }
    await determineNextTrack();
    preloadNextTrack();
}

async function loadPastTrack() {
    await determinePastTrack();
    preloadPastTrack();
    switch (GET_PLATBACK_ORDER.playback_order()) {
        case GET_PLATBACK_ORDER.successively:
            index_queue = 0;
            break;
        case GET_PLATBACK_ORDER.neuro:
        case GET_PLATBACK_ORDER.random:
            index_queue += index_queue < played_tracks.length - 1 ? 1 : 0 ;
            break;
    }
    await loadTrack(PastTrackInfo, preloadedPastTrack); // после switch чтобы не добавлять предпоследний трек в played_tracks снова
    await determineNextTrack();
    preloadNextTrack();
}

// Загрузить трек по индексу
async function loadTrack(track, preload_track = null) {
    // console.log(track_id)
    track_id = track.id
    while (track_id === undefined || track_id === null) {
        console.warn("Нет идентификатора трека для загрузки");
        await sleep(1000); // Ждем, пока не появится идентификатор трека
    }

    // удаляем класс now_track
    let pastPlaylistTrack = playlist_tracks.findIndex(track => track.id === play_now);
    if (document.getElementById(String(pastPlaylistTrack)) && pastPlaylistTrack !== -1) {
        const pastTrack = document.getElementById(String(pastPlaylistTrack));
        pastTrack.classList.remove("now_track");
        const numberPastTrack = pastTrack.querySelector('.number');
        numberPastTrack.textContent = Number(pastTrack.id) + 1;
    }

    // сменяем трек
    play_now = track_id;

    // устанавливаем класс now_track
    let nextPlaylistTrack = playlist_tracks.findIndex(track => track.id === play_now);
    if (document.getElementById(String(nextPlaylistTrack)) && nextPlaylistTrack !== -1) {
        const nowTrack = document.getElementById(String(nextPlaylistTrack));
        nowTrack.classList.add("now_track");
        const numberNowTrack = nowTrack.querySelector('.number');
        numberNowTrack.textContent = '▶';
    }
    // console.log(tracks[play_now]);

    // const track = await get_track(play_now);

    // Обновление текста и обложки
    document.querySelector('.track-title').textContent = track.name;
    document.querySelector('.track-artist').textContent = track.author;
    // console.log("Обложка трека:", `url(${track.cover})`, track.cover, 'url(base_icon.webp)');
    document.querySelector('.cover').style.backgroundImage = track.cover ? `url(${track.cover})` : 'url(base_icon.webp)';

    document.querySelector('#page-title').textContent = track.name + ' - ' + track.author;

    console.log("Track:", track);
    console.log("Now track:", play_now); 
    console.log("playlist_tracks:", playlist_tracks); 
    console.log("played_tracks:", played_tracks); 

    playBtn.textContent = '⏸'; // смена иконки
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.author,
        album: now_playlist,
        artwork: [
            {
                src: track.cover || 'base_icon.webp',
                sizes: '512x512',
                type: 'image/jpeg'
            }
        ]
        });

        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextBtn.click());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevBtn.click());
    }

    if (preload_track !== null) {
        audio.src = preload_track;
        console.log("Используем предзагруженный трек:", preload_track);
    }
    else {
        audio.src = track.file;
    }
    resetPreloadedTracks();

    let i = 0;
    let delay = 100; // задержка 0.1 секунды
    while (audio.readyState < 3) {
        await sleep(delay); // Ждем 0.1 секунду перед следующей проверкой
        i++;
        if (i % (1000 / delay) === 0) {
            console.log(`Вы ждёте ${i/(1000 / delay)} секунд... isOnline: ${isOnline}, audio.readyState: ${audio.readyState}`);
        }
    }
    console.log(`${i/(1000 / delay)} секунд ждали загрузку аудио`);

    await audio.play()
        .then(() => {
            if (index_queue === 0) {
                played_tracks.push(play_now);
            }
        })
        .catch(err => {
            console.error("Ошибка воспроизведения аудио:", err);
        });
}

async function preloadNextTrack() {
    preloadedNextTrack = null; // Сбрасываем следующий трек
    preloadedNextTrack = await preloadTrack(NextTrackInfo, currentAbortControllerForNextTrack).then((res) => {
        if (res !== null) {
            console.log("Предзагружен следующий трек");
            return res;
        }
        console.warn("Предзагрузка следующего трека отменена");
        return preloadedNextTrack;
    });
}

async function preloadPastTrack() {
    preloadedPastTrack = null; // Сбрасываем предыдущий трек
    preloadedPastTrack = await preloadTrack(PastTrackInfo, currentAbortControllerForPastTrack).then((res) => {
        if (res !== null) {
            console.log("Предзагружен предыдущий трек");
            return res;
        }
        console.warn("Предзагрузка предыдущего трека отменена");
        return preloadedPastTrack
    });
}

async function preloadTrack(track, currentAbortController) {
    // Если уже есть активный запрос — отменяем его
    if (currentAbortController.controller) {
        currentAbortController.controller.abort();
    }

    // Создаём новый контроллер для текущего fetch
    currentAbortController.controller = new AbortController();
    const { signal } = currentAbortController.controller;

    try {
        const res = await fetch(track.file, { signal });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        return url;

    } catch (err) {
        if (err.name !== "AbortError") {
            console.error("Ошибка предзагрузки трека:", err);
        }
        return null;
    }
}

async function loadSelectedTrack(track_id) {
    played_tracks = [];
    index_queue = 0;
    SET_PLAYER.prevBtn_down();
    SET_PLAYER.nextBtn_down();
    const track = await get_track(track_id);
    await loadTrack(track);
    determinePastTrack().then(() => {
        preloadPastTrack();
        SET_PLAYER.prevBtn_up();
    });
    determineNextTrack().then(() => {
        preloadNextTrack();
        SET_PLAYER.nextBtn_up();
    });
}

async function resetNextTrack() {
    if (play_now !== null) {
        await determineNextTrack();
        preloadNextTrack();
    }
}

function resetPreloadedTracks() {
    preloadedNextTrack = null; 
    preloadedPastTrack = null;
}
