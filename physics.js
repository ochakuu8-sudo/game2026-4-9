// 簡易的な物理演算システム
class Coin {
  constructor() {
    // 位置・回転
    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = 1;

    // コインサイズ（Three.jsのCylinderGeometryと同じ）
    this.radius = 0.8;
    this.height = 0.1; // 円盤の厚さ

    // 速度・角速度
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };

    // 物理パラメータ
    this.gravity = -9.8;
    this.damping = 0.992; // 速度減衰（空気抵抗）
    this.angularDamping = 0.97; // 回転減衰
    this.bounceElasticity = 0.65; // 反発係数
    this.friction = 0.3; // 摩擦係数
    this.spinDamping = 0.92; // スピン減衰（地面との接触時）

    // 状態
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null; // 'heads' or 'tails'
    this.landTime = 0;
    this.bounceCount = 0;
    this.maxBounces = 5; // 最大バウンス数

    // 接地状態
    this.isGrounded = false;
    this.groundedFrames = 0;
  }

  flip() {
    this.isFlipping = true;
    this.hasLanded = false;
    this.landedSide = null;
    this.landTime = 0;
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;

    // より現実的な初期速度
    const upwardForce = 12 + Math.random() * 8;
    const lateralForce = (Math.random() - 0.5) * 3;

    this.velocity = {
      x: lateralForce + (Math.random() - 0.5) * 1.5,
      y: upwardForce,
      z: lateralForce + (Math.random() - 0.5) * 1.5,
    };

    // より複雑な回転（トランブリングモーション）
    const spinIntensity = 25 + Math.random() * 15;
    this.angularVelocity = {
      x: (Math.random() - 0.5) * spinIntensity,
      y: (Math.random() - 0.5) * spinIntensity * 1.2,
      z: (Math.random() - 0.5) * spinIntensity * 0.8,
    };
  }

  update(deltaTime) {
    if (!this.isFlipping) return;

    // 重力適用
    this.velocity.y += this.gravity * deltaTime;

    // 空気抵抗（高度に応じて変化）
    const airResistance = this.position.y > 0 ? 0.985 : 0.99;
    this.velocity.x *= (this.damping * airResistance);
    this.velocity.y *= (this.damping * airResistance);
    this.velocity.z *= (this.damping * airResistance);

    // 速度を位置に適用
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // 回転を位置に適用
    this.rotation.x += this.angularVelocity.x * deltaTime;
    this.rotation.y += this.angularVelocity.y * deltaTime;
    this.rotation.z += this.angularVelocity.z * deltaTime;

    // 回転減衰
    this.angularVelocity.x *= this.angularDamping;
    this.angularVelocity.y *= this.angularDamping;
    this.angularVelocity.z *= this.angularDamping;

    // 床との衝突判定（コインの下面が地面に接したとき）
    const coinBottomY = this.position.y - this.height / 2;
    if (coinBottomY <= 0) {
      this.handleGroundCollision();
    }

    // 境界判定（左右）
    const boundary = 15;
    if (this.position.x > boundary) {
      this.position.x = boundary;
      this.velocity.x *= -this.bounceElasticity * 0.8;
      this.angularVelocity.y *= 0.7;
    }
    if (this.position.x < -boundary) {
      this.position.x = -boundary;
      this.velocity.x *= -this.bounceElasticity * 0.8;
      this.angularVelocity.y *= 0.7;
    }

    // 境界判定（奥行き）
    if (this.position.z > boundary) {
      this.position.z = boundary;
      this.velocity.z *= -this.bounceElasticity * 0.8;
      this.angularVelocity.y *= 0.7;
    }
    if (this.position.z < -boundary) {
      this.position.z = -boundary;
      this.velocity.z *= -this.bounceElasticity * 0.8;
      this.angularVelocity.y *= 0.7;
    }
  }

  handleGroundCollision() {
    // コインの下面が地面に接するように位置を調整
    this.position.y = this.height / 2;
    this.bounceCount++;

    // コインの傾きを確認（Z軸の回転）
    const normalizedRotZ = ((this.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const distToHeads = Math.min(normalizedRotZ, Math.PI * 2 - normalizedRotZ);
    const distToTails = Math.abs(normalizedRotZ - Math.PI);

    // 地面平行までの角度差分（ラジアン）
    const angleToFlat = Math.min(distToHeads, distToTails);
    const isAlmostFlat = angleToFlat < 0.15; // 約8.6度以内なら平坦と判定

    // 最初の衝撃での反発
    this.velocity.y *= -this.bounceElasticity;

    // バウンスごとに反発係数を低下させる
    const bounceReduction = Math.pow(0.7, this.bounceCount - 1);
    this.velocity.y *= bounceReduction;

    // 摩擦により水平速度を減衰
    this.velocity.x *= (1 - this.friction * 0.5);
    this.velocity.z *= (1 - this.friction * 0.5);

    if (!isAlmostFlat) {
      // 水平でない場合：側面でバウンド
      // X軸とY軸の回転を減衰させて、Z軸中心の回転のみを強調
      this.angularVelocity.x *= 0.4; // 大幅に減衰
      this.angularVelocity.y *= 0.4; // 大幅に減衰
      // Z軸周辺の回転は維持（フリップを続行）
      this.angularVelocity.z *= 0.8;

      // 角速度が小さければ、強制的にフリップを続ける
      const angularSpeed = Math.sqrt(
        this.angularVelocity.x ** 2 +
        this.angularVelocity.y ** 2 +
        this.angularVelocity.z ** 2
      );

      if (angularSpeed < 1 && this.bounceCount < 3) {
        // 勢いがなくなったら、強制的にZ軸周辺を回転させる
        this.angularVelocity.z = (Math.random() - 0.5) * 8;
      }

      this.groundedFrames = 0;
      this.isGrounded = false;
      return;
    }

    // 地面平行の場合：完全に着地
    this.groundedFrames++;
    this.isGrounded = true;

    // 地面との接触時にスピンを減衰（ただしZ軸は保持）
    this.angularVelocity.x *= this.spinDamping * 0.5;
    this.angularVelocity.y *= this.spinDamping * 0.5;
    // Z軸はゆっくり減速
    this.angularVelocity.z *= 0.95;

    // 速度がゼロに近づいたら停止
    const speedX = Math.abs(this.velocity.x);
    const speedY = Math.abs(this.velocity.y);
    const speedZ = Math.abs(this.velocity.z);
    const totalSpeed = Math.sqrt(speedX * speedX + speedY * speedY + speedZ * speedZ);

    if (totalSpeed < 0.3 && this.groundedFrames > 2) {
      this.finishFlip();
    }
  }

  finishFlip() {
    this.isFlipping = false;
    this.hasLanded = true;
    this.landTime = Date.now();

    // コインの向きを判定（Z軸の回転で判定）
    const normalizedRotZ = ((this.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // 最も近い方向（表または裏）に確定させる
    if (normalizedRotZ < Math.PI) {
      this.landedSide = 'heads';
      this.rotation.z = 0; // 完全に表に固定
    } else {
      this.landedSide = 'tails';
      this.rotation.z = Math.PI; // 完全に裏に固定
    }

    // 他の軸の回転は0に（コインを完全に水平に）
    this.rotation.x = 0;
    this.rotation.y = 0;

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
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;
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
