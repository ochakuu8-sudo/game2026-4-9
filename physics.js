/**
 * 物理エンジン - Cannon.js を使用
 * リアルな物理シミュレーションでコインの挙動を制御
 */

// グローバル物理世界
let world;

/**
 * 物理世界を初期化
 */
function initPhysicsWorld() {
  // 物理世界を作成
  world = new CANNON.World();
  world.gravity.set(0, -9.8, 0);
  world.defaultContactMaterial.friction = 0.3;
  world.defaultContactMaterial.restitution = 0.3;

  // 床を作成
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  // 境界壁を作成
  createBoundaryWalls();
}

/**
 * 境界壁を作成
 */
function createBoundaryWalls() {
  const boundary = 15;
  const wallHeight = 10;
  const wallThickness = 0.5;

  const wallShape = new CANNON.Box(
    new CANNON.Vec3(wallThickness / 2, wallHeight / 2, boundary)
  );

  // X軸方向の壁
  for (let x of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.x = x;
    world.addBody(wallBody);
  }

  // Z軸方向の壁
  const wallShapeZ = new CANNON.Box(
    new CANNON.Vec3(boundary, wallHeight / 2, wallThickness / 2)
  );
  for (let z of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShapeZ);
    wallBody.position.z = z;
    world.addBody(wallBody);
  }
}

/**
 * コインクラス - Cannon.js物理エンジンを使用
 */
class Coin {
  constructor() {
    // コイン物理パラメータ
    this.radius = 0.8;
    this.height = 0.1;
    this.mass = 1;

    // Three.js用位置・回転
    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };

    // 状態
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null;
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;

    // Cannon.js物理ボディ
    this.body = this.createPhysicsBody();
  }

  /**
   * 物理ボディを作成
   */
  createPhysicsBody() {
    const shape = new CANNON.Sphere(this.radius);
    const body = new CANNON.Body({
      mass: this.mass,
      shape,
      linearDamping: 0.2,
      angularDamping: 0.3,
    });

    body.position.set(this.position.x, this.position.y, this.position.z);
    world.addBody(body);

    return body;
  }

  /**
   * コインをフリップ（トス）する
   */
  flip() {
    this.isFlipping = true;
    this.hasLanded = false;
    this.landedSide = null;
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;

    // 初期速度を設定
    const upwardForce = 12 + Math.random() * 8;
    const lateralForceX = (Math.random() - 0.5) * 3;
    const lateralForceZ = (Math.random() - 0.5) * 3;

    this.body.velocity.set(
      lateralForceX + (Math.random() - 0.5) * 1.5,
      upwardForce,
      lateralForceZ + (Math.random() - 0.5) * 1.5
    );

    // 回転速度を設定
    const spinIntensity = 25 + Math.random() * 15;
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * spinIntensity,
      (Math.random() - 0.5) * spinIntensity * 1.2,
      (Math.random() - 0.5) * spinIntensity * 0.8
    );
  }

  /**
   * 毎フレーム更新
   */
  update(deltaTime) {
    if (!this.isFlipping) return;

    // 位置を同期
    this.position.x = this.body.position.x;
    this.position.y = this.body.position.y;
    this.position.z = this.body.position.z;

    // 回転をクォータニオンからオイラー角に変換
    const euler = this.body.quaternion.toEuler();
    this.rotation.x = euler.x;
    this.rotation.y = euler.y;
    this.rotation.z = euler.z;

    // 地面との衝突判定
    this.checkGroundCollision();
  }

  /**
   * 地面との衝突判定
   */
  checkGroundCollision() {
    // コインの最下部が地面に接しているか
    if (this.body.position.y - this.radius <= 0.1) {
      // 上向きの速度がほぼ0か負
      if (this.body.velocity.y <= 0.5) {
        this.handleGroundCollision();
      }
    }
  }

  /**
   * 地面との衝突を処理
   */
  handleGroundCollision() {
    if (this.isGrounded) {
      this.groundedFrames++;
    } else {
      this.bounceCount++;
      this.isGrounded = true;
      this.groundedFrames = 1;
    }

    // コインの向きを分析
    const euler = this.body.quaternion.toEuler();
    const rotZ = euler.z;
    const normalizedRotZ = ((rotZ % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // 表（heads: 0）と裏（tails: π）までの角度
    const distToHeads = Math.min(normalizedRotZ, Math.PI * 2 - normalizedRotZ);
    const distToTails = Math.abs(normalizedRotZ - Math.PI);
    const angleToTarget = Math.min(distToHeads, distToTails);

    // X/Y軸の傾き量
    const tiltX = Math.abs(euler.x % (Math.PI * 2));
    const tiltY = Math.abs(euler.y % (Math.PI * 2));
    const maxTilt = Math.max(
      Math.min(tiltX, Math.PI * 2 - tiltX),
      Math.min(tiltY, Math.PI * 2 - tiltY)
    );

    // 完全に水平か判定
    const isCompletelyFlat = angleToTarget < 0.08 && maxTilt < 0.15;

    if (!isCompletelyFlat) {
      // コインが傾いている場合：回転を減衰
      this.body.angularVelocity.scale(0.5, this.body.angularVelocity);
      this.body.velocity.y *= 0.6;
      this.groundedFrames = 0;
      this.isGrounded = false;
      return;
    }

    // 完全に水平：着地プロセス
    const speedX = Math.abs(this.body.velocity.x);
    const speedY = Math.abs(this.body.velocity.y);
    const speedZ = Math.abs(this.body.velocity.z);
    const totalSpeed = Math.sqrt(speedX * speedX + speedY * speedY + speedZ * speedZ);

    // 着地判定（平坦で速度が低い）
    if (this.groundedFrames >= 2 && totalSpeed < 0.5) {
      this.finishFlip();
    }

    // 速度を低下させる
    this.body.velocity.scale(0.7, this.body.velocity);
    this.body.angularVelocity.scale(0.8, this.body.angularVelocity);
  }

  /**
   * フリップを終了（着地確定）
   */
  finishFlip() {
    this.isFlipping = false;
    this.hasLanded = true;

    // コインの向きから表/裏を判定
    const euler = this.body.quaternion.toEuler();
    const normalizedRotZ = ((euler.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    this.landedSide = normalizedRotZ < Math.PI ? 'heads' : 'tails';

    // 速度をリセット
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    // 位置を調整
    this.body.position.y = this.height / 2 + this.radius - 0.05;
  }

  /**
   * コインをリセット
   */
  reset() {
    this.body.position.set(0, 2, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);

    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };

    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null;
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;
  }

  /**
   * コインが着地したか判定
   */
  isLanded() {
    return this.hasLanded;
  }

  /**
   * 結果を取得（表=true, 裏=false）
   */
  getResult() {
    return this.landedSide === 'heads';
  }

  /**
   * 物理ボディを破棄
   */
  destroy() {
    if (this.body) {
      world.removeBody(this.body);
    }
  }
}

/**
 * 敵クラス
 */
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
    return this.damagePerRound + round * 2;
  }
}
