const settingsPanel = document.getElementById('settings-panel');
const settingsButton = document.getElementById('settings-button');
function openSettings() {
    fetch(`/get_settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            names: [
                'Probability_tracks_from_playlist',
                'Sensitivity'
            ]
        })
    })
    .then(res => res.json())
    .then(settings => {
        document.getElementById('probability_tracks_from_playlist').value = settings.Probability_tracks_from_playlist * 100;
        document.getElementById('sensitivity').value = settings.Sensitivity * 100;
        document.getElementById('probability_tracks_from_playlist_value').value = settings.Probability_tracks_from_playlist * 100;
        document.getElementById('sensitivity_value').value = settings.Sensitivity * 100;
        if (localStorage.key("timer") && Number(localStorage.getItem("timer")) > 0) {
            let hours = Math.max(Math.floor((localStorage.getItem("timer") - Date.now()) / (1000 * 60 * 60)), 0);
            let minutes = Math.max(Math.floor(((localStorage.getItem("timer") - Date.now()) / (1000 * 60)) % 60), 0);
            let seconds = Math.max(Math.floor(((localStorage.getItem("timer") - Date.now()) / 1000) % 60), 0);
            document.getElementById('timer').value = String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");
        }
        else {
            localStorage.removeItem("timer");
            document.getElementById('timer').value = `00:00:00`;
        }
    })
    settingsPanel.style.right = '0';
    settingsButton.style.transform = 'rotate(-180deg)';
    settingsButton.onclick = closeSettings;
}
function closeSettings() {
    settingsPanel.style.right = '-768px';
    settingsButton.style.transform = 'rotate(0deg)';
    settingsButton.onclick = openSettings;
}
async function saveSettings() {
    const probabilityTracksFromPlaylist = document.getElementById('probability_tracks_from_playlist').value;
    const sensitivity = document.getElementById('sensitivity').value;

    if (!await fetch(`/passwords_is_enabled`)
    .then(res => res.json())
    .then(passwords_is_enabled => {
        return passwords_is_enabled;
    })) {
        if (!await my_confirm("Вы уверены, что хотите сохранить настройки?", "Да", "Нет")) {
            return;
        }
    }
    
    let password = await input_password();
    if (password === undefined) {
        return;
    }
    showLoading();

    fetch('/save_settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            params: {
                Probability_tracks_from_playlist: probabilityTracksFromPlaylist / 100,
                Sensitivity: sensitivity / 100,
            },
            password: password,
            action: request_access_ACTIONS.SAVE_SETTINGS
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
        let parts = document.getElementById('timer').value.split(":");
        let hours = Number(parts[0])
        let minutes = Number(parts[1])
        let seconds = Number(parts[2])
        localStorage.setItem("timer", Date.now() + ((hours * 60 + minutes) * 60 + seconds) * 1000);
        return res.json();
    })
    .then(async response => {
        my_alert(response.message);
        if (response.message === 'Настройки успешно сохранены'){
            closeSettings();
            await resetNextTrack(); // Сбрасываем следующий трек при смене плейлиста
        }
    })
    .catch(err => {
        if (err.message === "Неверный пароль") return;
        my_alert('При сохранении настроек произошла ошибка :(');
        console.error('Ошибка при сохранении настроек:', err);
    });
}