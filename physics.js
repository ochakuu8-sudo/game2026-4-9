// 簡易的な物理演算システム
class Coin {
  constructor() {
    // 位置・回転
    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = 1;

    // 速度・角速度
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };

    // 物理パラメータ
    this.gravity = -9.8;
    this.damping = 0.98; // 速度減衰
    this.angularDamping = 0.95; // 回転減衰
    this.bounceElasticity = 0.6; // 反発係数

    // 状態
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null; // 'heads' or 'tails'
    this.landTime = 0;
  }

  flip() {
    this.isFlipping = true;
    this.hasLanded = false;
    this.landedSide = null;
    this.landTime = 0;

    // 初期速度
    this.velocity = {
      x: (Math.random() - 0.5) * 2,
      y: 15 + Math.random() * 5,
      z: (Math.random() - 0.5) * 2,
    };

    // 初期回転速度（高速回転）
    this.angularVelocity = {
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      z: (Math.random() - 0.5) * 30,
    };
  }

  update(deltaTime) {
    if (!this.isFlipping) return;

    // 重力適用
    this.velocity.y += this.gravity * deltaTime;

    // 速度を位置に適用
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // 速度減衰
    this.velocity.x *= this.damping;
    this.velocity.y *= this.damping;
    this.velocity.z *= this.damping;

    // 回転を位置に適用
    this.rotation.x += this.angularVelocity.x * deltaTime;
    this.rotation.y += this.angularVelocity.y * deltaTime;
    this.rotation.z += this.angularVelocity.z * deltaTime;

    // 回転減衰
    this.angularVelocity.x *= this.angularDamping;
    this.angularVelocity.y *= this.angularDamping;
    this.angularVelocity.z *= this.angularDamping;

    // 床との衝突判定
    if (this.position.y <= 0.3) {
      this.position.y = 0.3;
      this.velocity.y *= -this.bounceElasticity;

      // 速度が小さくなったら着地と判定
      if (Math.abs(this.velocity.y) < 0.5 && Math.abs(this.velocity.x) < 0.5) {
        this.finishFlip();
      }
    }

    // 境界判定（左右）
    const boundary = 10;
    if (this.position.x > boundary) {
      this.position.x = boundary;
      this.velocity.x *= -this.bounceElasticity;
    }
    if (this.position.x < -boundary) {
      this.position.x = -boundary;
      this.velocity.x *= -this.bounceElasticity;
    }

    // 境界判定（奥行き）
    if (this.position.z > boundary) {
      this.position.z = boundary;
      this.velocity.z *= -this.bounceElasticity;
    }
    if (this.position.z < -boundary) {
      this.position.z = -boundary;
      this.velocity.z *= -this.bounceElasticity;
    }
  }

  finishFlip() {
    this.isFlipping = false;
    this.hasLanded = true;
    this.landTime = Date.now();

    // コインの向きを判定（Z軸の回転で判定）
    const normalizedRotZ = ((this.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    this.landedSide = normalizedRotZ < Math.PI ? 'heads' : 'tails';

    // 回転を停止
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  reset() {
    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null;
    this.landTime = 0;
  }

  // コインが着地したか判定
  isLanded() {
    return this.hasLanded;
  }

  // 結果を取得（表=true, 裏=false）
  getResult() {
    return this.landedSide === 'heads';
  }
}

// 敵の簡易クラス
class Enemy {
  constructor() {
    this.maxHp = 100;
    this.hp = 100;
    this.damagePerRound = 15;
  }

  takeDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  reset() {
    this.hp = this.maxHp;
  }

  getDamage(round) {
    // ラウンドが進むと攻撃力が上昇
    return this.damagePerRound + round * 2;
  }
}
