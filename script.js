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

    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

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

        const assetKeys = Object.keys(assetsToLoad);
        const totalAssets = assetKeys.length;
        console.log("Начинаю загрузку", totalAssets, "ресурсов...");

        if (totalAssets === 0) {
            startGameBtn.disabled = false;
            loadingText.style.display = 'none';
            return;
        }

        assetKeys.forEach(name => {
            const img = new Image();
            img.src = assetsToLoad[name];
            console.log("Загружаю:", name, "из пути:", img.src);

            img.onload = () => {
                assetsLoaded++;
                textures[name] = img;
                console.log("УСПЕШНО ЗАГРУЖЕН:", name, `(${assetsLoaded}/${totalAssets})`);

                if (assetsLoaded === totalAssets) {
                    console.log("!!! ВСЕ РЕСУРСЫ УСПЕШНО ЗАГРУЖЕНЫ !!!");
                    startGameBtn.disabled = false;
                    loadingText.style.display = 'none';
                }
            };

            img.onerror = () => {
                console.error("!!! ОШИБКА ЗАГРУЗКИ РЕСУРСА:", name, "из пути:", img.src);
            };
        });
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
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
        ctx.fillStyle = '#888';
        ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

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
                distanceToWall += 0.05;
                const testX = Math.floor(player.x + eyeX * distanceToWall);
                const testY = Math.floor(player.y + eyeY * distanceToWall);

                if (map[testY] && map[testY][testX]) {
                    hitWall = true;
                    wallType = map[testY][testX];
                    zBuffer[i] = distanceToWall;

                    const dX = (player.x + eyeX * distanceToWall) - testX;
                    const dY = (player.y + eyeY * distanceToWall) - testY;

                    const dot = eyeX * 1 + eyeY * 0;
                    if(dX > 0.99 && dot < 0 || dX < 0.01 && dot > 0){
                        hitVertical = true;
                    }
                }
            }
            
            if (hitWall) {
                const correctedDist = distanceToWall * Math.cos(rayAngle - player.angle);
                const wallHeight = Math.min(screenHeight * 5, screenHeight / correctedDist);
                const wallTop = (screenHeight / 2) - wallHeight / 2;

                const wallX = hitVertical ? (player.y + eyeY * distanceToWall) : (player.x + eyeX * distanceToWall);
                let textureX = Math.floor((wallX - Math.floor(wallX)) * TILE_SIZE);

                const textureName = textureMap[wallType];
                const texture = textures[textureName];

                if (texture) {
                    ctx.drawImage(texture, textureX, 0, 1, TILE_SIZE, i, wallTop, 1, wallHeight);
                } else {
                    ctx.fillStyle = '#FF00FF';
                    ctx.fillRect(i, wallTop, 1, wallHeight);
                }

                const shade = 1 - Math.min(correctedDist / 15, 1);
                ctx.globalAlpha = shade;
                if(hitVertical) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(i, wallTop, 1, wallHeight);
                }
                ctx.globalAlpha = 1.0;
            }
        }

        sprites.sort((a, b) => {
            const distA = (player.x - a.x) * (player.x - a.x) + (player.y - a.y) * (player.y - a.y);
            const distB = (player.x - b.x) * (player.x - b.x) + (player.y - b.y) * (player.y - b.y);
            return distB - distA;
        });

        sprites.forEach(sprite => {
            const dx = sprite.x - player.x;
            const dy = sprite.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let spriteAngle = Math.atan2(dy, dx) - player.angle;
            if (spriteAngle < -Math.PI) spriteAngle += 2 * Math.PI;
            if (spriteAngle > Math.PI) spriteAngle -= 2 * Math.PI;

            const isVisible = Math.abs(spriteAngle) < player.fov / 2 + 0.3;

            if (isVisible && dist > 0.5) {
                const correctedDist = dist * Math.cos(spriteAngle);
                const spriteHeight = Math.min(screenHeight * 5, screenHeight / correctedDist);
                const spriteWidth = spriteHeight;
                const spriteTop = (screenHeight / 2) - spriteHeight / 2;
                const spriteScreenX = (screenWidth / 2) + Math.tan(spriteAngle) * (screenWidth / 2);
                const spriteLeft = spriteScreenX - spriteWidth / 2;

                const texture = textures[sprite.texture];
                if (texture) {
                    for (let i = 0; i < spriteWidth; i++) {
                        const screenX = Math.floor(spriteLeft + i);
                        if (screenX >= 0 && screenX < screenWidth && zBuffer[screenX] > dist) {
                            const textureX = Math.floor(i / spriteWidth * TILE_SIZE);
                            
                            const shade = 1 - Math.min(dist / 15, 1);
                            ctx.globalAlpha = shade;
                            ctx.drawImage(texture, textureX, 0, 1, TILE_SIZE, screenX, spriteTop, 1, spriteHeight);
                            ctx.globalAlpha = 1.0;

                            if (sprite.health < 100) {
                                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                                ctx.fillRect(screenX, spriteTop, 1, spriteHeight);
                            }
                        }
                    }
                }
            }
        });
    }

    showScreen(mainMenu);
    loadAssets();
    setupControls();

    startGameBtn.addEventListener('click', () => { showScreen(gameContainer); startGame(); });
    exitGameBtn.addEventListener('click', () => { stopGame(); showScreen(mainMenu); });
});