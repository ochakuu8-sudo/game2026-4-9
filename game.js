// Three.jsシーンセットアップ
let scene, camera, renderer;
let coinMesh, coin;
let enemy;
let gameState = {
  round: 1,
  hp: 100,
  maxHp: 100,
  gold: 0,
  damageDealt: 0,
  gameActive: false,
  isWaitingForResult: false,
  selectedSkill: null,
};

let lastTime = Date.now();

// 初期化
function initThreeJS() {
  // シーン作成
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 50, 100);

  // カメラ設定
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  // レンダラー設定
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;

  // ライト設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // 地面
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

  // コイン作成
  createCoin();

  // 敵オブジェクト
  enemy = new Enemy();

  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);

  // アニメーションループ開始
  animate();
}

function createCoin() {
  // 既存のコインを削除
  if (coinMesh) {
    scene.remove(coinMesh);
  }

  // コイン作成（円盤）
  const coinGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);

  // 複合マテリアル（表と裏で色分け）
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 }), // サイド
    new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.9, roughness: 0.1 }), // 表（上）
    new THREE.MeshStandardMaterial({ color: 0xddaa00, metalness: 0.7, roughness: 0.3 }), // 裏（下）
  ];

  coinMesh = new THREE.Mesh(coinGeometry, materials);
  coinMesh.castShadow = true;
  coinMesh.receiveShadow = true;
  coinMesh.position.set(0, 2, 0);
  scene.add(coinMesh);
}

function tossCoin() {
  if (gameState.isWaitingForResult) return;
  if (!coin) {
    console.error('Error: coin object not initialized');
    return;
  }

  gameState.isWaitingForResult = true;
  document.getElementById('status-text').textContent = 'コイン中...';

  try {
    coin.flip();
  } catch (error) {
    console.error('Error during coin flip:', error);
    gameState.isWaitingForResult = false;
    return;
  }

  // 着地判定のタイマー
  let checkInterval = null;
  let timeoutId = null;

  checkInterval = setInterval(() => {
    if (coin && coin.isLanded()) {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
      setTimeout(showCoinResult, 800);
    }
  }, 100);

  // 安全装置：3秒後に強制的に着地判定
  timeoutId = setTimeout(() => {
    if (checkInterval) clearInterval(checkInterval);
    if (coin && !coin.isLanded()) {
      coin.finishFlip();
      setTimeout(showCoinResult, 500);
    }
  }, 3000);
}

function showCoinResult() {
  const isHeads = coin.getResult();
  const skill = gameState.selectedSkill;

  // スキル効果を適用
  const skillEffect = applySkillEffect(skill, gameState, isHeads);

  // ダメージ追跡
  if (skillEffect.damage > 0) {
    gameState.damageDealt += skillEffect.damage;
  }

  // 結果パネル表示
  const resultPanel = document.getElementById('result-panel');
  document.getElementById('result-icon').textContent = isHeads ? '✅ 表' : '❌ 裏';
  document.getElementById('result-title').textContent = skill.name;

  let resultMessage = skillEffect.message;
  if (skillEffect.damage > 0) {
    resultMessage += `\n敵に${skillEffect.damage}ダメージ！`;
  }
  document.getElementById('result-message').textContent = resultMessage;

  resultPanel.classList.add('show');

  // 敵の反撃ダメージ
  const enemyDamage = 15 + gameState.round * 2;
  gameState.hp -= Math.max(1, enemyDamage);
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);

  setTimeout(() => {
    if (gameState.hp <= 0) {
      showGameOver();
    }
  }, 1500);
}

function nextRound() {
  const resultPanel = document.getElementById('result-panel');
  resultPanel.classList.remove('show');

  gameState.round++;
  gameState.gold += 10;

  // 5ラウンドごとに最大HPと現在のHPを回復
  if (gameState.round % 5 === 0) {
    gameState.maxHp += 50;
    gameState.hp = Math.min(gameState.hp + 50, gameState.maxHp);
  }

  // HP上限処理
  gameState.hp = Math.min(gameState.hp, gameState.maxHp);

  updateUI();
  showSkillSelection();
}

function showSkillSelection() {
  gameState.isWaitingForResult = false;

  const skills = getRandomSkills(3, false);
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

function selectSkill(skill) {
  gameState.selectedSkill = skill;
  document.getElementById('skill-panel').classList.add('hidden');
  document.getElementById('status-text').textContent = `${skill.name}でコインをトス...`;

  // コインをトス
  setTimeout(tossCoin, 500);
}

function updateUI() {
  document.getElementById('round').textContent = gameState.round;
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);
  document.getElementById('gold').textContent = gameState.gold;
}

function startGame() {
  document.getElementById('title-screen').classList.add('hidden');

  gameState = {
    round: 1,
    hp: 100,
    maxHp: 100,
    gold: 0,
    damageDealt: 0,
    gameActive: true,
    isWaitingForResult: false,
    selectedSkill: null,
  };

  coin = new Coin();
  coin.reset();

  updateUI();
  showSkillSelection();
}

function showTitleScreen() {
  document.getElementById('gameover-screen').classList.remove('show');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('skill-panel').classList.add('hidden');
  gameState.gameActive = false;
}

function showGameOver() {
  gameState.gameActive = false;

  document.getElementById('final-round').textContent = gameState.round;
  document.getElementById('final-gold').textContent = gameState.gold;
  document.getElementById('final-damage').textContent = gameState.damageDealt;

  document.getElementById('gameover-screen').classList.add('show');
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.016); // 最大 16ms（60fps）
  lastTime = now;

  // コイン更新（ゲーム進行中）
  if (coin) {
    coin.update(deltaTime);
  }

  // コインメッシュを更新（常に同期）
  if (coinMesh && coin) {
    coinMesh.position.copy(coin.position);
    coinMesh.rotation.x = coin.rotation.x;
    coinMesh.rotation.y = coin.rotation.y;
    coinMesh.rotation.z = coin.rotation.z;
  }

  renderer.render(scene, camera);
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
});
