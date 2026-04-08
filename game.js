/**
 * Coin Toss Game - Main Game Logic
 * Three.js rendering + Cannon.js physics
 */

// Rendering
let scene, camera, renderer;
let coinMesh;

// Game objects
let coinPhysics;
let enemy;

// Game state
let gameState = {
  round: 1,
  hp: 100,
  maxHp: 100,
  gold: 0,
  damageDealt: 0,
  selectedSkill: null,
  isWaiting: false,
};

let lastTime = Date.now();

/**
 * Initialize game
 */
function initGame() {
  console.log('🎮 Initializing game...');

  try {
    // Physics
    initPhysics();
    console.log('✓ Physics initialized');

    // Three.js scene
    setupThreeJS();
    console.log('✓ Three.js scene setup');

    // Game objects
    coinPhysics = new CoinPhysics();
    enemy = new Enemy();
    console.log('✓ Game objects created');

    // Events
    window.addEventListener('resize', onWindowResize);

    // Start render loop
    console.log('✓ Starting animation loop');
    animate();
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
}

/**
 * Setup Three.js scene
 */
function setupThreeJS() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  console.log(`Setting up Three.js: ${width}x${height}, DPR: ${dpr}`);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2a3a);
  scene.fog = new THREE.Fog(0x2a2a3a, 50, 100);

  // Camera
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  // Renderer
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('❌ Canvas element not found!');
    return;
  }

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    precision: 'highp'
  });

  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;

  console.log('✓ Renderer created:', renderer.domElement.width, 'x', renderer.domElement.height);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  console.log('✓ Lights added');

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a6a4a,
    roughness: 0.8,
    emissive: 0x222222
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid
  const grid = new THREE.GridHelper(30, 30, 0x555555, 0x333333);
  grid.position.y = 0.01;
  scene.add(grid);

  console.log('✓ Ground and grid added');

  // Coin mesh
  createCoinMesh();

  console.log('✓ Three.js setup complete');
}

/**
 * Create coin mesh
 */
function createCoinMesh() {
  if (coinMesh) scene.remove(coinMesh);

  const geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.9, roughness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0xddaa00, metalness: 0.7, roughness: 0.3 }),
  ];

  coinMesh = new THREE.Mesh(geometry, materials);
  coinMesh.castShadow = true;
  coinMesh.receiveShadow = true;
  scene.add(coinMesh);
}

/**
 * Start new game
 */
function startGame() {
  document.getElementById('title-screen').classList.add('hidden');

  gameState = {
    round: 1,
    hp: 100,
    maxHp: 100,
    gold: 0,
    damageDealt: 0,
    selectedSkill: null,
    isWaiting: false,
  };

  if (coinPhysics) coinPhysics.destroy();
  coinPhysics = new CoinPhysics();
  enemy.reset();

  updateUI();
  showSkillSelection();
}

/**
 * Show skill selection
 */
function showSkillSelection() {
  gameState.isWaiting = false;

  const skills = getRandomSkills(3);
  const grid = document.getElementById('skill-grid');
  grid.innerHTML = '';

  skills.forEach((skill) => {
    const btn = document.createElement('button');
    btn.className = 'skill-button';
    btn.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-name">${skill.name}</div>
      <div class="skill-desc">${skill.description}</div>
    `;
    btn.onclick = () => selectSkill(skill);
    grid.appendChild(btn);
  });

  document.getElementById('skill-panel').classList.remove('hidden');
  document.getElementById('status-text').textContent =
    'スキルを選択してコインをトス';
}

/**
 * Select skill and toss coin
 */
function selectSkill(skill) {
  console.log('🎲 Selected skill:', skill.name);

  gameState.selectedSkill = skill;
  gameState.isWaiting = true;

  document.getElementById('skill-panel').classList.add('hidden');
  document.getElementById('status-text').textContent = `${skill.name}を発動...`;

  if (!coinPhysics) {
    console.error('❌ coinPhysics not initialized!');
    return;
  }

  console.log('🪙 Flipping coin...');
  coinPhysics.flip();

  // Wait for coin to land
  const checkLand = setInterval(() => {
    if (coinPhysics.isLanded) {
      console.log('✓ Coin landed:', coinPhysics.landedSide);
      clearInterval(checkLand);
      setTimeout(showResult, 500);
    }
  }, 50);

  // Safety timeout
  setTimeout(() => {
    if (!coinPhysics.isLanded) {
      console.warn('⚠ Timeout: forcing coin to settle');
      coinPhysics.settleOnGround();
      showResult();
    }
  }, 8000);
}

/**
 * Show coin result
 */
function showResult() {
  const result = coinPhysics.getResult();
  const skill = gameState.selectedSkill;

  const effect = applySkillEffect(skill, gameState, result);

  if (effect.damage > 0) {
    gameState.damageDealt += effect.damage;
  }

  document.getElementById('result-icon').textContent = result ? '✅ 表' : '❌ 裏';
  document.getElementById('result-title').textContent = skill.name;

  let msg = effect.message;
  if (effect.damage > 0) {
    msg += `\n敵に${effect.damage}ダメージ！`;
  }
  document.getElementById('result-message').textContent = msg;

  document.getElementById('result-panel').classList.add('show');

  // Enemy attack
  const enemyDamage = 15 + gameState.round * 2;
  gameState.hp -= Math.max(1, enemyDamage);
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);

  if (gameState.hp <= 0) {
    setTimeout(gameOver, 1500);
  }
}

/**
 * Next round
 */
function nextRound() {
  document.getElementById('result-panel').classList.remove('show');

  gameState.round++;
  gameState.gold += 10;

  if (gameState.round % 5 === 0) {
    gameState.maxHp += 50;
    gameState.hp = Math.min(gameState.hp + 50, gameState.maxHp);
  }

  gameState.hp = Math.min(gameState.hp, gameState.maxHp);

  updateUI();
  showSkillSelection();
}

/**
 * Game over
 */
function gameOver() {
  document.getElementById('final-round').textContent = gameState.round;
  document.getElementById('final-gold').textContent = gameState.gold;
  document.getElementById('final-damage').textContent = gameState.damageDealt;
  document.getElementById('gameover-screen').classList.add('show');
}

/**
 * Back to title
 */
function backToTitle() {
  document.getElementById('gameover-screen').classList.remove('show');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('skill-panel').classList.add('hidden');
}

/**
 * Update UI
 */
function updateUI() {
  document.getElementById('round').textContent = gameState.round;
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);
  document.getElementById('gold').textContent = gameState.gold;
}

/**
 * Window resize
 */
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(dpr, 2));
}

/**
 * Animation loop
 */
function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const delta = Math.min((now - lastTime) / 1000, 0.016);
  lastTime = now;

  // Step physics
  if (world) {
    world.step(1 / 60, delta, 3);
  }

  // Update coin
  if (coinPhysics) {
    coinPhysics.update(delta);

    const pos = coinPhysics.getPosition();
    const rot = coinPhysics.getRotation();

    coinMesh.position.set(pos.x, pos.y, pos.z);
    coinMesh.rotation.x = rot.x;
    coinMesh.rotation.y = rot.y;
    coinMesh.rotation.z = rot.z;
  }

  // Render
  renderer.render(scene, camera);
}

/**
 * Initialize on page load
 */
function setupGameWhenReady() {
  console.log('📄 DOM ready, starting game initialization...');

  // Wait a bit for libraries to load
  if (typeof THREE === 'undefined' || typeof CANNON === 'undefined') {
    console.warn('⚠ Libraries not ready yet, retrying...');
    setTimeout(setupGameWhenReady, 100);
    return;
  }

  console.log('✓ Libraries loaded');
  initGame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGameWhenReady);
} else {
  console.log('📄 Document already loaded');
  setTimeout(setupGameWhenReady, 200);
}
