// Cannon.js を使った物理演算システム

let world; // Cannon.js の物理世界

class Coin {
  constructor() {
    // コインパラメータ
    this.radius = 0.8;
    this.height = 0.1;
    this.mass = 1; // kg

    // 物理ボディ
    this.body = null;

    // 状態
    this.isFlipping = false;
    this.hasLanded = false;
    this.landedSide = null; // 'heads' or 'tails'
    this.landTime = 0;
    this.bounceCount = 0;
    this.maxBounces = 5;

    // Three.js 用位置・回転
    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };

    // 接地状態
    this.isGrounded = false;
    this.groundedFrames = 0;

    this.initPhysicsBody();
  }

  initPhysicsBody() {
    // コインボディを作成（球体で近似）
    const coinShape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({
      mass: this.mass,
      shape: coinShape,
      linearDamping: 0.2,
      angularDamping: 0.3,
    });

    // 初期位置
    this.body.position.set(this.position.x, this.position.y, this.position.z);

    // コンタクト応答の材質設定
    this.body.material = new CANNON.Material('coin');

    world.addBody(this.body);
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

    this.body.velocity.set(
      lateralForce + (Math.random() - 0.5) * 1.5,
      upwardForce,
      lateralForce + (Math.random() - 0.5) * 1.5
    );

    // より複雑な回転（トランブリングモーション）
    const spinIntensity = 25 + Math.random() * 15;
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * spinIntensity,
      (Math.random() - 0.5) * spinIntensity * 1.2,
      (Math.random() - 0.5) * spinIntensity * 0.8
    );
  }

  update(deltaTime) {
    if (!this.isFlipping) return;

    // Three.js用に位置・回転を同期
    this.position.x = this.body.position.x;
    this.position.y = this.body.position.y;
    this.position.z = this.body.position.z;

    // 回転をクォータニオンからオイラー角に変換
    const quat = this.body.quaternion;
    const euler = quat.toEuler();
    this.rotation.x = euler.x;
    this.rotation.y = euler.y;
    this.rotation.z = euler.z;

    // 地面との衝突判定
    this.checkGroundCollision();
  }

  checkGroundCollision() {
    // コインの最下部がおおよそ地面に接しているか
    if (this.body.position.y - this.radius <= 0.1) {
      // 上向きの速度がほぼ0か負
      if (this.body.velocity.y <= 0.5) {
        this.handleGroundCollision();
      }
    }
  }

  handleGroundCollision() {
    if (this.isGrounded) {
      this.groundedFrames++;
    } else {
      this.bounceCount++;
      this.isGrounded = true;
      this.groundedFrames = 1;
    }

    // コインの傾きを詳細に分析
    const quat = this.body.quaternion;
    const euler = quat.toEuler();
    const rotZ = euler.z;

    // 表（heads: 0）と裏（tails: π）までの角度
    const normalizedRotZ = ((rotZ % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const distToHeads = Math.min(normalizedRotZ, Math.PI * 2 - normalizedRotZ);
    const distToTails = Math.abs(normalizedRotZ - Math.PI);
    const angleToTarget = Math.min(distToHeads, distToTails);

    // X軸とY軸の傾き量
    const tiltX = Math.abs(euler.x % (Math.PI * 2));
    const tiltY = Math.abs(euler.y % (Math.PI * 2));
    const maxTilt = Math.max(
      Math.min(tiltX, Math.PI * 2 - tiltX),
      Math.min(tiltY, Math.PI * 2 - tiltY)
    );

    // 完全に水平か判定
    const isCompletelyFlat = angleToTarget < 0.08 && maxTilt < 0.15;

    // 水平でない場合：回転を減衰
    if (!isCompletelyFlat) {
      this.body.angularVelocity.scale(0.5, this.body.angularVelocity);
      this.body.velocity.y *= 0.6; // バウンスエネルギー削減
      this.groundedFrames = 0;
      this.isGrounded = false;
      return;
    }

    // 完全に水平：着地プロセス
    const speedX = Math.abs(this.body.velocity.x);
    const speedY = Math.abs(this.body.velocity.y);
    const speedZ = Math.abs(this.body.velocity.z);
    const totalSpeed = Math.sqrt(speedX * speedX + speedY * speedY + speedZ * speedZ);

    // より早い着地判定
    if (this.groundedFrames >= 2 && totalSpeed < 0.5) {
      this.finishFlip();
    }

    // 速度を低下させて着地をスムーズに
    this.body.velocity.scale(0.7, this.body.velocity);
    this.body.angularVelocity.scale(0.8, this.body.angularVelocity);
  }

  finishFlip() {
    this.isFlipping = false;
    this.hasLanded = true;
    this.landTime = Date.now();

    // コインの向きを判定（Z軸の回転で判定）
    const quat = this.body.quaternion;
    const euler = quat.toEuler();
    const normalizedRotZ = ((euler.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // 最も近い方向（表または裏）に確定させる
    if (normalizedRotZ < Math.PI) {
      this.landedSide = 'heads';
    } else {
      this.landedSide = 'tails';
    }

    // すべての速度を停止
    this.body.velocity.set(0, this.height / 2 - this.radius, 0);
    this.body.angularVelocity.set(0, 0, 0);

    // 位置を調整（地面に接触）
    this.body.position.y = this.height / 2 + this.radius - 0.05;
  }

  reset() {
    // ボディをリセット
    this.body.position.set(0, 2, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);

    this.position = { x: 0, y: 2, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };

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

  destroy() {
    if (this.body) {
      world.removeBody(this.body);
    }
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

// 物理世界を初期化
function initPhysicsWorld() {
  // 物理世界を作成
  world = new CANNON.World();
  world.gravity.set(0, -9.8, 0);
  world.defaultContactMaterial.friction = 0.3;
  world.defaultContactMaterial.restitution = 0.3; // 低い反発係数

  // 床を作成
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 }); // 静的ボディ
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  // 壁の境界（コイン落下時のはね返りを防ぐ）
  const wallMaterial = new CANNON.Material('wall');
  const wallContactMaterial = new CANNON.ContactMaterial(
    wallMaterial,
    wallMaterial,
    { friction: 0.5, restitution: 0.4 }
  );
  world.addContactMaterial(wallContactMaterial);

  // 境界壁
  const boundary = 15;
  const wallThickness = 0.5;
  const wallHeight = 10;
  const wallGeometry = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, boundary));

  for (let x of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    wallBody.addShape(wallGeometry);
    wallBody.position.x = x;
    world.addBody(wallBody);
  }

  for (let z of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    wallBody.addShape(wallGeometry);
    wallBody.position.z = z;
    world.addBody(wallBody);
  }
}
