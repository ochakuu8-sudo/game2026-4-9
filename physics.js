/**
 * Cannon.js Physics Engine for Coin Toss Game
 * Handles all physics simulation for coins and world
 */

let world; // Cannon.js physics world

/**
 * Initialize physics world with Cannon.js
 */
function initPhysics() {
  // Create world
  world = new CANNON.World();
  world.gravity.set(0, -9.8, 0);
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.2;

  // Ground body
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  // Boundary walls
  const boundaryMaterial = new CANNON.Material('boundary');
  const boundaryContactMaterial = new CANNON.ContactMaterial(
    boundaryMaterial,
    boundaryMaterial,
    { friction: 0.5, restitution: 0.4 }
  );
  world.addContactMaterial(boundaryContactMaterial);

  const boundary = 15;
  const wallSize = new CANNON.Vec3(0.5, 10, boundary);

  // X-axis walls
  for (let x of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0, material: boundaryMaterial });
    wallBody.addShape(new CANNON.Box(wallSize));
    wallBody.position.x = x;
    world.addBody(wallBody);
  }

  // Z-axis walls
  const wallSizeZ = new CANNON.Vec3(boundary, 10, 0.5);
  for (let z of [-boundary, boundary]) {
    const wallBody = new CANNON.Body({ mass: 0, material: boundaryMaterial });
    wallBody.addShape(new CANNON.Box(wallSizeZ));
    wallBody.position.z = z;
    world.addBody(wallBody);
  }
}

/**
 * Coin physics object
 */
class CoinPhysics {
  constructor() {
    this.radius = 0.8;
    this.mass = 1;

    // Create physics body (sphere approximation)
    const shape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({
      mass: this.mass,
      shape,
      linearDamping: 0.15,
      angularDamping: 0.25,
    });

    this.body.position.set(0, 2.5, 0);
    world.addBody(this.body);

    // State tracking
    this.isFlipping = false;
    this.isLanded = false;
    this.landedSide = null; // 'heads' or 'tails'
    this.lastContactTime = 0;
    this.contactCount = 0;
  }

  /**
   * Get current position
   */
  getPosition() {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      z: this.body.position.z,
    };
  }

  /**
   * Get current rotation as Euler angles
   */
  getRotation() {
    const euler = this.body.quaternion.toEuler();
    return {
      x: euler.x,
      y: euler.y,
      z: euler.z,
    };
  }

  /**
   * Flip the coin (toss it into the air)
   */
  flip() {
    console.log('🪙 Coin flip started');
    this.isFlipping = true;
    this.isLanded = false;
    this.landedSide = null;
    this.lastContactTime = 0;
    this.contactCount = 0;

    // Random upward velocity
    const upForce = 12 + Math.random() * 8;
    const sideForce = (Math.random() - 0.5) * 2;

    this.body.velocity.set(
      sideForce + (Math.random() - 0.5),
      upForce,
      sideForce + (Math.random() - 0.5)
    );

    // Random spin
    const spinIntensity = 20 + Math.random() * 20;
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * spinIntensity,
      (Math.random() - 0.5) * spinIntensity,
      (Math.random() - 0.5) * spinIntensity
    );
    console.log('→ Velocity:', this.body.velocity, 'Spin:', spinIntensity);
  }

  /**
   * Update physics (called each frame)
   */
  update(deltaTime) {
    if (!this.isFlipping) return;

    // Check if coin hit ground
    if (this.body.position.y <= this.radius + 0.05) {
      this.handleGroundContact();
    }
  }

  /**
   * Handle ground contact
   */
  handleGroundContact() {
    const now = Date.now();
    if (now - this.lastContactTime < 100) return; // Debounce

    this.lastContactTime = now;
    this.contactCount++;

    // Check if coin is flat
    const isFlat = this.isFlat();

    if (!isFlat) {
      // Bounce - reduce energy significantly
      this.body.velocity.y *= -0.4; // Low bounce
      this.body.velocity.x *= 0.6;
      this.body.velocity.z *= 0.6;

      // Dampen rotation
      this.body.angularVelocity.scale(0.4, this.body.angularVelocity);
      return;
    }

    // Coin is flat - check if it settled
    const speed = this.body.velocity.length();
    const angularSpeed = this.body.angularVelocity.length();

    if (speed < 0.3 && angularSpeed < 0.5 && this.contactCount > 2) {
      this.settleOnGround();
    } else {
      // Still moving/spinning - dampen motion
      this.body.velocity.scale(0.7, this.body.velocity);
      this.body.angularVelocity.scale(0.5, this.body.angularVelocity);
    }
  }

  /**
   * Check if coin is flat (horizontal)
   */
  isFlat() {
    const euler = this.body.quaternion.toEuler();

    // Check X and Y tilts (should be near 0)
    const tiltX = Math.min(Math.abs(euler.x), Math.PI - Math.abs(euler.x));
    const tiltY = Math.min(Math.abs(euler.y), Math.PI - Math.abs(euler.y));

    return tiltX < 0.1 && tiltY < 0.1;
  }

  /**
   * Settle coin on ground (finalize landing)
   */
  settleOnGround() {
    this.isFlipping = false;
    this.isLanded = true;

    // Determine heads or tails
    const euler = this.body.quaternion.toEuler();
    const rotZ = euler.z;
    const normalizedZ = ((rotZ % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    this.landedSide = normalizedZ < Math.PI ? 'heads' : 'tails';

    // Set final rotation
    if (this.landedSide === 'heads') {
      this.body.quaternion.set(0, 0, 0, 1);
    } else {
      const quat = new CANNON.Quaternion();
      quat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI);
      this.body.quaternion.copy(quat);
    }

    // Stop all motion
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    // Position on ground
    this.body.position.y = this.radius + 0.05;
  }

  /**
   * Reset coin to initial state
   */
  reset() {
    this.body.position.set(0, 2.5, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);

    this.isFlipping = false;
    this.isLanded = false;
    this.landedSide = null;
    this.lastContactTime = 0;
    this.contactCount = 0;
  }

  /**
   * Get result (true = heads, false = tails)
   */
  getResult() {
    return this.landedSide === 'heads';
  }

  /**
   * Clean up physics body
   */
  destroy() {
    world.removeBody(this.body);
  }
}

/**
 * Enemy class
 */
class Enemy {
  constructor() {
    this.maxHp = 100;
    this.hp = 100;
  }

  takeDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  reset() {
    this.hp = this.maxHp;
  }
}
