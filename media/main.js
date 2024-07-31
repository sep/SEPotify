(function () {
    const vscode = acquireVsCodeApi();

    document.querySelector('.pause-play-button').addEventListener('click', () => {
        pausePlay();
    });
    document.querySelector('.rewind-button').addEventListener('click', () => {
        rewind();
    });
    document.querySelector('.skip-button').addEventListener('click', () => {
        skip();
    });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                {
                    update(message.name, message.image);
                    break;
                }
        }
    });

    function update(name, image) {
        const songTitle = document.querySelector('.song-title');
        songTitle.innerText = name;


        const albumArt = document.querySelector('.album-art');
        albumArt.src = image;
    }

    function pausePlay() {
        vscode.postMessage({ type: 'pausePlay' });
    }

    function skip() {
        vscode.postMessage({ type: 'skip' });
    }

    function rewind() {
        vscode.postMessage({ type: 'rewind' });
    }
}());