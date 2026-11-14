import { RAILWAY_LINE } from "./tejgaonMapData.js";

/**
 * Articulated Bangladesh Railway Train running along the Tejgaon dual-gauge track.
 * Features a 1990s BR Class 2500/2700 Diesel-Electric Locomotive + 5 Passenger Coaches,
 * realistic acceleration/braking, Tejgaon Railway Station scheduled stop, and
 * bidirectional turnaround at the northern/southern sector boundaries.
 */
export class BangladeshRailwayTrain {
  constructor() {
    this.points = RAILWAY_LINE.points.map((p) => ({ x: p.x, y: p.y }));
    this.segments = [];
    this.totalLength = 0;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.01) continue;
      this.segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        dx,
        dy,
        len,
        angle: Math.atan2(dy, dx),
        startDist: this.totalLength,
        endDist: this.totalLength + len
      });
      this.totalLength += len;
    }

    // Locate the track distance closest to Tejgaon Railway Station (~1185, 1560)
    this.stationDist = this.findClosestTrackDist(1185, 1560);

    // Consist layout (1:1 metric scale in meters)
    this.coachCount = 5;
    this.locoLength = 16.5;
    this.coachLength = 17.5;
    this.carGap = 1.3;
    this.carWidth = 2.85;

    // Total consist length from locomotive nose to rear coach buffer
    this.consistLength =
      this.locoLength + this.coachCount * (this.coachLength + this.carGap);

    // Motion & schedule state
    this.direction = 1; // 1 = Southbound (toward Kamalapur), -1 = Northbound (toward Tongi)
    this.headDist = Math.max(140, this.stationDist - 190); // Start approaching Tejgaon Station
    this.speed = 11.5; // m/s (~41 km/h)
    this.cruiseSpeed = 14.5; // m/s (~52 km/h)
    this.dwellTimer = 0;
    this.turnaroundTimer = 0;
    this.stationServedThisPass = false;
    this.statusText = "CRUISING • TEJGAON LINE";
    this.wheelRotation = 0;

    // Build initial car descriptors
    this.cars = [];
    for (let i = 0; i <= this.coachCount; i++) {
      this.cars.push({
        isLocomotive: i === 0,
        carIndex: i,
        x: 0,
        y: 0,
        angle: 0,
        length: i === 0 ? this.locoLength : this.coachLength,
        width: this.carWidth
      });
    }

    // Proxy object compatible with camera follow & HUD speed readouts
    this.locomotive = {
      name: "BR Express (Class 2700)",
      isTrain: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: this.speed
    };

    this.syncCarTransforms();
  }

  findClosestTrackDist(tx, ty) {
    let bestDistSq = Infinity;
    let bestTrackS = this.totalLength * 0.5;

    for (const seg of this.segments) {
      const l2 = seg.len * seg.len;
      let t = ((tx - seg.x1) * seg.dx + (ty - seg.y1) * seg.dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = seg.x1 + seg.dx * t;
      const py = seg.y1 + seg.dy * t;
      const dSq = (tx - px) ** 2 + (ty - py) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestTrackS = seg.startDist + t * seg.len;
      }
    }
    return bestTrackS;
  }

  sampleTrackAt(s) {
    if (this.segments.length === 0) {
      return { x: 1200, y: 1500, angle: Math.PI / 2 };
    }

    if (s <= 0) {
      const first = this.segments[0];
      return {
        x: first.x1 + Math.cos(first.angle) * s,
        y: first.y1 + Math.sin(first.angle) * s,
        angle: first.angle
      };
    }

    if (s >= this.totalLength) {
      const last = this.segments[this.segments.length - 1];
      const extra = s - this.totalLength;
      return {
        x: last.x2 + Math.cos(last.angle) * extra,
        y: last.y2 + Math.sin(last.angle) * extra,
        angle: last.angle
      };
    }

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (s <= seg.endDist) {
        const localS = s - seg.startDist;
        const t = localS / seg.len;
        return {
          x: seg.x1 + seg.dx * t,
          y: seg.y1 + seg.dy * t,
          angle: seg.angle
        };
      }
    }

    const last = this.segments[this.segments.length - 1];
    return { x: last.x2, y: last.y2, angle: last.angle };
  }

  update(dt) {
    if (this.turnaroundTimer > 0) {
      this.turnaroundTimer -= dt;
      this.speed = 0;
      this.statusText = "SIGNAL CLEARANCE • REVERSING";
      if (this.turnaroundTimer <= 0) {
        this.direction *= -1;
        this.stationServedThisPass = false;
        if (this.direction === 1) {
          this.headDist = -10;
        } else {
          this.headDist = this.totalLength + 10;
        }
        this.speed = 4.0;
      }
      this.syncCarTransforms();
      return;
    }

    if (this.dwellTimer > 0) {
      this.dwellTimer -= dt;
      this.speed = 0;
      this.statusText = `BOARDING AT TEJGAON STN (${Math.ceil(this.dwellTimer)}s)`;
      this.syncCarTransforms();
      return;
    }

    // Distance from locomotive nose to Tejgaon Railway Station platform
    const distToStation = (this.stationDist - this.headDist) * this.direction;

    let targetSpeed = this.cruiseSpeed;
    if (!this.stationServedThisPass && distToStation > 0 && distToStation < 110) {
      // Smooth braking curve into Tejgaon Railway Station
      targetSpeed = Math.max(1.4, (distToStation / 110) * this.cruiseSpeed);
      this.statusText = "APPROACHING TEJGAON STN";

      if (distToStation < 3.0) {
        this.headDist = this.stationDist;
        this.speed = 0;
        this.dwellTimer = 4.5;
        this.stationServedThisPass = true;
        this.syncCarTransforms();
        return;
      }
    } else {
      this.statusText =
        this.direction === 1
          ? "SOUTHBOUND • KAMALAPUR EXPRESS"
          : "NORTHBOUND • AIRPORT EXPRESS";
    }

    const accelRate = targetSpeed < this.speed ? 5.2 : 3.4;
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + accelRate * dt);
    } else {
      this.speed = Math.max(targetSpeed, this.speed - accelRate * dt);
    }

    this.headDist += this.direction * this.speed * dt;
    this.wheelRotation += (this.speed * dt) / 0.48;

    // Trigger turnaround once the entire consist clears the sector boundary
    if (this.direction === 1 && this.headDist > this.totalLength + this.consistLength) {
      this.turnaroundTimer = 2.0;
    } else if (this.direction === -1 && this.headDist < -this.consistLength) {
      this.turnaroundTimer = 2.0;
    }

    this.syncCarTransforms();
  }

  syncCarTransforms() {
    let offsetFromNose = this.locoLength * 0.5;

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (i > 0) {
        const prevLen = i === 1 ? this.locoLength : this.coachLength;
        offsetFromNose += prevLen * 0.5 + this.carGap + car.length * 0.5;
      }

      const sampleS = this.headDist - this.direction * offsetFromNose;
      const pose = this.sampleTrackAt(sampleS);
      car.x = pose.x;
      car.y = pose.y;
      car.angle = this.direction === 1 ? pose.angle : pose.angle + Math.PI;
    }

    const loco = this.cars[0];
    this.locomotive.x = loco.x;
    this.locomotive.y = loco.y;
    this.locomotive.angle = loco.angle;
    this.locomotive.speed = this.speed;
    this.locomotive.vx = Math.cos(loco.angle) * this.speed;
    this.locomotive.vy = Math.sin(loco.angle) * this.speed;
  }
}
