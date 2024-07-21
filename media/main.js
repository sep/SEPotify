(function () {
    const vscode = acquireVsCodeApi();

    document.querySelector('.pause-play-button').addEventListener('click', () => {
        pausePlay();
    });

    function pausePlay() {
        vscode.postMessage({ type: 'pausePlay' });
    }
}());