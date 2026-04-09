/**
 * 物理エンジン - Cannon.js を使用
 * リアルな物理シミュレーションでコインの挙動を制御
 */

let world; // Cannon.js physics world

/**
 * 物理世界を初期化
 */
function initPhysics() {
  // 物理世界を作成
  world = new CANNON.World();
  world.gravity.set(0, -9.8, 0);
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.2;

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
class CoinPhysics {
  constructor() {
    // コイン物理パラメータ
    this.radius = 0.8;
    this.thickness = 0.1;
    this.mass = 1;

    // Three.js用位置・回転
    this.position = { x: 0, y: 2.5, z: 0 };

    // 状態
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null; // 'heads' or 'tails'
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;
    this.lastContactTime = 0;

    // Cannon.js物理ボディ - Boxで代替（Cylinderより安定）
    this.body = this.createPhysicsBody();
  }

  /**
   * 物理ボディを作成
   */
  createPhysicsBody() {
    // Box shape (cylinder approximation)
    const shape = new CANNON.Box(new CANNON.Vec3(this.radius, this.thickness / 2, this.radius));
    const body = new CANNON.Body({
      mass: this.mass,
      shape,
      linearDamping: 0.15,
      angularDamping: 0.25,
    });

    body.position.set(this.position.x, this.position.y, this.position.z);
    world.addBody(body);

    return body;
  }

  /**
   * 現在の位置を取得
   */
  getPosition() {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      z: this.body.position.z,
    };
  }

  /**
   * 現在の回転をオイラー角で取得
   */
  getRotation() {
    const euler = new CANNON.Vec3();
    this.body.quaternion.toEuler(euler);
    return {
      x: euler.x,
      y: euler.y,
      z: euler.z,
    };
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
    this.lastContactTime = 0;

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
    const pos = this.getPosition();
    this.position.x = pos.x;
    this.position.y = pos.y;
    this.position.z = pos.z;

    // 地面との衝突判定
    if (this.position.y <= this.thickness / 2 + 0.05) {
      this.handleGroundCollision();
    }
  }

  /**
   * 地面との衝突判定
   */
  handleGroundCollision() {
    const now = Date.now();
    if (now - this.lastContactTime < 100) return; // Debounce

    this.lastContactTime = now;
    this.bounceCount++;

    // コインが水平に近いか判定
    const isFlat = this.isFlat();

    if (!isFlat) {
      // バウンス - エネルギーを削減
      this.body.velocity.y *= -0.4;
      this.body.velocity.x *= 0.6;
      this.body.velocity.z *= 0.6;

      // 回転を減衰
      this.body.angularVelocity.scale(0.4, this.body.angularVelocity);
      return;
    }

    // コインが水平 - 着地チェック
    this.groundedFrames++;
    this.isGrounded = true;

    const speedX = Math.abs(this.body.velocity.x);
    const speedY = Math.abs(this.body.velocity.y);
    const speedZ = Math.abs(this.body.velocity.z);
    const totalSpeed = Math.sqrt(speedX * speedX + speedY * speedY + speedZ * speedZ);

    if (this.groundedFrames >= 3 && totalSpeed < 0.3) {
      this.settleOnGround();
    } else {
      // 速度を低下させて安定化
      this.body.velocity.scale(0.7, this.body.velocity);
      this.body.angularVelocity.scale(0.5, this.body.angularVelocity);
    }
  }

  /**
   * コインが水平か判定（法線ベクトルベース）
   */
  isFlat() {
    const euler = new CANNON.Vec3();
    this.body.quaternion.toEuler(euler);

    const tiltX = Math.min(Math.abs(euler.x), Math.PI - Math.abs(euler.x));
    const tiltY = Math.min(Math.abs(euler.y), Math.PI - Math.abs(euler.y));

    return tiltX < 0.1 && tiltY < 0.1;
  }

  /**
   * コインを地面に着地させる
   */
  settleOnGround() {
    this.isFlipping = false;
    this.isLanded = true;

    const euler = new CANNON.Vec3();
    this.body.quaternion.toEuler(euler);

    const rotZ = euler.z;
    const normalizedZ = ((rotZ % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    this.landedSide = normalizedZ < Math.PI ? 'heads' : 'tails';

    if (this.landedSide === 'heads') {
      this.body.quaternion.set(0, 0, 0, 1);
    } else {
      const quat = new CANNON.Quaternion();
      quat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI);
      this.body.quaternion.copy(quat);
    }

    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.position.y = this.radius + 0.05;
  }

  /**
   * コインをリセット
   */
  reset() {
    this.body.position.set(0, 2.5, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);

    this.position = { x: 0, y: 2.5, z: 0 };

    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null;
    this.bounceCount = 0;
    this.isGrounded = false;
    this.groundedFrames = 0;
    this.lastContactTime = 0;
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
  }

  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    return this.hp <= 0;
  }

  reset() {
    this.hp = this.maxHp;
  }

  getHp() {
    return this.hp;
  }

  isDefeated() {
    return this.hp <= 0;
  }
}
