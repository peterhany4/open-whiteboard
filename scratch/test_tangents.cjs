const s = { center: { x: 0, y: 0 }, radius: 10 };
const target = { center: { x: 100, y: 0 }, radius: 10 };

const r = s.center.x;
const o = s.center.y;
const n = s.radius;
const a = target.center.x;
const h = target.center.y;
const u = target.radius;
const l = r - a; // -100
const c = o - h; // 0
const p = Math.hypot(l, c); // 100
const m = Math.abs(u - n); // 0
const g = 1 / p; // 0.01
const d = m * g; // 0
let f = Math.sqrt(Math.max(0, 1 - d * d)); // 1
let y = l * g; // -1
let w = c * g; // 0
if (n > u) {
  f = -f;
  y = -y;
  w = -w;
}
const T = y * d; // 0
const S = w * d; // 0
const v = y * f; // -1
const b = w * f; // 0
const x = T + b; // 0
const P = S - v; // 1
const _ = T - b; // 0
const M = S + v; // -1

const out1 = { x: r + n * x, y: o + n * P }; // (0, 10)
const out2 = { x: r + n * _, y: o + n * M }; // (0, -10)
const in1 = { x: a + u * x, y: h + u * P };   // (100, 10)
const in2 = { x: a + u * _, y: h + u * M };   // (100, -10)

console.log('out1:', out1);
console.log('out2:', out2);
console.log('in1:', in1);
console.log('in2:', in2);
