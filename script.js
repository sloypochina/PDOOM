document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready(); 
    tg.expand(); 

    const mainMenu = document.getElementById('mainMenu');
    const settingsMenu = document.getElementById('settingsMenu');
    const gameContainer = document.getElementById('gameContainer');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startGameBtn = document.getElementById('startGameBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const exitGameBtn = document.getElementById('exitGameBtn');
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    startGameBtn.addEventListener('click', () => {
        showScreen(gameContainer);
        startGame(); 
    });
    settingsBtn.addEventListener('click', () => showScreen(settingsMenu));
    backToMenuBtn.addEventListener('click', () => showScreen(mainMenu));
    exitGameBtn.addEventListener('click', () => {
        stopGame(); 
        showScreen(mainMenu);
    });


    let gameLoopId = null; 
    const screenWidth = 320; 
    const screenHeight = 180;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 0, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    const player = {
        x: 1.5, 
        y: 1.5,
        angle: 0, 
        fov: Math.PI / 3, 
        speed: 0.05,
        rotationSpeed: 0.05
    };

    const keys = {};
    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);

    function startGame() {
        if (!gameLoopId) { 
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }
    function stopGame() {
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
    }
    function gameLoop() {
        update(); 
        render(); 
        gameLoopId = requestAnimationFrame(gameLoop); 
    }

    function update() {
        let newX = player.x;
        let newY = player.y;

        if (keys['KeyQ'] || keys['ArrowLeft']) player.angle -= player.rotationSpeed;
        if (keys['KeyE'] || keys['ArrowRight']) player.angle += player.rotationSpeed;

        if (keys['KeyW'] || keys['ArrowUp']) {
            newX += Math.cos(player.angle) * player.speed;
            newY += Math.sin(player.angle) * player.speed;
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
            newX -= Math.cos(player.angle) * player.speed;
            newY -= Math.sin(player.angle) * player.speed;
        }
        if (map[Math.floor(newY)][Math.floor(newX)] == 0) {
            player.x = newX;
            player.y = newY;
        }
    }

    function render() {

        ctx.fillStyle = '#333'; 
        ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
        ctx.fillStyle = '#666'; 
        ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

        for (let i = 0; i < screenWidth; i++) {
            const rayAngle = (player.angle - player.fov / 2) + (i / screenWidth) * player.fov;
            let distanceToWall = 0;
            let hitWall = false;
            const step = 0.1; 

            const eyeX = Math.cos(rayAngle); 
            const eyeY = Math.sin(rayAngle);

            while (!hitWall && distanceToWall < 20) {
                distanceToWall += step;
                const testX = Math.floor(player.x + eyeX * distanceToWall);
                const testY = Math.floor(player.y + eyeY * distanceToWall);

                if (testX < 0 || testX >= map[0].length || testY < 0 || testY >= map.length) {
                    hitWall = true; 
                    distanceToWall = 20;
                } else if (map[testY][testX] == 1) {
                    hitWall = true; 
                }
            }
            
            const correctedDist = distanceToWall * Math.cos(rayAngle - player.angle);

            const wallHeight = screenHeight / correctedDist;

            const wallTop = (screenHeight / 2) - wallHeight / 2;

            const shade = 1 - (correctedDist / 10);
            ctx.fillStyle = `rgba(0, 150, 150, ${shade})`;

            ctx.fillRect(i, wallTop, 1, wallHeight);
        }
    }

    showScreen(mainMenu);
});