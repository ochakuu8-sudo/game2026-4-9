/**
 * 3D コイントスローゲーム - メインゲームロジック
 * Three.js + Cannon.js を使用した物理シミュレーションゲーム
 */

// ========== グローバル変数 ==========
let scene, camera, renderer;
let coinMesh, coin;
let enemy;
let lastTime = Date.now();

// ゲーム状態
const gameState = {
  round: 1,
  hp: 100,
  maxHp: 100,
  gold: 0,
  damageDealt: 0,
  gameActive: false,
  isWaitingForResult: false,
  selectedSkill: null,
};

// ========== 初期化 ==========

/**
 * Three.js と Cannon.js のシーンを初期化
 */
function initGame() {
  console.log('Initializing game...');

  // 物理世界を初期化
  initPhysicsWorld();

  // Three.js シーンをセットアップ
  setupScene();
  setupCamera();
  setupRenderer();
  setupLights();
  setupGround();

  // ゲームオブジェクトを作成
  createCoinMesh();
  enemy = new Enemy();

  // イベントリスナー設定
  window.addEventListener('resize', onWindowResize);

  // アニメーションループ開始
  animate();
}

/**
 * Three.js シーンを設定
 */
function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 50, 100);
}

/**
 * カメラを設定
 */
function setupCamera() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);
}

/**
 * レンダラーを設定
 */
function setupRenderer() {
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;
}

/**
 * ライトを設定
 */
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
}

/**
 * 地面とグリッドを作成
 */
function setupGround() {
  // 地面メッシュ
  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // グリッド表示
  const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

/**
 * コインメッシュを作成
 */
function createCoinMesh() {
  if (coinMesh) {
    scene.remove(coinMesh);
  }

  const coinGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.9, roughness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0xddaa00, metalness: 0.7, roughness: 0.3 }),
  ];

  coinMesh = new THREE.Mesh(coinGeometry, materials);
  coinMesh.castShadow = true;
  coinMesh.receiveShadow = true;
  coinMesh.position.set(0, 2, 0);
  scene.add(coinMesh);
}

// ========== ゲームフロー ==========

/**
 * ゲームを開始
 */
function startGame() {
  document.getElementById('title-screen').classList.add('hidden');

  gameState.round = 1;
  gameState.hp = 100;
  gameState.maxHp = 100;
  gameState.gold = 0;
  gameState.damageDealt = 0;
  gameState.gameActive = true;
  gameState.isWaitingForResult = false;

  // 前のコインを破棄し、新しいものを作成
  if (coin) {
    coin.destroy();
  }
  coin = new Coin();

  updateUI();
  showSkillSelection();
}

/**
 * スキル選択画面を表示
 */
function showSkillSelection() {
  gameState.isWaitingForResult = false;

  const skills = getRandomSkills(3);
  const skillGrid = document.getElementById('skill-grid');
  skillGrid.innerHTML = '';

  skills.forEach((skill) => {
    const button = document.createElement('button');
    button.className = 'skill-button';
    button.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-name">${skill.name}</div>
      <div class="skill-desc">${skill.description}</div>
    `;
    button.onclick = () => selectSkill(skill);
    skillGrid.appendChild(button);
  });

  document.getElementById('skill-panel').classList.remove('hidden');
  document.getElementById('status-text').textContent = 'スキルを選択してコインをトスしてください';
}

/**
 * スキルを選択してコインをトス
 */
function selectSkill(skill) {
  gameState.selectedSkill = skill;
  document.getElementById('skill-panel').classList.add('hidden');
  document.getElementById('status-text').textContent = `${skill.name}でコインをトス...`;

  setTimeout(tossCoin, 500);
}

/**
 * コインをトスする
 */
function tossCoin() {
  if (gameState.isWaitingForResult) return;
  if (!coin) {
    console.error('Coin not initialized');
    return;
  }

  gameState.isWaitingForResult = true;
  document.getElementById('status-text').textContent = 'コイン中...';

  coin.flip();

  // 着地判定のポーリング
  let checkInterval = null;
  let timeoutId = null;

  checkInterval = setInterval(() => {
    if (coin && coin.isLanded()) {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
      setTimeout(showCoinResult, 800);
    }
  }, 100);

  // タイムアウト安全装置
  timeoutId = setTimeout(() => {
    if (checkInterval) clearInterval(checkInterval);
    if (coin && !coin.isLanded()) {
      coin.finishFlip();
      setTimeout(showCoinResult, 500);
    }
  }, 6000);
}

/**
 * コインの結果を表示
 */
function showCoinResult() {
  const isHeads = coin.getResult();
  const skill = gameState.selectedSkill;

  const skillEffect = applySkillEffect(skill, gameState, isHeads);

  if (skillEffect.damage > 0) {
    gameState.damageDealt += skillEffect.damage;
  }

  const resultPanel = document.getElementById('result-panel');
  document.getElementById('result-icon').textContent = isHeads ? '✅ 表' : '❌ 裏';
  document.getElementById('result-title').textContent = skill.name;

  let resultMessage = skillEffect.message;
  if (skillEffect.damage > 0) {
    resultMessage += `\n敵に${skillEffect.damage}ダメージ！`;
  }
  document.getElementById('result-message').textContent = resultMessage;

  resultPanel.classList.add('show');

  // 敵の反撃
  const enemyDamage = 15 + gameState.round * 2;
  gameState.hp -= Math.max(1, enemyDamage);
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);

  setTimeout(() => {
    if (gameState.hp <= 0) {
      showGameOver();
    }
  }, 1500);
}

/**
 * 次のラウンドに進む
 */
function nextRound() {
  const resultPanel = document.getElementById('result-panel');
  resultPanel.classList.remove('show');

  gameState.round++;
  gameState.gold += 10;

  // 5ラウンドごとに最大HPを回復
  if (gameState.round % 5 === 0) {
    gameState.maxHp += 50;
    gameState.hp = Math.min(gameState.hp + 50, gameState.maxHp);
  }

  gameState.hp = Math.min(gameState.hp, gameState.maxHp);

  updateUI();
  showSkillSelection();
}

/**
 * ゲームオーバー画面を表示
 */
function showGameOver() {
  gameState.gameActive = false;

  document.getElementById('final-round').textContent = gameState.round;
  document.getElementById('final-gold').textContent = gameState.gold;
  document.getElementById('final-damage').textContent = gameState.damageDealt;

  document.getElementById('gameover-screen').classList.add('show');
}

/**
 * タイトル画面に戻る
 */
function showTitleScreen() {
  document.getElementById('gameover-screen').classList.remove('show');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('skill-panel').classList.add('hidden');
  gameState.gameActive = false;
}

// ========== UI更新 ==========

/**
 * UI情報を更新
 */
function updateUI() {
  document.getElementById('round').textContent = gameState.round;
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);
  document.getElementById('gold').textContent = gameState.gold;
}

/**
 * ウィンドウリサイズ対応
 */
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ========== アニメーションループ ==========

/**
 * メインアニメーションループ
 */
function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.016);
  lastTime = now;

  // 物理シミュレーションを進める
  if (world) {
    world.step(1 / 60, deltaTime, 3);
  }

  // コインを更新
  if (coin) {
    coin.update(deltaTime);
  }

  // コインメッシュを同期
  if (coinMesh && coin) {
    coinMesh.position.copy(coin.position);
    coinMesh.rotation.x = coin.rotation.x;
    coinMesh.rotation.y = coin.rotation.y;
    coinMesh.rotation.z = coin.rotation.z;
  }

  // シーンをレンダリング
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// ========== 初期化トリガー ==========

document.addEventListener('DOMContentLoaded', () => {
  initGame();
});

if (document.readyState === 'loading') {
  // DOMContentLoadedを待つ
} else {
  // すでに読み込まれている場合
  setTimeout(initGame, 100);
}
