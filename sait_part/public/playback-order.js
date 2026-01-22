

let playback_order = "neuro";

const GET_PLATBACK_ORDER = {
    playback_order: () => playback_order,
    neuro: "neuro",
    random:  "random",
    successively: "successively"
};

playbackOrder.addEventListener("click", async () => {
    if (playbackOrder.name === GET_PLATBACK_ORDER.successively) {
        playbackOrder.textContent = "Случайно";
        playbackOrder.name = GET_PLATBACK_ORDER.random;
        playback_order = GET_PLATBACK_ORDER.random;
    } else if (playbackOrder.name === GET_PLATBACK_ORDER.random) {
        playbackOrder.textContent = "Нейро";
        playbackOrder.name = GET_PLATBACK_ORDER.neuro;
        playback_order = GET_PLATBACK_ORDER.neuro;
    } else {
        playbackOrder.textContent = "Последовательно";
        playbackOrder.name = GET_PLATBACK_ORDER.successively;
        playback_order = GET_PLATBACK_ORDER.successively;
    }
    await resetNextTrack(); // Сбрасываем следующий трек при смене порядка воспроизведения
});