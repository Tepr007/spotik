// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const mm = require('music-metadata'); // Для чтения MP3
const { get } = require('http');
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require('process');
const dns = require('dns').promises;
const net = require('net');

const app = express();
let rl; // Глобальная переменная для интерфейса readline

const rootDir = path.join(__dirname, '..');
const passwordsFile = path.join(rootDir, '..', 'passwords.json'); // Путь к файлу passwords.json
const musicDir = path.join(rootDir, '..', 'music'); // Путь к директории с музыкой
const playlistsFile = path.join(rootDir, '..', 'playlists.json'); // Путь к файлу playlists.json
const tracksFile = path.join(rootDir, '..', 'tracks.json'); // Путь к файлу tracks.json
const settingsFile = path.join(rootDir, '..', 'public_settings.json'); // Путь к файлу public_settings.json
const PRIVATEsettingsFile = path.join(rootDir, '..', 'private_settings.json'); // Путь к файлу private_settings.json

// Обслуживание статических файлов из директории music
app.use('/music', express.static(musicDir));
app.use(express.static(path.join(rootDir, 'public'))); // Обслуживание index.html, script.js и т.д.
app.use(express.json()); // Для парсинга application/json
// app.use(require('cors')());
app.get('/ping', (req, res) => {
    res.send("ok"); // просто текст
});

function update_parsers() {
    runPython("../python_part/update_parsers.py");
}

async function checkPassword(password, action) {
    try {
        if (!JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8')).Enable_passwords){
            return true;
        };
    } catch (err) {
        throw new Error("Ошибка чтения private_settings.json");
    }
    try {
        const passwordData = await fs.promises.readFile(passwordsFile, 'utf-8');
        const correctPasswords = JSON.parse(passwordData);

        if (!correctPasswords.hasOwnProperty(action)) {
            return false;
        }

        return correctPasswords[action] === password;
    } catch (err) {
        throw new Error("Ошибка чтения passwords.json");
    }
}

app.get('/passwords_is_enabled', async (req, res) => {
    fs.readFile(PRIVATEsettingsFile, 'utf-8', (err, settingsData) => {
        if (err) {
            console.error('Ошибка чтения private_settings.json:', err);
            return res.status(500).json({ error: 'Ошибка чтения private_settings.json' });
        }

        let settings;
        try {
            settings = JSON.parse(settingsData);
        } catch (parseErr) {
            console.error('Ошибка парсинга private_settings.json:', parseErr);
            return res.status(500).json({ error: 'Ошибка парсинга private_settings.json' });
        }

        res.json(settings.Enable_passwords);
    });
});

app.get('/playlists', (req, res) => {
    fs.readFile(playlistsFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Ошибка при чтении playlists.json');
        res.json(JSON.parse(data));
    });
});

app.get('/tracks', (req, res) => {
    const playlistName = req.query.playlist;
    if (playlistName) {
        fs.readFile(playlistsFile, 'utf-8', (err, playlistData) => {
            if (err) return res.status(500).send('Ошибка чтения playlists.json');

            const allPlaylists = JSON.parse(playlistData);
            let trackNames = allPlaylists[playlistName];
            if (!trackNames) return res.status(404).send('Плейлист не найден')
            fs.readFile(tracksFile, (err, data) => {
                if (err) return res.status(500).send('Ошибка чтения tracks.json');

                let tracks = Object.entries(JSON.parse(data))
                    .filter(([id, file]) => {
                        return trackNames && trackNames.includes(id);
                    })
                    .map(([id, file]) => {
                        return {
                            id: file.id,
                            file: file.file,
                            name: file.name,
                            author: file.author,
                            album: file.album
                        }
                    });

                const nameOrder = new Map(trackNames.map((name, index) => [name, index]));

                tracks.sort((a, b) => {
                    const indexA = nameOrder.get(a.id) ?? Infinity;
                    const indexB = nameOrder.get(b.id) ?? Infinity;
                    return indexA - indexB;
                });

                res.json(tracks);
            });
        });
        // runPython("../python_part/search_mid_for_neuro_rec.py", [playlistName]);
    }
    else{
        fs.readFile(tracksFile, (err, data) => {
            if (err) return res.status(500).send('Ошибка чтения tracks.json');

            const tracks = JSON.parse(data);

            res.json(tracks);
        });
    }
});

app.get('/get_track', (req, res) => {
    const trackId = req.query.track_id;
    if (Number.isNaN(trackId)) {
        return res.status(400).send('Неверный track_id');
    }
    getTracks()
    .then(tracks => {
        const track = tracks[trackId];
        res.json(track);
    })
    .catch(err => {
        console.error("Ошибка получения треков:", err);
        return res.status(500).send('Ошибка получения треков: ' + err);
    });
});


async function runPython(pythonScriptPath, args = []) {
    return new Promise((resolve, reject) => {
        const pythonPath =  "../.venv/Scripts/python.exe";
        const python = spawn(pythonPath, ['-u', pythonScriptPath, ...args], {
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            }
        });

        let output = '';
        let error = '';

        python.stdout.setEncoding('utf8');

        python.stdout.on('data', data => {
            output += data.toString();
            console.log(data.toString());
        });

        python.stderr.on('data', data => {
            error += data.toString();
        });

        python.on('close', code => {
            if (code !== 0) {
                return reject(new Error(error));
            }
            // console.log(output.split('\n'));
            resolve(output);
        });
    });
}


app.post('/next_neuro_track', async (req, res) => {
    const played_tracks = req.body.played_tracks;
    const playlist = req.body.playlist;
    const pastTrack = req.body.pastTrack;
    let output;

    try {
        output = await runPython("../python_part/neuro_rec.py", [playlist, JSON.stringify(played_tracks), String(pastTrack)]);
    } catch (err) {
        console.error("Ошибка выполнения скрипта:", err.message);
        return res.status(500).send("Ошибка выполнения скрипта: " + err.message);
    }
    // Очистим строку и конвертируем в число
    let nextTrack = output.split('\n')[output.split('\n').length - 2].trim()
    const parsedTrack = nextTrack;

    res.json({ nextTrack: parsedTrack, output: output });
});

function getTracks() {
    let tracks = [];
    return new Promise((resolve, reject) => {
        fs.readFile(tracksFile, (err, data) => {
            if (err) return reject('Ошибка чтения tracks.json');

            try {
                const tracks = JSON.parse(data);
                resolve(tracks);
            } catch (e) {
                reject('Ошибка парсинга tracks.json');
            }

        });
    });
}

function getPlaylistTracks(playlist_name) {
    return new Promise((resolve, reject) => {
        fs.readFile(playlistsFile, 'utf-8', (err, playlistData) => {
            if (err) return reject('Ошибка чтения playlists.json');

            const allPlaylists = JSON.parse(playlistData);
            let trackNames = allPlaylists[playlist_name];
            if (!trackNames) return reject('Плейлист не найден');

            fs.readFile(tracksFile, 'utf-8', (err, data) => {
                if (err) return reject('Ошибка чтения tracks.json');

                try {
                    let playlist_tracks = Object.entries(JSON.parse(data))
                    .filter(([id, file]) => {
                        return trackNames.includes(id);
                    })
                    .map(([id, file]) => {
                        return {
                            id: file.id,
                            file: file.file,
                            name: file.name,
                            author: file.author,
                            album: file.album
                        }
                    });

                    const nameOrder = new Map(trackNames.map((name, index) => [name, index]));

                    playlist_tracks.sort((a, b) => {
                        const indexA = nameOrder.get(a.id) ?? Infinity;
                        const indexB = nameOrder.get(b.id) ?? Infinity;
                        return indexA - indexB;
                    });

                    resolve(playlist_tracks);
                } catch (e) {
                    reject('Ошибка парсинга tracks.json');
                }
            });
        });
    });
}

async function sendTracksAndPlaylistTracks(res, playlist_name) {
    // const tracks = await getTracks();
    const playlist_tracks = await getPlaylistTracks(playlist_name).catch(err => {
        return [];
    });
    res.json({
        // tracks: tracks,
        playlist_tracks: playlist_tracks
    });
}

app.post('/add_playlist', async (req, res) => {
    const url = req.body.url;
    const name = req.body.name;
    const password = req.body.password;
    const action = req.body.action;

    if (!await checkPassword(password, action)) {
        return res.status(400).send('Неверный пароль');
    }

    if (!url && !name) {
        return res.status(400).send('Данные не указаны');
    }

    runPython("../python_part/add_playlist.py", [url, name]).then(() => {
        // res.status(200).send('Плейлист успешно добавлен');
        sendTracksAndPlaylistTracks(res, name);
    }).catch(err => {
        console.error("Ошибка выполнения скрипта:", err.message);
        res.status(500).send('Ошибка добавления плейлиста: ' + err);
    });
});

app.post('/add_track', async (req, res) => {
    const url = req.body.url;
    const playlist_name = req.body.playlist_name;
    const password = req.body.password;
    const action = req.body.action;

    if (!await checkPassword(password, action)) {
        return res.status(400).send('Неверный пароль');
    }

    if (!url) {
        return res.status(400).send('Ссылка на трек не указана');
    }

    runPython("../python_part/add_track.py", [url, playlist_name]).then(() => {
        sendTracksAndPlaylistTracks(res, playlist_name);
    }).catch(err => {
        console.error("Ошибка выполнения скрипта:", err.message);
        res.status(500).send('Ошибка добавления трека: ' + err);
    });
});

app.post('/add_track_to_playlist', async (req, res) => {
    const trackId = req.body.track_id;
    const playlistName = req.body.playlist_name;
    const password = req.body.password;
    const action = req.body.action;

    if (!await checkPassword(password, action)) {
        return res.status(400).send('Неверный пароль');
    }

    fs.readFile(playlistsFile, 'utf-8', (err, playlistData) => {
        if (err) return reject('Ошибка чтения playlists.json');

        let allPlaylists = JSON.parse(playlistData);
        allPlaylists[playlistName].push(trackId);
        playlistData = JSON.stringify(allPlaylists, null, 2);
        fs.writeFile(playlistsFile, playlistData, 'utf-8', (err) => {
            if (err) return res.status(500).send('Ошибка записи playlists.json');
            getPlaylistTracks(playlistName).then(playlist_tracks => {
                res.json({
                    message: 'Трек успешно добавлен в плейлиста',
                    playlist_tracks: playlist_tracks
                });
            }).catch(err => {
                console.error("Ошибка получения треков плейлиста:", err);
                res.status(500).send('Ошибка получения треков плейлиста: ' + err);
            });
        });
    });
});

app.delete("/delete_track_from_playlist", async (req, res) => {
    const trackId = req.query.track_id;
    const playlistName = req.query.playlist_name;
    
    const password = req.query.password;
    const action = req.query.action;

    if (!await checkPassword(password, action)) {
        return res.status(400).send('Неверный пароль');
    }

    fs.readFile(playlistsFile, 'utf-8', (err, playlistData) => {
        if (err) return reject('Ошибка чтения playlists.json');

        let allPlaylists = JSON.parse(playlistData);
        console.log(allPlaylists[playlistName]);
        allPlaylists[playlistName] = allPlaylists[playlistName].filter(track => track !== trackId);
        playlistData = JSON.stringify(allPlaylists, null, 2);
        fs.writeFile(playlistsFile, playlistData, 'utf-8', (err) => {
            if (err) return res.status(500).send('Ошибка записи playlists.json');
            getPlaylistTracks(playlistName).then(playlist_tracks => {
                res.json({
                    message: 'Трек успешно удален из плейлиста',
                    playlist_tracks: playlist_tracks
                });
            }).catch(err => {
                console.error("Ошибка получения треков плейлиста:", err);
                res.status(500).send('Ошибка получения треков плейлиста: ' + err);
            });
        });
    });
});

app.delete("/delete_playlist", async (req, res) => {
    const playlistName = req.query.playlist_name;
    const password = req.query.password;
    const action = req.query.action;

    if (!await checkPassword(password, action)) {
        return res.status(400).send('Неверный пароль');
    }

    fs.readFile(playlistsFile, 'utf-8', (err, playlistData) => {
        if (err) return reject('Ошибка чтения playlists.json');

        let allPlaylists = JSON.parse(playlistData);
        console.log(allPlaylists[playlistName]);
        delete allPlaylists[playlistName];
        playlistData = JSON.stringify(allPlaylists, null, 2);
        fs.writeFile(playlistsFile, playlistData, 'utf-8', (err) => {
            if (err) return res.status(500).send('Ошибка записи playlists.json');
            res.json({
                message: 'Плейлист успешно удален',
                playlistNames: Object.keys(allPlaylists)
            });
        });
    });
});

function checkSetting(key, value) {
    switch (key) {
        case 'Probability_tracks_from_playlist':
            return typeof value === 'number' && value >= 0 && value <= 1;
        case 'Sensitivity':
            return typeof value === 'number' && value >= 0 && value <= 1;
        case 'Enable_passwords':
            return typeof value === 'bool';
        default:
            // неизвестный ключ запрещён
            return false;
    }
}

app.post('/save_settings', async (req, res) => {
    const params = req.body.params;
    const password = req.body.password;
    const action = req.body.action;

    if (!await checkPassword(password, action)) {
        res.json({
                message: 'Неверный пароль'
            });
        return;
    }

    fs.readFile(settingsFile, 'utf-8', (err, settingsData) => {
        if (err) return res.status(500).send('Ошибка чтения settings.json');

        let settings = JSON.parse(settingsData);
        for (const key in params) {
            if (!checkSetting(key, params[key])) return res.status(500).send('Некорректные значения');
            if (Object.prototype.hasOwnProperty.call(settings, key)) {
                settings[key] = params[key];
            }
        }
        settingsData = JSON.stringify(settings, null, 2);
        fs.writeFile(settingsFile, settingsData, 'utf-8', (err) => {
            if (err) return res.status(500).send('Ошибка записи settings.json');
            res.json({
                message: 'Настройки успешно сохранены'
            });
        });
    });
});

app.post('/get_settings', async (req, res) => {
    const { names } = req.body;
    fs.readFile(settingsFile, 'utf-8', (err, settingsData) => {
        if (err) {
            console.error('Ошибка чтения settings.json:', err);
            return res.status(500).json({ error: 'Ошибка чтения settings.json' });
        }

        let settings;
        try {
            settings = JSON.parse(settingsData);
        } catch (parseErr) {
            console.error('Ошибка парсинга settings.json:', parseErr);
            return res.status(500).json({ error: 'Ошибка парсинга settings.json' });
        }

        const result = {};

        for (const name of names) {
            if (Object.prototype.hasOwnProperty.call(settings, name)) {
                result[name] = settings[name];
            }
        }
        res.json(result);
    });
});

function checkVCinPATH() {
    const dlls = ["msvcp140.dll", "vcruntime140.dll"];
    const pathDirs = [
        process.env.WINDIR + "\\System32",
        process.env.WINDIR + "\\SysWOW64"
    ]
    let missing = [];

    for (const dll of dlls) {
        let found = false;
        for (const dir of pathDirs) {
            try {
                const fullPath = path.join(dir, dll);
                if (fs.existsSync(fullPath)) { 
                    found = true; 
                    break; 
                }
            } catch(e) {
                continue;
            }
        }
        if (!found) missing.push(dll);
    }

    return missing;
}

function installVC() {
    const installerPath = path.join(rootDir, '..', "VC_redist.x64.exe");
    if (!fs.existsSync(installerPath)) {
        console.error("Установщик VC++ не найден в проекте!");
        process.exit(1);
    }

    console.log("Запускаем установщик Microsoft Visual C++ Redistributable...");
    const installer = spawn(installerPath, ["/quiet", "/norestart"], {
        stdio: "inherit"
    });

    installer.on("close", (code) => {
        if (code === 0) {
            console.log("Установка завершена. Перезапустите проект.");
            process.exit(0);
        } else {
            console.error("Ошибка при установке VC++ Redistributable, код:", code);
            process.exit(1);
        }
    });
}

async function initVenv(venvDir = '../.venv', requirementsFile = 'requirements.txt', python = 'python312') {
    let creating = false;

    // 1. Проверяем, есть ли venv
    if (!fs.existsSync(venvDir)) {
        console.log('Virtual environment not found. Creating...');
        await runCommand(python, ['-m', 'venv', venvDir]);
        creating = true;
    }

    // 2. Путь к python внутри venv
    const venvPython = process.platform === 'win32'
        ? path.join(venvDir, 'Scripts', 'python.exe')
        : path.join(venvDir, 'bin', 'python');

    if (!fs.existsSync(venvPython)) {
        throw new Error('Python inside venv not found');
    }

    if (creating) {
        // 3. Устанавливаем зависимости
        if (fs.existsSync(requirementsFile)) {
            console.log('Installing requirements...');
            await runCommand(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
            await runCommand(venvPython, ['-m', 'pip', 'install', '-r', requirementsFile]);
        } else {
            console.log('No requirements.txt found, skipping installation');
        }
    }
}

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit' });
        proc.on('close', code => {
            if (code !== 0) reject(new Error(`${command} exited with code ${code}`));
            else resolve();
        });
        proc.on('error', reject);
    });
}

function findPython(version) {
    try {
        const out = execSync(
            `py -${version} -c "import sys; print(sys.executable)"`,
            { encoding: 'utf8' }
        );
        return out.trim();
    } catch (e) {
        return null;
    }
}



(async () => {

    // Проверка наличия VC++ Redistributable
    let missing = checkVCinPATH();
    if (missing.length > 0) {
        console.warn(
            "Отсутствуют DLL для VC++ Redistributable в PATH: " + missing.join(", ")
        );
        // installVC();
    }

    // Проверка PRIVATEsettingsFile
    let settings;
    try {
        settings = JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8'));
    } catch (err) {
        settings = { Debug: false, Enable_passwords: false };
    }

    const python312 = findPython('3.12');
    const python311 = findPython('3.11');
    if (!python312 && !python311) {
        console.error("Не найден Python 3.11 или 3.12. Убедитесь, что Python установлен и добавлен в PATH.");
        process.exit(1);
    }

    // Инициализация виртуального окружения
    try {
        await initVenv(path.join(rootDir, '..', '.venv'), path.join(rootDir, '..', 'requirements.txt'), python312);
    } catch (e) {
        console.error(`Ошибка инициализации виртуального окружения .venv: ${e}`);
        process.exit(1);
    }
    try {
        await initVenv(path.join(rootDir, '..', 'openl3-env'), path.join(rootDir, '..', 'requirements_openl3.txt'), python311);
    } catch (e) {
        console.error(`Ошибка инициализации виртуального окружения .openl3-env: ${e}`);
        process.exit(1);
    }

    // Проверка SPOTIFY_CLIENT_ID и SPOTIFY_CLIENT_SECRET
    let SPOTIFY_CLIENT_ID;
    let SPOTIFY_CLIENT_SECRET;
    try {
        SPOTIFY_CLIENT_ID = JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8')).SPOTIFY_CLIENT_ID;
        SPOTIFY_CLIENT_SECRET = JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8')).SPOTIFY_CLIENT_SECRET;
    } catch (err) {
        SPOTIFY_CLIENT_ID = null;
        SPOTIFY_CLIENT_SECRET = null;
    }
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !(await runPython("../python_part/check_SPOTIFY_CLIENT_ID_and_SECRET.py", [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]))) {
        console.log("Необходимо ввести SPOTIFY_CLIENT_ID и SPOTIFY_CLIENT_SECRET для работы с Spotify API.");
        rl = readline.createInterface({ input, output });
        SPOTIFY_CLIENT_ID = await rl.question("Введите SPOTIFY_CLIENT_ID: ");
        SPOTIFY_CLIENT_SECRET = await rl.question("Введите SPOTIFY_CLIENT_SECRET: ");
        rl.close();
        settings.SPOTIFY_CLIENT_ID = SPOTIFY_CLIENT_ID;
        settings.SPOTIFY_CLIENT_SECRET = SPOTIFY_CLIENT_SECRET;
        await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        while (!(await runPython("../python_part/check_SPOTIFY_CLIENT_ID_and_SECRET.py", [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]))) {
            console.log("Введены неверные SPOTIFY_CLIENT_ID и/или SPOTIFY_CLIENT_SECRET. Попробуйте снова.");
            rl = readline.createInterface({ input, output });
            SPOTIFY_CLIENT_ID = await rl.question("Введите SPOTIFY_CLIENT_ID: ");
            SPOTIFY_CLIENT_SECRET = await rl.question("Введите SPOTIFY_CLIENT_SECRET: ");
            rl.close();
            settings.SPOTIFY_CLIENT_ID = SPOTIFY_CLIENT_ID;
            settings.SPOTIFY_CLIENT_SECRET = SPOTIFY_CLIENT_SECRET;
            await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        }
    }

    // Проверка домена/айпи
    let domen;
    try {
        domen = JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8')).DOMEN;
    } catch (err) {
        domen = null;
    }
    if (!domen || !(await dns.lookup(domen)) && !net.isIP(domen) && domen !== "localhost") {
        console.log(`Необходимо ввести ваш внешний домен или IP для работы с сервером.
Внешний IP можно получить у вашего провайдера (обычно требует доплаты).
Можете ввести localhost.`);
        rl = readline.createInterface({ input, output });
        domen = await rl.question("Введите ваш внешний домен или IP: ");
        rl.close();
        settings.DOMEN = domen;
        await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        while (!(await dns.lookup(domen)) && !net.isIP(domen) && domen !== "localhost") {
            console.log("Некорректный IP или домен Попробуйте снова.");
            rl = readline.createInterface({ input, output });
            domen = await rl.question("Введите ваш внешний домен или IP: ");
            rl.close();
            settings.DOMEN = domen;
            await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        }
        if (await dns.lookup(domen)) {
            console.warn(`УБЕДИТЕСЬ ЧТО ДОМЕН ${domen} УКАЗЫВАЕТ НА ВАШ ВНЕШНИЙ IP!\n`);
        }
        if (net.isIP(domen)) {
            console.warn(`УБЕДИТЕСЬ ЧТО IP ${domen} ЯВЛЯЕТСЯ ВАШИМ ВНЕШНИМ IP!\n`);
        }
    }

    // Проверка порта
    let port;
    try {
        port = JSON.parse(await fs.promises.readFile(PRIVATEsettingsFile, 'utf-8')).PORT;
    } catch (err) {
        port = null;
    }
    if (!port || isNaN(port) || port <= 0 || port >= 65536 || port === 443) {
        console.log(`Необходимо ввести порт для работы с сервером. 
80 - стандартный HTTP порт. Порт 443 зарезервирован для HTTPS и не может быть использован.
Порт можно открыть в настройках роутера.`);
        rl = readline.createInterface({ input, output });
        port = Number(await rl.question("Введите порт: "));
        rl.close();
        settings.PORT = port;
        await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        while (isNaN(port) || port <= 0 || port >= 65536 || port === 443) {
            console.log("Введён неверный порт. Попробуйте снова.");
            port = Number(await rl.question("Введите порт: "));
            rl.close();
            settings.PORT = port;
            await fs.promises.writeFile(PRIVATEsettingsFile, JSON.stringify(settings, null, 2));
        }
        console.warn(`УБЕДИТЕСЬ ЧТО ПОРТ ${port} ОТКРЫТ В НАСТРОЙКАХ РОУТЕРА И НЕ БЛОКИРУЕТСЯ АНТИВИРУСОМ ИЛИ БРАНДМАУЭРОМ!\n`);
    }








    console.log("Все проверки пройдены. Запускаем сервер...");
    console.log(`Настройки можно изменить в ${PRIVATEsettingsFile}`);

    update_parsers();
    setInterval(update_parsers, 3600*1000);

    // Запуск сервера
    app.listen(port, () => {
        if (port === 80) {
            console.log(`Сервер запущен: http://localhost`);
            console.log(`Сервер запущен: http://${domen}`);
        } else {
            console.log(`Сервер запущен: http://localhost:${port}`);
            console.log(`Сервер запущен: http://${domen}:${port}`);
        }
    });
})();