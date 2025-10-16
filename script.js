document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const mainMenu = document.getElementById('mainMenu');
    const loadingText = document.getElementById('loadingText');
    const startGameBtn = document.getElementById('startGameBtn');
    const gameContainer = document.getElementById('gameContainer');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const weaponImg = document.getElementById('weapon');
    const exitGameBtn = document.getElementById('exitGameBtn');
    const mobileControls = document.getElementById('mobile-controls');

    let gameLoopId = null;
    const screenWidth = 320;
    const screenHeight = 180;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const TILE_SIZE = 64;

    const textures = {};
    const assetsToLoad = {
        'wall_brick': 'assets/wall_brick.png',
        'wall_stone': 'assets/wall_stone.png',
        'enemy_soldier': 'assets/enemy_soldier.png'
    };
    let assetsLoaded = 0;

    function loadAssets() {
        startGameBtn.disabled = true;
        loadingText.style.display = 'block';

        for (const name in assetsToLoad) {
            const img = new Image();
            img.src = assetsToLoad[name];
            img.onload = () => {
                assetsLoaded++;
                textures[name] = img;
                if (assetsLoaded === Object.keys(assetsToLoad).length) {
                    startGameBtn.disabled = false;
                    loadingText.style.display = 'none';
                }
            };
        }
    }

    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
        [1, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 2, 0, 0, 0, 0, 2, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    ];
    const textureMap = { '1': 'wall_brick', '2': 'wall_stone' };
    
    let sprites = [];
    function resetSprites() {
        sprites = [
            { x: 3.5, y: 5.5, texture: 'enemy_soldier', health: 100 },
            { x: 8.5, y: 2.5, texture: 'enemy_soldier', health: 100 },
        ];
    }
    
    const player = { x: 2.5, y: 2.5, angle: Math.PI / 4, fov: Math.PI / 3, speed: 0.05, rotationSpeed: 0.05 };
    const keys = {};
    let shootCooldown = 0;

    function shoot() {
        if (shootCooldown > 0) return;
        shootCooldown = 30;
        weaponImg.classList.add('shooting');
        setTimeout(() => weaponImg.classList.remove('shooting'), 100);

        const rayAngle = player.angle;
        let distance = 0;
        const step = 0.1;
        const eyeX = Math.cos(rayAngle);
        const eyeY = Math.sin(rayAngle);
        while (distance < 20) {
            distance += step;
            const testX = player.x + eyeX * distance;
            const testY = player.y + eyeY * distance;
            if (map[Math.floor(testY)][Math.floor(testX)] != 0) break;
            for (let sprite of sprites) {
                const dx = sprite.x - testX;
                const dy = sprite.y - testY;
                if (Math.sqrt(dx*dx + dy*dy) < 0.5) {
                    sprite.health -= 50;
                    if (sprite.health <= 0) {
                        sprites = sprites.filter(s => s !== sprite);
                    }
                    return;
                }
            }
        }
    }

    function setupControls() {
        document.addEventListener('keydown', (e) => keys[e.code] = true);
        document.addEventListener('keyup', (e) => keys[e.code] = false);
        document.addEventListener('keydown', (e) => { if (e.code === 'KeyF') shoot(); });

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouchDevice) {
            mobileControls.style.display = 'flex';
        }

        const controlMap = {
            'btn-up': 'KeyW', 'btn-down': 'KeyS',
            'btn-left': 'KeyQ', 'btn-right': 'KeyE',
            'btn-strafe-left': 'KeyA', 'btn-strafe-right': 'KeyD',
            'btn-shoot': 'KeyF'
        };

        for (const btnId in controlMap) {
            const btn = document.getElementById(btnId);
            const key = controlMap[btnId];
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (key === 'KeyF') { shoot(); } else { keys[key] = true; }
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (key !== 'KeyF') { keys[key] = false; }
            });
        }
    }

    function startGame() {
        resetSprites();
        if (!gameLoopId) gameLoopId = requestAnimationFrame(gameLoop);
    }
    function stopGame() {
        if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null; }
    }
    function gameLoop() {
        update();
        render();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    function update() {
        if (shootCooldown > 0) shootCooldown--;
        let moveX = 0, moveY = 0;
        if (keys['KeyW']) { moveX += Math.cos(player.angle) * player.speed; moveY += Math.sin(player.angle) * player.speed; }
        if (keys['KeyS']) { moveX -= Math.cos(player.angle) * player.speed; moveY -= Math.sin(player.angle) * player.speed; }
        if (keys['KeyA']) { moveX += Math.cos(player.angle - Math.PI / 2) * player.speed; moveY += Math.sin(player.angle - Math.PI / 2) * player.speed; }
        if (keys['KeyD']) { moveX += Math.cos(player.angle + Math.PI / 2) * player.speed; moveY += Math.sin(player.angle + Math.PI / 2) * player.speed; }
        if (keys['KeyQ']) player.angle -= player.rotationSpeed;
        if (keys['KeyE']) player.angle += player.rotationSpeed;
        if (map[Math.floor(player.y + moveY)][Math.floor(player.x + moveX)] == 0) { player.x += moveX; player.y += moveY; }
    }

    function render() {
        ctx.clearRect(0, 0, screenWidth, screenHeight);
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
        ctx.fillStyle = '#888';
        ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

        let objectsToRender = [];
        let zBuffer = new Array(screenWidth).fill(Infinity);

        for (let i = 0; i < screenWidth; i++) {
            const rayAngle = (player.angle - player.fov / 2) + (i / screenWidth) * player.fov;
            let distanceToWall = 0;
            let hitWall = false;
            let wallType = 0;
            let hitVertical = false;

            const eyeX = Math.cos(rayAngle);
            const eyeY = Math.sin(rayAngle);

            while (!hitWall && distanceToWall < 20) {
                distanceToWall += 0.1;
                const testX = Math.floor(player.x + eyeX * distanceToWall);
                const testY = Math.floor(player.y + eyeY * distanceToWall);

                if (map[testY] && map[testY][testX]) {
                    hitWall = true;
                    wallType = map[testY][testX];
                    zBuffer[i] = distanceToWall;

                    const wallX = player.x + eyeX * distanceToWall;
                    const wallY = player.y + eyeY * distanceToWall;
                    let textureX = Math.floor((wallX - Math.floor(wallX)) * TILE_SIZE);
                    if (Math.abs(eyeY) > Math.abs(eyeX)) {
                        textureX = Math.floor((wallX - Math.floor(wallX)) * TILE_SIZE);
                    } else {
                        textureX = Math.floor((wallY - Math.floor(wallY)) * TILE_SIZE);
                        hitVertical = true;
                    }

                    objectsToRender.push({
                        type: 'wall', x: i, dist: distanceToWall,
                        textureName: textureMap[wallType],
                        textureX: textureX,
                        isVertical: hitVertical
                    });
                }
            }
        }
        
        sprites.forEach(sprite => {
            const dx = sprite.x - player.x;
            const dy = sprite.y - player.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const spriteAngle = Math.atan2(dy, dx) - player.angle;

            if (Math.abs(spriteAngle) < player.fov / 2 + 0.5) {
                 objectsToRender.push({ type: 'sprite', dist: dist, textureName: sprite.texture, spriteAngle: spriteAngle, spriteRef: sprite });
            }
        });

        objectsToRender.sort((a, b) => b.dist - a.dist);

        objectsToRender.forEach(obj => {
            const correctedDist = obj.dist * Math.cos(obj.type === 'wall' ? (player.angle - obj.angle) : obj.spriteAngle);
            const projectionHeight = Math.min(screenHeight * 2, screenHeight / correctedDist);
            const y = (screenHeight / 2) - projectionHeight / 2;

            ctx.globalAlpha = Math.max(0.2, 1 - (obj.dist / 10));

            if (obj.type === 'wall') {
                const texture = textures[obj.textureName];
                ctx.drawImage(texture, obj.textureX, 0, 1, TILE_SIZE, obj.x, y, 1, projectionHeight);
                if (obj.isVertical) {
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.fillRect(obj.x, y, 1, projectionHeight);
                }
            } else if (obj.type === 'sprite') {
                const spriteScreenX = (screenWidth / 2) + Math.tan(obj.spriteAngle) * (screenWidth/2);
                const spriteWidth = projectionHeight;
                const spriteX = spriteScreenX - spriteWidth / 2;

                for (let i = 0; i < spriteWidth; i++) {
                    const screenX = Math.floor(spriteX + i);
                    if (screenX >= 0 && screenX < screenWidth) {
                        if (zBuffer[screenX] > obj.dist) {
                             const texture = textures[obj.textureName];
                             ctx.drawImage(texture, i / spriteWidth * TILE_SIZE, 0, 1, TILE_SIZE, screenX, y, 1, projectionHeight);
                             if(obj.spriteRef.health < 100){
                                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                                ctx.fillRect(screenX, y, 1, projectionHeight);
                             }
                        }
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        });
    }

    showScreen(mainMenu);
    loadAssets();
    setupControls();

    startGameBtn.addEventListener('click', () => { showScreen(gameContainer); startGame(); });
    exitGameBtn.addEventListener('click', () => { stopGame(); showScreen(mainMenu); });
});