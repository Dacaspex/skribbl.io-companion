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
    Companion.saveDrawing(sourceCanvasNode);

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
    initialised: false,
    historyEntries: [],

    initialise: function () {
        if (this.initialised) return;

        Debug.log('Initialising render');

        const historyContainerNode = ElementFactory.createDiv(IdRegister.companion.historyContainer);
        historyContainerNode.style.margin = '0 auto';
        historyContainerNode.style.maxWidth = '1400px';

        const historyTitleNode = document.createElement('h2');
        historyTitleNode.textContent = 'Wall of shame';
        historyTitleNode.style.color = '#ffffff';
        historyTitleNode.style.marginBottom = '15px';

        const entriesContainer = ElementFactory.createDiv(IdRegister.companion.historyEntriesContainer);

        historyContainerNode.appendChild(historyTitleNode);
        historyContainerNode.appendChild(entriesContainer);

        const outerContainer = document.querySelector('.container-fluid');

        insertNodeAfter(historyContainerNode, outerContainer);

        this.initialised = true;
    },

    saveDrawing: function (canvasNode) {
        this.historyEntries.push(ElementFactory.createHistoryEntry(canvasNode));
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

        // TODO: Draw at most x

        const historyEntriesContainer = document.getElementById(IdRegister.companion.historyEntriesContainer);
        this.historyEntries.forEach(entry => {
            historyEntriesContainer.appendChild(entry);
        });

        // TODO: Update score graph
    },
};

const ElementFactory = {
    createDiv: function (id) {
        const div = document.createElement('div');
        div.id = id;

        return div;
    },

    createHistoryEntry: function (sourceCanvas) {
        const canvas = document.createElement('canvas');
        canvas.style.width = '200px';
        canvas.style.height = '150px';
        canvas.style.marginRight = '10px';
        canvas.setAttribute('companion-history-entry', 'true');

        const ctx = canvas.getContext('2d');
        // TODO: Figure out why this weird scaling of the destination is required???
        // TODO: Derive source width and height from source canvas/context
        ctx.drawImage(sourceCanvas, 0, 0, 800, 600, 0, 0, 300, 150);

        // TODO: Make canvas clickable and add functionality to copy contents to clipboard

        return canvas;
    },
};

const IdRegister = {
    companionPrefix: 'companion__',

    companion: {
        historyContainer: this.companionPrefix + 'companion__history-container',
        historyEntriesContainer: this.companionPrefix + 'history-entries-container'
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