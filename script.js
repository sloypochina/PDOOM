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
        'doom_wall_metal': 'assets/doom_wall_metal.png',
        'doom_wall_tech': 'assets/doom_wall_tech.png',
        'doom_wall_exit': 'assets/doom_wall_exit.png',
        'enemy_soldier': 'assets/enemy_soldier.png',
        'enemy_imp': 'assets/enemy_imp.png',
        'barrel': 'assets/barrel.png',
        'health_potion': 'assets/health_potion.png'
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
            img.onerror = () => { console.error("!!! ОШИБКА ЗАГРУЗКИ РЕСУРСА:", name, "из пути:", img.src); };
        });
    }

    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 2, 2, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 2, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    const textureMap = { '1': 'doom_wall_tech', '2': 'doom_wall_metal', '3': 'doom_wall_exit' };
    
    let sprites = [];
    function resetGame() {
        player.x = 1.5; player.y = 1.5; player.angle = 0.7; player.health = 100;
        sprites = [
            { type: 'enemy', x: 3.5, y: 3.5, texture: 'enemy_soldier', health: 60 },
            { type: 'enemy', x: 2.5, y: 6.5, texture: 'enemy_soldier', health: 60 },
            { type: 'barrel', x: 8.5, y: 5.5, texture: 'barrel', health: 20 },
            { type: 'enemy', x: 9.5, y: 8.5, texture: 'enemy_imp', health: 100 },
            { type: 'enemy', x: 12.5, y: 1.5, texture: 'enemy_imp', health: 100 },
            { type: 'enemy', x: 14.5, y: 10.5, texture: 'enemy_soldier', health: 60 },
            { type: 'health', x: 14.5, y: 8.5, texture: 'health_potion', amount: 50 }
        ];
    }
    
    const player = { x: 1.5, y: 1.5, angle: 0.7, fov: Math.PI / 3, speed: 0.05, rotationSpeed: 0.05, health: 100, maxHealth: 100 };
    const keys = {};
    let shootCooldown = 0;

    function explode(barrel) {
        const explosionRadius = 2.0;
        sprites.forEach(sprite => {
            if (sprite === barrel) return;
            const dx = sprite.x - barrel.x;
            const dy = sprite.y - barrel.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < explosionRadius && sprite.type === 'enemy') {
                sprite.health -= 60;
            }
        });
        const dxPlayer = player.x - barrel.x;
        const dyPlayer = player.y - barrel.y;
        if (Math.sqrt(dxPlayer*dxPlayer + dyPlayer*dyPlayer) < explosionRadius) {
            player.health -= 40;
        }
        sprites = sprites.filter(s => s !== barrel);
    }

    function shoot() {
        if (shootCooldown > 0) return;
        shootCooldown = 20;
        weaponImg.classList.add('shooting');
        setTimeout(() => weaponImg.classList.remove('shooting'), 100);

        const rayAngle = player.angle;
        let distance = 0;
        const step = 0.1;
        while (distance < 20) {
            distance += step;
            const testX = player.x + Math.cos(rayAngle) * distance;
            const testY = player.y + Math.sin(rayAngle) * distance;
            if (map[Math.floor(testY)][Math.floor(testX)] != 0) break;
            for (let sprite of sprites) {
                const dx = sprite.x - testX;
                const dy = sprite.y - testY;
                if (Math.sqrt(dx*dx + dy*dy) < 0.4) {
                    if (sprite.type === 'enemy' || sprite.type === 'barrel') {
                        sprite.health -= 30;
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
        if (isTouchDevice) mobileControls.style.display = 'flex';
        const controlMap = { 'btn-up': 'KeyW', 'btn-down': 'KeyS', 'btn-left': 'KeyQ', 'btn-right': 'KeyE', 'btn-strafe-left': 'KeyA', 'btn-strafe-right': 'KeyD', 'btn-shoot': 'KeyF' };
        for (const btnId in controlMap) {
            const btn = document.getElementById(btnId);
            const key = controlMap[btnId];
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); if (key === 'KeyF') shoot(); else keys[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); if (key !== 'KeyF') keys[key] = false; });
        }
    }

    function startGame() {
        resetGame();
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

        sprites.forEach(sprite => {
            if(sprite.health <= 0) {
                if(sprite.type === 'barrel') explode(sprite);
            }
        });
        sprites = sprites.filter(s => s.health > 0 || s.type === 'health');
        
        const moveX_dir = Math.cos(player.angle);
        const moveY_dir = Math.sin(player.angle);
        const strafeX_dir = Math.cos(player.angle - Math.PI / 2);
        const strafeY_dir = Math.sin(player.angle - Math.PI / 2);
        let moveX = 0, moveY = 0;
        if (keys['KeyW']) { moveX += moveX_dir * player.speed; moveY += moveY_dir * player.speed; }
        if (keys['KeyS']) { moveX -= moveX_dir * player.speed; moveY -= moveY_dir * player.speed; }
        if (keys['KeyA']) { moveX += strafeX_dir * player.speed; moveY += strafeY_dir * player.speed; }
        if (keys['KeyD']) { moveX -= strafeX_dir * player.speed; moveY -= strafeY_dir * player.speed; }
        if (keys['KeyQ']) player.angle -= player.rotationSpeed;
        if (keys['KeyE']) player.angle += player.rotationSpeed;

        const nextPlayerX = player.x + moveX;
        const nextPlayerY = player.y + moveY;
        if (map[Math.floor(nextPlayerY)][Math.floor(nextPlayerX)] == 0) {
            player.x = nextPlayerX;
            player.y = nextPlayerY;
        }

        sprites.forEach(sprite => {
            if(sprite.type === 'health') {
                const dx = player.x - sprite.x;
                const dy = player.y - sprite.y;
                if(Math.sqrt(dx*dx + dy*dy) < 0.5) {
                    player.health = Math.min(player.maxHealth, player.health + sprite.amount);
                    sprites = sprites.filter(s => s !== sprite);
                }
            }
        });

        if (player.health <= 0) {
            alert("ВЫ ПОГИБЛИ!");
            stopGame();
            showScreen(mainMenu);
        }
    }
    
    function render() {
        ctx.fillStyle = '#3a241c';
        ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
        ctx.fillStyle = '#694a38';
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
                    if(dX > 0.99 && dot < 0 || dX < 0.01 && dot > 0) hitVertical = true;
                }
            }
            if (hitWall) {
                const correctedDist = distanceToWall * Math.cos(rayAngle - player.angle);
                const wallHeight = Math.min(screenHeight * 5, screenHeight / correctedDist);
                const wallTop = (screenHeight / 2) - wallHeight / 2;
                const wallX = hitVertical ? (player.y + eyeY * distanceToWall) : (player.x + eyeX * distanceToWall);
                let textureX = Math.floor((wallX - Math.floor(wallX)) * TILE_SIZE);
                const texture = textures[textureMap[wallType]];
                if (texture) ctx.drawImage(texture, textureX, 0, 1, TILE_SIZE, i, wallTop, 1, wallHeight);
                const shade = 1 - Math.min(correctedDist / 15, 1);
                ctx.globalAlpha = shade;
                if(hitVertical) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(i, wallTop, 1, wallHeight); }
                ctx.globalAlpha = 1.0;
            }
        }
        
        sprites.sort((a, b) => ((player.x - b.x)**2 + (player.y - b.y)**2) - ((player.x - a.x)**2 + (player.y - a.y)**2));
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
                            if (sprite.type === 'enemy' && sprite.health < (sprite.texture==='enemy_imp'?100:60)) {
                                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                                ctx.fillRect(screenX, spriteTop, 1, spriteHeight);
                            }
                        }
                    }
                }
            }
        });

        const healthBarWidth = 100;
        const healthBarHeight = 10;
        const currentHealthWidth = (player.health / player.maxHealth) * healthBarWidth;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, screenHeight - 25, healthBarWidth + 10, healthBarHeight + 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(15, screenHeight - 20, currentHealthWidth, healthBarHeight);
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(`ЗДОРОВЬЕ`, 20, screenHeight - 28);
    }

    showScreen(mainMenu);
    loadAssets();
    setupControls();

    startGameBtn.addEventListener('click', () => { showScreen(gameContainer); startGame(); });
    exitGameBtn.addEventListener('click', () => { stopGame(); showScreen(mainMenu); });
});