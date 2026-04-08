/**
 * Skill System
 */

const SKILLS = {
  // Attack Skills
  slash: {
    id: 'slash',
    name: '斬撃',
    icon: '⚔️',
    description: '表で敵に25ダメージ',
    execute: (state) => {
      const damage = 25;
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: '鋭い斬撃を放った！' };
    },
  },
  fireball: {
    id: 'fireball',
    name: '火炎球',
    icon: '🔥',
    description: '表で敵に40ダメージ',
    execute: (state) => {
      const damage = 40;
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: '火炎球が敵を襲った！' };
    },
  },
  lightning: {
    id: 'lightning',
    name: '雷撃',
    icon: '⚡',
    description: '表で敵に30ダメージ',
    execute: (state) => {
      const damage = 30;
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: '雷が敵を貫いた！' };
    },
  },
  poison: {
    id: 'poison',
    name: 'ポイズン',
    icon: '☠️',
    description: '表で敵に20ダメージ',
    execute: (state) => {
      const damage = 20;
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: '毒が敵に浸透した！' };
    },
  },

  // Defense Skills
  shield: {
    id: 'shield',
    name: 'シールド',
    icon: '🛡️',
    description: '表で次のダメージを50%軽減',
    execute: (state) => {
      state.shieldActive = true;
      return { damage: 0, message: 'シールドが展開された！' };
    },
  },
  dodge: {
    id: 'dodge',
    name: '回避',
    icon: '💨',
    description: '表で次の攻撃を回避',
    execute: (state) => {
      state.dodgeActive = true;
      return { damage: 0, message: '身軽に回避した！' };
    },
  },
  harden: {
    id: 'harden',
    name: '硬化',
    icon: '🪨',
    description: '表でダメージを30%軽減',
    execute: (state) => {
      state.hardenActive = true;
      state.damageReduction = 0.3;
      return { damage: 0, message: '体が硬くなった！' };
    },
  },

  // Heal Skills
  heal: {
    id: 'heal',
    name: 'ヒール',
    icon: '💚',
    description: '表でHP 30回復',
    execute: (state) => {
      const healed = 30;
      state.hp = Math.min(state.maxHp, state.hp + healed);
      return { damage: 0, message: `HP ${healed} 回復した！` };
    },
  },
  greaterheal: {
    id: 'greaterheal',
    name: '大ヒール',
    icon: '💖',
    description: '表でHP 50回復',
    execute: (state) => {
      const healed = 50;
      state.hp = Math.min(state.maxHp, state.hp + healed);
      return { damage: 0, message: `HP ${healed} 大回復した！` };
    },
  },
  regenerate: {
    id: 'regenerate',
    name: '再生',
    icon: '🌿',
    description: '表でHP完全回復',
    execute: (state) => {
      state.hp = state.maxHp;
      return { damage: 0, message: 'HPが完全に回復した！' };
    },
  },

  // Power-up Skills
  powerup: {
    id: 'powerup',
    name: 'パワーアップ',
    icon: '💪',
    description: '表で攻撃力1.5倍',
    execute: (state) => {
      return { damage: 0, message: '攻撃力が上昇した！' };
    },
  },
  speedup: {
    id: 'speedup',
    name: 'スピードアップ',
    icon: '⚡',
    description: '表で敵の攻撃速度低下',
    execute: (state) => {
      return { damage: 0, message: '敵の動きが遅くなった！' };
    },
  },

  // Special Skills
  gamble: {
    id: 'gamble',
    name: 'ギャンブル',
    icon: '🎰',
    description: '表で50～80ダメージ',
    execute: (state) => {
      const damage = 50 + Math.floor(Math.random() * 30);
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: `${damage}ダメージを与えた！` };
    },
  },
  combo: {
    id: 'combo',
    name: 'コンボ',
    icon: '🔄',
    description: '表で敵に60ダメージ',
    execute: (state) => {
      const damage = 60;
      if (enemy) {
        const isDefeated = enemy.takeDamage(damage);
        state.damageDealt += damage;
      }
      return { damage, message: 'コンボが決まった！' };
    },
  },
  gold: {
    id: 'gold',
    name: 'ゴールドハンター',
    icon: '💰',
    description: '表で金30入手',
    execute: (state) => {
      const goldGain = 30;
      state.gold += goldGain;
      return { damage: 0, message: `金${goldGain}を獲得した！` };
    },
  },
};

/**
 * Get random skills
 */
function getRandomSkills(count = 3) {
  const skillArray = Object.values(SKILLS);
  const selected = [];

  for (let i = 0; i < count && skillArray.length > 0; i++) {
    const idx = Math.floor(Math.random() * skillArray.length);
    selected.push(skillArray[idx]);
    skillArray.splice(idx, 1);
  }

  return selected;
}

/**
 * Apply skill effect
 */
function applySkillEffect(skill, gameState, isHeads) {
  if (!skill || !gameState) {
    return {
      message: 'エラーが発生しました',
      damage: 0,
    };
  }

  if (!isHeads) {
    return {
      message: '裏が出た... スキルは発動しなかった',
      damage: 0,
    };
  }

  try {
    const result = skill.execute(gameState);
    return {
      message: result.message || 'スキルが発動した！',
      damage: result.damage || 0,
    };
  } catch (error) {
    console.error('❌ Error executing skill:', error);
    return {
      message: 'スキル実行エラー',
      damage: 0,
    };
  }
}
