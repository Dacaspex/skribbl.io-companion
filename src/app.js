$(document).ready(function () {
    Debug.log('Registered companion');

    Scribbl.initialise();
    registerGlobalObserver();
    run();
});

function registerGlobalObserver() {
    const screenContainerNode = Scribbl.getScreenContainerNode();
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(run);

    observer.observe(screenContainerNode, config);
}

function run() {
    // Detect page content
    const screenNode = Scribbl.getActiveScreenNode();

    runGame();

    switch (screenNode.id) {
        case Scribbl.SCREEN_GAME:
            runGame();
            break;
    }
}

function runGame() {
    // Function is called when content is updated

    // Overview of functionality:
    // - Update score graph
    // - Save previous drawings

    Companion.initialise();

    // 0. Check if game state is REVEAL
    Scribbl.recordGameState();
    if (!Scribbl.hasGameStateChanged()) return;
    if (Scribbl.gameState !== Scribbl.GameState.REVEAL) return;

    Debug.log('Game state changed to ' + Scribbl.gameState);

    // TODO: Clear button
    // TODO: Info per round

    // ==== Points
    // 1. Get player points
    const playersInfo = Scribbl.getPlayersInfo();

    // 2. Update points

    // 3. Draw graphs

    // ==== Drawing
    // 1. Get canvas data
    const sourceCanvasNode = Scribbl.getCanvasNode();
    Companion.saveRound(sourceCanvasNode);

    // 2. Copy canvas data to history

    // 3. Draw history

    Companion.render();
}

const Scribbl = {
    SCREEN_LOGIN: 'screenLogin',
    SCREEN_LOADING: 'screenLoading',
    SCREEN_BROWSER: 'screenBrowser',
    SCREEN_LOBBY: 'screenLobby',
    SCREEN_GAME: 'screenGame',

    GameState: {
        REVEAL: 'GAME_STATE_REVEAL',
        OTHER: 'GAME_STATE_OTHER',
    },

    initialise: function () {
        this.gameState = this.GameState.OTHER;
        this.gameState = this.GameState.OTHER;
    },

    getScreenNode: function (key) {
        return document.getElementById(key);
    },
    getScreenContainerNode: function () {
        return document.getElementById('screenLogin').parentNode;
    },

    getActiveScreenNode: function () {
        const screens = [this.SCREEN_LOGIN, this.SCREEN_LOADING, this.SCREEN_BROWSER, this.SCREEN_LOBBY, this.SCREEN_GAME];
        for (const screen of screens) {
            const screenNode = this.getScreenNode(screen);
            if (screenNode.style.display !== 'none') {
                return screenNode;
            }
        }
    },

    recordGameState: function () {
        const overlayNode = document.querySelector('#overlay > .content > .text');
        const overlayText = overlayNode.textContent;

        if (overlayText === undefined) return null;

        this.previousGameState = this.gameState;
        if (overlayText.includes('The word was:')) {
            this.gameState = this.GameState.REVEAL;
        } else {
            this.gameState = this.GameState.OTHER;
        }
    },

    hasGameStateChanged: function () {
        return this.gameState !== this.previousGameState;
    },

    getPlayersInfo: function () {
        const playersContainerNode = document.getElementById('containerGamePlayers');
        const playersInfo = [];

        for (let playerNode of playersContainerNode.childNodes) {
            const rankNode = playerNode.querySelector('.rank');
            const rank = rankNode.textContent.substring(1);

            const nameNode = playerNode.querySelector('.info > .name');
            const name = nameNode.textContent;

            const scoreNode = playerNode.querySelector('.info > .score');
            const score = scoreNode.textContent.substring(9);

            playersInfo.push({ name, score, rank });
        }

        return playersInfo;
    },

    getCanvasNode: function () {
        return document.getElementById('canvasGame');
    }
};

const Companion = {
    HISTORY_MAX_SIZE: 5,
    initialised: false,
    rounds: [],

    initialise: function () {
        if (this.initialised) return;

        Debug.log('Initialising render');

        // Inject css file
        // See https://stackoverflow.com/q/11553600/2878894
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = chrome.extension.getURL("src/app.css");
        document.head.appendChild(cssLink);

        // History
        const historyContainerNode = ElementFactory.create('div', 'companion__history-container');
        const historyHeaderContainer = ElementFactory.create('div', 'companion-history-header-container');

        const historyTitleNode = ElementFactory.create('h2', 'companion__history-title');
        historyTitleNode.textContent = 'Previous drawings';

        const clearButton = ElementFactory.create('span', 'companion__history-clear-button');
        clearButton.textContent = 'Clear previous drawings';
        clearButton.onclick = () => Companion.clearHistory();

        historyHeaderContainer.appendChild(historyTitleNode);
        historyHeaderContainer.appendChild(clearButton);

        const entriesContainer = ElementFactory.create('div', IdRegister.companion.historyEntriesContainer);

        historyContainerNode.appendChild(historyHeaderContainer);
        historyContainerNode.appendChild(entriesContainer);

        const outerContainer = document.querySelector('.container-fluid');

        insertNodeAfter(historyContainerNode, outerContainer);

        // Overlay image viewer
        const overlayContainer = ElementFactory.create('div', 'companion__overlay-container');
        overlayContainer.classList.add('companion__hidden');
        overlayContainer.onclick = () => {
            overlayContainer.classList.add('companion__hidden');
        };

        const overlayCanvasContainer = ElementFactory.create('div', 'companion__overlay-canvas-container');
        const overlayCanvas = ElementFactory.create('canvas', 'companion__overlay-canvas');
        overlayCanvas.width = 800;
        overlayCanvas.height = 600;

        overlayCanvasContainer.appendChild(overlayCanvas);
        overlayContainer.appendChild(overlayCanvasContainer);

        const bodyNode = document.getElementsByTagName('body')[0];
        bodyNode.appendChild(overlayContainer);

        this.initialised = true;
    },

    clearHistory: function () {
        this.rounds = []; // TODO: Reimplement, the round information should be kept
        this.render();
    },

    saveRound: function (canvasNode) {
        // Cloning a canvas does not copy the canvas contents unfortunately :(
        const copy = canvasNode.cloneNode();
        const copyCtx = copy.getContext('2d');
        copyCtx.drawImage(canvasNode, 0, 0);

        this.rounds.unshift({
            canvas: copy,
            historyCanvas: ElementFactory.createHistoryEntry(canvasNode),
            name: null,
        })
    },

    savePoints: function () {

    },

    render: function () {
        if (!this.initialised) this.initialise();

        Debug.log('Rendering');

        // Remove all current history entries and draw them again -- ths is the easiest method
        const oldEntries = document.querySelectorAll('[companion-history-entry]');
        oldEntries.forEach(entry => {
            entry.remove();
        });

        const historyEntriesContainer = document.getElementById(IdRegister.companion.historyEntriesContainer);

        // Draw the drawings from the last x rounds
        this.rounds.slice(0, this.HISTORY_MAX_SIZE).forEach(round => {
            const historyCanvas = round.historyCanvas;

            historyCanvas.onclick = () => {
                // Make overlay visible
                const overlayContainer = document.getElementById('companion__overlay-container');
                overlayContainer.classList.remove('companion__hidden');

                // Copy canvas data -- display this specific on the overlay canvas
                const overlayCanvas = document.getElementById('companion__overlay-canvas');
                const overlayCtx = overlayCanvas.getContext('2d');
                overlayCtx.drawImage(round.canvas, 0, 0);
            };

            historyEntriesContainer.appendChild(historyCanvas);
        });
    },
};

const ElementFactory = {
    create: function (type, id) {
        const element = document.createElement(type);
        element.id = id;

        return element;
    },

    createHistoryEntry: function (sourceCanvas) {
        const canvas = document.createElement('canvas');
        canvas.style.width = '200px';
        canvas.style.height = '150px';
        canvas.style.marginRight = '10px';
        canvas.setAttribute('companion-history-entry', 'true');
        canvas.width = 200;
        canvas.height = 150;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0, 800, 600, 0, 0, 200, 150);

        return canvas;
    },
};

const IdRegister = {
    companion: {
        historyContainer: 'companion__history-container',
        historyButtonContainer: 'companion-history-button-container',
        historyEntriesContainer: 'companion__history-entries-container'
    }
};

const Debug = {
    logging: true,

    log: function (message) {
        if (!this.logging) return;

        console.log(message);
    }
};

function insertNodeAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}