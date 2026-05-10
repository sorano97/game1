// 星あつめナイト ゲーム本体
// 初心者向けにコメント多め

// ゲームの状態を管理するオブジェクト
const gameState = {
    screen: "title", // 現在の画面
    score: 0,        // スコア
    timeLeft: 30,    // 残り時間
    items: [],       // 落下中アイテム
    isPlaying: false,
    isPaused: false,
    lastSpawnTime: 0,
    spawnInterval: 800,
    animationId: null,
    timerId: null
};

// アイテムの種類データ
const itemTypes = [
    { id: "star", label: "★", name: "星", score: 10, speed: 2.5, className: "item-star", weight: 45 },
    { id: "ramune", label: "○", name: "ラムネ", score: 30, speed: 2.2, className: "item-ramune", weight: 25 },
    { id: "bell", label: "♪", name: "鈴", score: 50, speed: 3.0, className: "item-bell", weight: 10 },
    { id: "stone", label: "■", name: "石", score: -20, speed: 3.2, className: "item-stone", weight: 15 },
    { id: "shadow", label: "●", name: "黒い影", score: -50, speed: 2.8, className: "item-shadow", weight: 5 }
];

// 初期化処理
function init() {
    showScreen("title");
    createStarsBackground();
    setupEventListeners();
}

// 画面切り替え
function showScreen(screenName) {
    gameState.screen = screenName;
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById(`${screenName}-screen`).classList.remove("hidden");
}

// イベントリスナー設定
function setupEventListeners() {
    document.getElementById("start-button").onclick = () => { startGame(); };
    document.getElementById("howto-button").onclick = () => { showScreen("howto"); };
    document.getElementById("howto-start-button").onclick = () => { startGame(); };
    document.getElementById("back-title-button").onclick = () => { showScreen("title"); };
    document.getElementById("pause-button").onclick = () => { pauseGame(); };
    document.getElementById("resume-button").onclick = () => { resumeGame(); };
    document.getElementById("pause-title-button").onclick = () => { resetGame(); showScreen("title"); };
    document.getElementById("retry-button").onclick = () => { startGame(); };
    document.getElementById("result-title-button").onclick = () => { resetGame(); showScreen("title"); };
    // スマホでダブルタップ拡大防止
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}

// ゲーム開始
function startGame() {
    resetGame();
    showScreen("game");
    gameState.isPlaying = true;
    gameState.isPaused = false;
    updateHud();
    startTimer();
    gameState.lastSpawnTime = performance.now();
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// ゲームリセット
function resetGame() {
    gameState.score = 0;
    gameState.timeLeft = 30;
    gameState.items = [];
    gameState.isPlaying = false;
    gameState.isPaused = false;
    gameState.lastSpawnTime = 0;
    gameState.spawnInterval = 800;
    if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
    if (gameState.timerId) clearInterval(gameState.timerId);
    clearPlayArea();
    updateHud();
}

// ゲーム終了
function endGame() {
    gameState.isPlaying = false;
    if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
    if (gameState.timerId) clearInterval(gameState.timerId);
    clearPlayArea();
    showResult();
}

// 一時停止
function pauseGame() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    gameState.isPaused = true;
    document.getElementById("pause-panel").classList.remove("hidden");
}
// 再開
function resumeGame() {
    if (!gameState.isPlaying || !gameState.isPaused) return;
    gameState.isPaused = false;
    document.getElementById("pause-panel").classList.add("hidden");
}

// タイマー開始
function startTimer() {
    gameState.timerId = setInterval(() => {
        if (!gameState.isPaused && gameState.isPlaying) {
            gameState.timeLeft--;
            updateHud();
            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

// メインループ
function gameLoop(timestamp) {
    if (!gameState.isPlaying) return;
    if (!gameState.isPaused) {
        updateSpawnInterval();
        updateItems();
        maybeSpawnItem(timestamp);
    }
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// アイテム出現間隔調整
function updateSpawnInterval() {
    if (gameState.timeLeft <= 10) {
        gameState.spawnInterval = 450;
    } else if (gameState.timeLeft <= 20) {
        gameState.spawnInterval = 600;
    } else {
        gameState.spawnInterval = 800;
    }
}

// アイテム出現判定
function maybeSpawnItem(timestamp) {
    if (timestamp - gameState.lastSpawnTime > gameState.spawnInterval) {
        spawnItem();
        gameState.lastSpawnTime = timestamp;
    }
}

// アイテム生成
function spawnItem() {
    const type = selectRandomItemType();
    const playArea = document.getElementById("play-area");
    const areaWidth = playArea.offsetWidth;
    // 画面端に近すぎないようにx座標を決定
    const x = Math.random() * (areaWidth - 60) + 20;
    const itemId = "item_" + Date.now() + Math.floor(Math.random() * 1000);
    const item = {
        id: itemId,
        type: type.id,
        x: x,
        y: -48,
        speed: type.speed,
        score: type.score,
        label: type.label,
        className: type.className
    };
    gameState.items.push(item);
    // DOM要素生成
    const el = document.createElement("div");
    el.className = `item ${type.className}`;
    el.textContent = type.label;
    el.style.left = `${x}px`;
    el.style.top = `-48px`;
    el.style.width = "48px";
    el.style.height = "48px";
    el.setAttribute("data-id", itemId);
    // タップ/クリックイベント
    el.addEventListener("pointerdown", (e) => {
        handleItemTap(itemId, e);
    });
    playArea.appendChild(el);
}

// アイテム種類を重み付きランダムで選ぶ
function selectRandomItemType() {
    const total = itemTypes.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * total;
    for (const t of itemTypes) {
        if (r < t.weight) return t;
        r -= t.weight;
    }
    return itemTypes[0];
}

// アイテム移動・削除
function updateItems() {
    const playArea = document.getElementById("play-area");
    const areaHeight = playArea.offsetHeight;
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        item.y += item.speed;
        const el = playArea.querySelector(`[data-id='${item.id}']`);
        if (el) {
            el.style.top = `${item.y}px`;
        }
        // 画面下に到達したら削除
        if (item.y > areaHeight) {
            removeItem(item.id);
        }
    }
}

// アイテム削除
function removeItem(itemId) {
    const idx = gameState.items.findIndex(it => it.id === itemId);
    if (idx !== -1) gameState.items.splice(idx, 1);
    const el = document.getElementById("play-area").querySelector(`[data-id='${itemId}']`);
    if (el) el.remove();
}

// アイテムタップ処理
function handleItemTap(itemId, event) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    const idx = gameState.items.findIndex(it => it.id === itemId);
    if (idx === -1) return; // すでに消えていたら無視
    const item = gameState.items[idx];
    // スコア加算
    gameState.score += item.score;
    updateHud();
    // ポップアップ演出
    const rect = event.target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    showScorePopup(x, y, item.score);
    // 減点なら画面フラッシュ
    if (item.score < 0) flashDanger();
    // アイテム削除
    removeItem(itemId);
}

// スコアポップアップ表示
function showScorePopup(x, y, score) {
    const popup = document.createElement("div");
    popup.className = "score-popup " + (score > 0 ? "score-plus" : "score-minus");
    popup.textContent = (score > 0 ? "+" : "") + score;
    popup.style.left = `${x - 24}px`;
    popup.style.top = `${y - 24}px`;
    document.body.appendChild(popup);
    setTimeout(() => { popup.remove(); }, 600);
}

// 減点時の画面フラッシュ
function flashDanger() {
    const app = document.getElementById("app");
    app.classList.add("flash-danger");
    setTimeout(() => { app.classList.remove("flash-danger"); }, 300);
}

// HUD更新
function updateHud() {
    document.getElementById("time-label").textContent = `TIME: ${gameState.timeLeft}`;
    document.getElementById("score-label").textContent = `SCORE: ${gameState.score}`;
}

// プレイエリアのアイテム全削除
function clearPlayArea() {
    const playArea = document.getElementById("play-area");
    playArea.innerHTML = "";
}

// ランク判定
function getRank(score) {
    if (score >= 500) return "S";
    if (score >= 300) return "A";
    if (score >= 150) return "B";
    return "C";
}

// 結果データ取得
function getResultData(score) {
    const rank = getRank(score);
    let title = "RESULT";
    let comment = "";
    if (rank === "S") {
        title = "大成功！";
        comment = "夜空いっぱいの星を集めた！\n小さな神さまもびっくりしている";
    } else if (rank === "A") {
        title = "クリア！";
        comment = "きれいな夜の思い出が集まった\nまた明日も歩きたくなる夜だった";
    } else if (rank === "B") {
        title = "もう少し！";
        comment = "あと少しで夜空がもっと明るくなりそう\nもう一度チャレンジしてみよう";
    } else {
        title = "ゲームオーバー";
        comment = "夜道はまだ少し暗いまま\n次は星をたくさん集めよう";
    }
    return { rank, title, comment };
}

// 結果画面表示
function showResult() {
    showScreen("result");
    document.getElementById("final-score").textContent = `SCORE: ${gameState.score}`;
    const result = getResultData(gameState.score);
    document.getElementById("result-title").textContent = result.title;
    document.getElementById("rank-label").textContent = `RANK: ${result.rank}`;
    document.getElementById("result-comment").textContent = result.comment;
}

// 背景の星を生成
function createStarsBackground() {
    let bg = document.querySelector('.stars-bg');
    if (bg) bg.remove();
    bg = document.createElement('div');
    bg.className = 'stars-bg';
    const n = 24 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
        const star = document.createElement('div');
        star.className = 'star-dot';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.animationDelay = `${Math.random() * 2.5}s`;
        bg.appendChild(star);
    }
    document.getElementById('app').appendChild(bg);
}

// ページ読み込み時に初期化
window.onload = init;
