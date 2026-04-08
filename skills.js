// スキル定義
const SKILLS = {
  // 攻撃スキル
  slash: {
    id: 'slash',
    name: '斬撃',
    icon: '⚔️',
    type: '攻撃',
    description: 'コインが表なら敵に大ダメージを与える',
    effect: (gameState) => {
      gameState.damageDealt += 25;
      return { damage: 25, message: '強い斬撃を放った！' };
    },
  },
  fireblast: {
    id: 'fireblast',
    name: '火炎爆破',
    icon: '🔥',
    type: '攻撃',
    description: 'コインが表なら強力な火炎攻撃。複数ヒット',
    effect: (gameState) => {
      gameState.damageDealt += 40;
      return { damage: 40, message: '火炎が敵を襲う！！' };
    },
  },
  lightning: {
    id: 'lightning',
    name: '雷撃',
    icon: '⚡',
    type: '攻撃',
    description: '表が出ると敵に電撃。追加ダメージ確率あり',
    effect: (gameState) => {
      const bonus = Math.random() > 0.5 ? 15 : 0;
      gameState.damageDealt += 30 + bonus;
      return { damage: 30 + bonus, message: `雷撃炸裂！${bonus > 0 ? '追加ダメージ！' : ''}` };
    },
  },
  pierce: {
    id: 'pierce',
    name: '貫通攻撃',
    icon: '🏹',
    type: '攻撃',
    description: '表で確定ダメージ。防御を無視する',
    effect: (gameState) => {
      gameState.damageDealt += 20;
      return { damage: 20, message: '敵の防御を貫通した！' };
    },
  },

  // 防御スキル
  shield: {
    id: 'shield',
    name: 'シールド',
    icon: '🛡️',
    type: '防御',
    description: 'コインが表なら次のダメージを50%軽減',
    effect: (gameState) => {
      gameState.shieldActive = true;
      gameState.shieldDamageReduction = 0.5;
      return { damage: 0, message: 'シールドが展開された！' };
    },
  },
  dodge: {
    id: 'dodge',
    name: '回避',
    icon: '💨',
    type: '防御',
    description: '表なら次の攻撃を確定回避',
    effect: (gameState) => {
      gameState.dodgeActive = true;
      return { damage: 0, message: '身軽に回避の準備をした！' };
    },
  },
  hardenskin: {
    id: 'hardenskin',
    name: 'スキンハード',
    icon: '🪨',
    type: '防御',
    description: '表なら体を硬くしてダメージ軽減',
    effect: (gameState) => {
      gameState.damageReduction = 0.3;
      return { damage: 0, message: '肌が硬化した！' };
    },
  },

  // HP回復スキル
  heal: {
    id: 'heal',
    name: 'ヒール',
    icon: '💚',
    type: '回復',
    description: 'コインが表なら30HP回復',
    effect: (gameState) => {
      gameState.hp = Math.min(gameState.maxHp, gameState.hp + 30);
      return { damage: 0, message: 'HP 30 回復！' };
    },
  },
  greaterheal: {
    id: 'greaterheal',
    name: '大ヒール',
    icon: '💖',
    type: '回復',
    description: '表なら50HP回復。強力な回復魔法',
    effect: (gameState) => {
      gameState.hp = Math.min(gameState.maxHp, gameState.hp + 50);
      return { damage: 0, message: 'HP 50 大回復！' };
    },
  },
  fullheal: {
    id: 'fullheal',
    name: 'フルリカバリ',
    icon: '✨',
    type: '回復',
    description: '表なら全HP回復。最強の回復スキル',
    effect: (gameState) => {
      gameState.hp = gameState.maxHp;
      return { damage: 0, message: 'HPが完全に回復した！' };
    },
  },
  regeneration: {
    id: 'regeneration',
    name: '再生',
    icon: '🌿',
    type: '回復',
    description: '表なら毎ラウンド2HP自動回復',
    effect: (gameState) => {
      gameState.regenerationActive = true;
      gameState.regenerationAmount = 2;
      return { damage: 0, message: '再生能力が活性化した！' };
    },
  },

  // バフスキル
  powerup: {
    id: 'powerup',
    name: 'パワーアップ',
    icon: '💪',
    type: 'バフ',
    description: '表なら攻撃力1.5倍。3ラウンド続く',
    effect: (gameState) => {
      gameState.powerMultiplier = 1.5;
      gameState.powerRoundsLeft = 3;
      return { damage: 0, message: '攻撃力が上昇した！' };
    },
  },
  speedup: {
    id: 'speedup',
    name: 'スピードアップ',
    icon: '⚡',
    type: 'バフ',
    description: '表なら次のラウンドスキルを2つ選択可能',
    effect: (gameState) => {
      gameState.nextRoundExtraSkill = true;
      return { damage: 0, message: '身軽になった！' };
    },
  },
  focused: {
    id: 'focused',
    name: '集中',
    icon: '🎯',
    type: 'バフ',
    description: '表なら次のスキルの発動率が100%',
    effect: (gameState) => {
      gameState.guaranteedNextSkill = true;
      return { damage: 0, message: '完全に集中した！' };
    },
  },

  // デバフスキル
  poison: {
    id: 'poison',
    name: 'ポイズン',
    icon: '☠️',
    type: 'デバフ',
    description: '表なら敵に毒。3ラウンド毎ターン5ダメージ',
    effect: (gameState) => {
      gameState.enemyPoisoned = true;
      gameState.poisonRounds = 3;
      gameState.poisonDamage = 5;
      return { damage: 0, message: '敵に毒を仕込んだ！' };
    },
  },
  weaken: {
    id: 'weaken',
    name: '弱体化',
    icon: '👻',
    type: 'デバフ',
    description: '表なら敵の攻撃力を50%低下',
    effect: (gameState) => {
      gameState.enemyWeakened = true;
      return { damage: 0, message: '敵が弱体化した！' };
    },
  },
  blind: {
    id: 'blind',
    name: 'ブラインド',
    icon: '🌫️',
    type: 'デバフ',
    description: '表なら敵の命中率を大幅低下',
    effect: (gameState) => {
      gameState.enemyBlinded = true;
      gameState.enemyMissChance = 0.4;
      return { damage: 0, message: '敵が目が見えなくなった！' };
    },
  },

  // サポートスキル
  goldgain: {
    id: 'goldgain',
    name: 'ゴールドハンター',
    icon: '💰',
    type: 'サポート',
    description: '表なら次のラウンドの報酬金2倍',
    effect: (gameState) => {
      gameState.goldMultiplier = 2;
      return { damage: 0, message: '金運がアップした！' };
    },
  },
  skillup: {
    id: 'skillup',
    name: 'スキルサーチ',
    icon: '🔍',
    type: 'サポート',
    description: '表なら強力なスキルが選択肢に出現',
    effect: (gameState) => {
      gameState.rarerSkillsAvailable = true;
      return { damage: 0, message: 'レアスキルが現れた！' };
    },
  },
  lifelink: {
    id: 'lifelink',
    name: 'ライフリンク',
    icon: '🔗',
    type: 'サポート',
    description: '表なら与ダメージの20%をHP回復',
    effect: (gameState) => {
      gameState.lifesteal = 0.2;
      return { damage: 0, message: 'ダメージがHPに変わった！' };
    },
  },

  // 特殊スキル
  doubledown: {
    id: 'doubledown',
    name: 'ダブルダウン',
    icon: '🎲',
    type: '特殊',
    description: '表なら敵に追加ターン。失敗すると敵の追加ターン',
    effect: (gameState) => {
      gameState.extraTurn = true;
      return { damage: 0, message: 'もう一度行動できる！' };
    },
  },
  gamble: {
    id: 'gamble',
    name: 'ギャンブル',
    icon: '🎰',
    type: '特殊',
    description: '表なら50～80ダメージ。ハイリスク',
    effect: (gameState) => {
      const damage = 50 + Math.floor(Math.random() * 30);
      gameState.damageDealt += damage;
      return { damage, message: `ギャンブル成功！${damage}ダメージ！` };
    },
  },
  destiny: {
    id: 'destiny',
    name: '運命の一手',
    icon: '🌠',
    type: '特殊',
    description: '表なら全てが完璧に！敵に100ダメージ',
    effect: (gameState) => {
      gameState.damageDealt += 100;
      gameState.hp = gameState.maxHp;
      return { damage: 100, message: '運命が味方した！' };
    },
  },
  combo: {
    id: 'combo',
    name: 'コンボ',
    icon: '🔄',
    type: '特殊',
    description: '表なら前回のスキルも発動。連続技！',
    effect: (gameState) => {
      gameState.comboActive = true;
      return { damage: 0, message: 'コンボが発動した！' };
    },
  },

  // 変換スキル
  sacrifice: {
    id: 'sacrifice',
    name: 'サクリファイス',
    icon: '🔺',
    type: '変換',
    description: 'HP20消費で敵に50ダメージ',
    effect: (gameState) => {
      gameState.hp = Math.max(0, gameState.hp - 20);
      gameState.damageDealt += 50;
      return { damage: 50, message: 'HP 20 消費して攻撃！' };
    },
  },
  soulshatter: {
    id: 'soulshatter',
    name: 'ソウルシャッター',
    icon: '💎',
    type: '変換',
    description: 'HP 30 消費。敵に 80 ダメージ。表なら追加効果',
    effect: (gameState) => {
      gameState.hp = Math.max(0, gameState.hp - 30);
      gameState.damageDealt += 80;
      return { damage: 80, message: 'ソウルが粉砕した！' };
    },
  },
};

// レアスキル（スキルサーチで追加）
const RARE_SKILLS = {
  omnislash: {
    id: 'omnislash',
    name: 'オムニスラッシュ',
    icon: '🌪️',
    type: '攻撃',
    description: '表なら無数の斬撃！120ダメージ',
    effect: (gameState) => {
      gameState.damageDealt += 120;
      return { damage: 120, message: '無数の斬撃が敵を襲う！' };
    },
  },
  timefreeze: {
    id: 'timefreeze',
    name: '時間停止',
    icon: '⏸️',
    type: '特殊',
    description: '表なら敵の次の2ターンを無効化',
    effect: (gameState) => {
      gameState.enemyFrozen = true;
      gameState.frozenTurns = 2;
      return { damage: 0, message: '時間が停止した！' };
    },
  },
  godmode: {
    id: 'godmode',
    name: 'ゴッドモード',
    icon: '👑',
    type: 'バフ',
    description: '表なら5ラウンド無敵。最強状態',
    effect: (gameState) => {
      gameState.godmodeActive = true;
      gameState.godmodeRounds = 5;
      return { damage: 0, message: 'ゴッドモード発動！！！' };
    },
  },
};

// ランダムスキル選択
function getRandomSkills(count = 3, useRare = false) {
  const skillPool = Object.values(SKILLS);
  const rare = useRare ? Object.values(RARE_SKILLS).slice(0, 1) : [];
  const allSkills = [...skillPool, ...rare];

  const selected = [];
  const skillsCopy = [...allSkills];

  for (let i = 0; i < count && skillsCopy.length > 0; i++) {
    const index = Math.floor(Math.random() * skillsCopy.length);
    selected.push(skillsCopy[index]);
    skillsCopy.splice(index, 1);
  }

  return selected;
}

// スキル効果を適用
function applySkillEffect(skill, gameState, headResult) {
  if (!headResult) {
    return {
      success: false,
      message: '裏が出た...スキルは発動しなかった',
      damage: 0,
    };
  }

  const result = skill.effect(gameState);
  return {
    success: true,
    message: result.message,
    damage: result.damage || 0,
  };
}
