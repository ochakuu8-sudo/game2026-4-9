// ゲーム状態
let gameState = {
  round: 1,
  hp: 100,
  maxHp: 100,
  gold: 0,
  damageDealt: 0,
  lastSkill: null,
  selectedSkill: null,
  coinResult: null,
  gameOver: false,

  // バフ/デバフ
  shieldActive: false,
  dodgeActive: false,
  damageReduction: 0,
  shieldDamageReduction: 0,
  powerMultiplier: 1,
  powerRoundsLeft: 0,
  nextRoundExtraSkill: false,
  guaranteedNextSkill: false,
  regenerationActive: false,
  regenerationAmount: 0,

  // 敵のデバフ
  enemyPoisoned: false,
  poisonRounds: 0,
  poisonDamage: 0,
  enemyWeakened: false,
  enemyBlinded: false,
  enemyMissChance: 0,
  enemyFrozen: false,
  frozenTurns: 0,

  // 特殊効果
  lifesteal: 0,
  goldMultiplier: 1,
  rarerSkillsAvailable: false,
  extraTurn: false,
  comboActive: false,
  godmodeActive: false,
  godmodeRounds: 0,
};

// ゲーム開始
function startGame() {
  gameState = {
    round: 1,
    hp: 100,
    maxHp: 100,
    gold: 0,
    damageDealt: 0,
    lastSkill: null,
    selectedSkill: null,
    coinResult: null,
    gameOver: false,
    shieldActive: false,
    dodgeActive: false,
    damageReduction: 0,
    shieldDamageReduction: 0,
    powerMultiplier: 1,
    powerRoundsLeft: 0,
    nextRoundExtraSkill: false,
    guaranteedNextSkill: false,
    regenerationActive: false,
    regenerationAmount: 0,
    enemyPoisoned: false,
    poisonRounds: 0,
    poisonDamage: 0,
    enemyWeakened: false,
    enemyBlinded: false,
    enemyMissChance: 0,
    enemyFrozen: false,
    frozenTurns: 0,
    lifesteal: 0,
    goldMultiplier: 1,
    rarerSkillsAvailable: false,
    extraTurn: false,
    comboActive: false,
    godmodeActive: false,
    godmodeRounds: 0,
  };

  hideAllScreens();
  document.getElementById('gameScreen').classList.add('active');
  showSkillPhase();
}

// 画面遷移
function hideAllScreens() {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
  });
}

function hideAllPhases() {
  document.querySelectorAll('.phase').forEach((phase) => {
    phase.classList.remove('active');
  });
}

function showSkillPhase() {
  hideAllPhases();
  const skillPhase = document.getElementById('skillPhase');
  skillPhase.classList.add('active');

  const skillOptions = document.getElementById('skillOptions');
  skillOptions.innerHTML = '';

  const skills = getRandomSkills(3, gameState.rarerSkillsAvailable);

  skills.forEach((skill) => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-name">${skill.name}</div>
      <div class="skill-type">${skill.type}</div>
    `;
    card.addEventListener('click', () => selectSkill(skill, card));
    skillOptions.appendChild(card);
  });
}

function selectSkill(skill, cardElement) {
  gameState.selectedSkill = skill;

  // 選択状態を表示
  document.querySelectorAll('.skill-card').forEach((card) => {
    card.classList.remove('hover');
  });
  cardElement.classList.add('hover');

  // 短い遅延の後、トスフェーズへ
  setTimeout(() => {
    showTossPhase();
  }, 300);
}

function showTossPhase() {
  hideAllPhases();
  const tossPhase = document.getElementById('tossPhase');
  tossPhase.classList.add('active');

  const coinDisplay = document.getElementById('coinDisplay');
  coinDisplay.textContent = '🪙';
  coinDisplay.className = 'coin';
}

function tossCoin() {
  const coinDisplay = document.getElementById('coinDisplay');
  coinDisplay.classList.add('flipping');

  // コインが回っている間ボタンを無効化
  document.getElementById('tossBtn').disabled = true;

  // 0.6秒後に結果を決定
  setTimeout(() => {
    const isHeads = Math.random() > 0.5;
    gameState.coinResult = isHeads;

    // コイン表示を更新
    coinDisplay.classList.remove('flipping');
    if (isHeads) {
      coinDisplay.className = 'coin heads';
      coinDisplay.textContent = '表';
    } else {
      coinDisplay.className = 'coin tails';
      coinDisplay.textContent = '裏';
    }

    // 結果フェーズへ
    setTimeout(() => {
      showResultPhase();
    }, 500);
  }, 600);
}

function showResultPhase() {
  hideAllPhases();
  const resultPhase = document.getElementById('resultPhase');
  resultPhase.classList.add('active');

  const resultContent = document.getElementById('resultContent');
  const skill = gameState.selectedSkill;
  const isHeads = gameState.coinResult;

  const skillEffect = applySkillEffect(skill, gameState, isHeads);

  let resultHTML = `
    <div class="result-icon">${isHeads ? '✅' : '❌'}</div>
    <h3>${skill.name}</h3>
    <div class="skill-effect">${skillEffect.message}</div>
  `;

  // ダメージ表示
  if (skillEffect.damage > 0) {
    resultHTML += `<p>敵に ${skillEffect.damage} ダメージ！</p>`;
  }

  // HP表示
  resultHTML += `<p>あなたのHP: ${Math.max(0, gameState.hp)} / ${gameState.maxHp}</p>`;

  // 敵の攻撃シミュレーション
  const enemyDamage = calculateEnemyDamage();
  if (enemyDamage > 0) {
    resultHTML += `<p>敵の反撃！ ${enemyDamage} ダメージを受けた！</p>`;
    gameState.hp -= enemyDamage;
  }

  // ゲームオーバー判定
  if (gameState.hp <= 0) {
    resultContent.innerHTML = resultHTML;
    setTimeout(() => {
      showGameOver();
    }, 2000);
    return;
  }

  resultContent.innerHTML = resultHTML;
}

function calculateEnemyDamage() {
  let baseDamage = 15 + gameState.round * 2;

  // 敵が凍結状態
  if (gameState.enemyFrozen && gameState.frozenTurns > 0) {
    gameState.frozenTurns--;
    return 0;
  }

  // 敵が弱体化
  if (gameState.enemyWeakened) {
    baseDamage = Math.floor(baseDamage * 0.5);
  }

  // 敵が盲目
  if (gameState.enemyBlinded && Math.random() < gameState.enemyMissChance) {
    return 0;
  }

  // 毒ダメージ
  if (gameState.enemyPoisoned && gameState.poisonRounds > 0) {
    gameState.poisonRounds--;
    baseDamage += gameState.poisonDamage;
  }

  // 敵の攻撃を回避
  if (gameState.dodgeActive) {
    gameState.dodgeActive = false;
    return 0;
  }

  // シールドでダメージ軽減
  if (gameState.shieldActive) {
    baseDamage = Math.floor(baseDamage * (1 - gameState.shieldDamageReduction));
    gameState.shieldActive = false;
  }

  // 硬化スキン
  if (gameState.damageReduction > 0) {
    baseDamage = Math.floor(baseDamage * (1 - gameState.damageReduction));
    gameState.damageReduction = 0;
  }

  // ゴッドモード
  if (gameState.godmodeActive) {
    return 0;
  }

  return Math.max(1, baseDamage);
}

function nextRound() {
  gameState.round++;
  gameState.gold += 10 * gameState.goldMultiplier;
  gameState.goldMultiplier = 1;
  gameState.lastSkill = gameState.selectedSkill;
  gameState.selectedSkill = null;
  gameState.comboActive = false;

  // バフの継続時間を減らす
  if (gameState.powerRoundsLeft > 0) {
    gameState.powerRoundsLeft--;
  }

  // ゴッドモードの継続時間
  if (gameState.godmodeActive && gameState.godmodeRounds > 0) {
    gameState.godmodeRounds--;
  } else {
    gameState.godmodeActive = false;
  }

  // 再生効果
  if (gameState.regenerationActive) {
    gameState.hp = Math.min(gameState.maxHp, gameState.hp + gameState.regenerationAmount);
  }

  // 難易度上昇（HPが200までスケール）
  if (gameState.round % 5 === 0) {
    gameState.maxHp += 50;
    gameState.hp = gameState.maxHp;
  }

  // 次ラウンドスキル
  gameState.nextRoundExtraSkill = false;
  gameState.guaranteedNextSkill = false;
  gameState.rarerSkillsAvailable = false;

  // UI更新
  document.getElementById('round').textContent = gameState.round;
  document.getElementById('gold').textContent = gameState.gold;
  document.getElementById('hp').textContent = Math.max(0, gameState.hp);

  // 敵のステータスをリセット
  gameState.enemyWeakened = false;
  gameState.enemyBlinded = false;
  gameState.enemyMissChance = 0;

  showSkillPhase();
}

function showGameOver() {
  hideAllPhases();
  const gameOverPhase = document.getElementById('gameOverPhase');
  gameOverPhase.classList.add('active');

  const gameOverContent = document.getElementById('gameOverContent');
  gameOverContent.innerHTML = `
    <h3>ゲームオーバー</h3>
    <p>お疲れ様でした！</p>
    <div class="stats">
      <div class="stat-line">
        <span>到達ラウンド:</span>
        <span>${gameState.round}</span>
      </div>
      <div class="stat-line">
        <span>獲得ゴールド:</span>
        <span>${gameState.gold}</span>
      </div>
      <div class="stat-line">
        <span>与えたダメージ:</span>
        <span>${gameState.damageDealt}</span>
      </div>
    </div>
  `;
}

function showStartScreen() {
  hideAllScreens();
  document.getElementById('startScreen').classList.add('active');
}

// 初期化
function initialize() {
  document.getElementById('round').textContent = gameState.round;
  document.getElementById('gold').textContent = gameState.gold;
  document.getElementById('hp').textContent = gameState.hp;
}

// スキル詳細モーダル
function closeSkillDetail() {
  document.getElementById('skillDetail').classList.add('hidden');
}

function selectSkillFromDetail() {
  // スキルボタンをクリックしたことにする
  document.querySelectorAll('.skill-card').forEach((card) => {
    if (card.classList.contains('hover')) {
      card.click();
    }
  });
  closeSkillDetail();
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
  initialize();
});
