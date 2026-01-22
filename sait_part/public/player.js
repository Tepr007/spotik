// public/player.js
// Функции для управления аудиоплеером

let prevBtn_IsClicked = 0; // Флаг для предотвращения повторного нажатия кнопки "Назад"
let nextBtn_IsClicked = 0; // Флаг для предотвращения повторного нажатия кнопки "Вперед"

const GET_PLAYER = {
    prevBtn_IsClicked: () => prevBtn_IsClicked,
    nextBtn_IsClicked: () => nextBtn_IsClicked
};

const SET_PLAYER = {
    prevBtn_down: () => {
        prevBtn_IsClicked++;
        prevBtn.style.color = "#848484";
    },
    prevBtn_up: () => {
        prevBtn_IsClicked--;
        prevBtn.style.color = "#ffffff";
    },
    nextBtn_down: () => {
        nextBtn_IsClicked++;
        nextBtn.style.color = "#848484";
    },
    nextBtn_up: () => {
        nextBtn_IsClicked--;
        nextBtn.style.color = "#ffffff";
    }
};

audio.addEventListener("ended", async() => {
    await loadNextTrack();
});

// ⏮ Prev
prevBtn.addEventListener('click', async () => {
    if (prevBtn_IsClicked) {
        // console.warn("Кнопка 'Назад' уже нажата, повторное нажатие игнорируется.", prevBtn_IsClicked);
        return;
    }
    SET_PLAYER.prevBtn_down();
    SET_PLAYER.nextBtn_down();
    do {
        try {
            await loadPastTrack();
            break;
        }
        catch (error) {
            console.error("Ошибка при загрузке предыдущего трека:", error);
            await sleep(1000); // Ждем 1 секунду перед повторной попыткой
        }
    } while (true)
    SET_PLAYER.prevBtn_up();
    SET_PLAYER.nextBtn_up();
});
// ▶ Play / Pause
playBtn.addEventListener('click', () => {
    audio.paused ? audio.play() : audio.pause();
    playBtn.textContent = audio.paused ? '▶' : '⏸'; // смена иконки
});
// ⏭ Next
nextBtn.addEventListener('click', async () => {
    if (nextBtn_IsClicked) {
        // console.warn("Кнопка 'Вперед' уже нажата, повторное нажатие игнорируется.", nextBtn_IsClicked);
        return;
    }
    SET_PLAYER.nextBtn_down();
    SET_PLAYER.prevBtn_down();
    do {
        try {
            await loadNextTrack();
            break;
        }
        catch (error) {
            console.error("Ошибка при загрузке следующего трека:", error);
            await sleep(1000); // Ждем 1 секунду перед повторной попыткой
        }
    } while (true)
    SET_PLAYER.nextBtn_up();
    SET_PLAYER.prevBtn_up();
});

// 🔁 форматируем секунды в "мин:сек"
function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// 🕒 Когда метаданные аудио загружены — узнаём длину
audio.addEventListener('loadedmetadata', () => {
    progressBar.max = Math.floor(audio.duration);
    duration.textContent = formatTime(audio.duration);
});

// 🔁 Обновляем прогрессбар и время каждую секунду
audio.addEventListener('timeupdate', () => {
    progressBar.value = Math.floor(audio.currentTime);
    currentTime.textContent = formatTime(audio.currentTime);
});

// 🖱 Перематываем аудио при движении ползунка
progressBar.addEventListener('input', () => {
    audio.currentTime = progressBar.value;
});

// 🖱 Перематываем аудио при движении ползунка
volumeControl.addEventListener('input', () => {
    audio.volume = volumeControl.value / 100;
});
