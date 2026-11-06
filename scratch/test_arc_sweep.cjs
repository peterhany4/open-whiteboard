// Compare sweep=0 vs sweep=1 on an end cap
const p1 = { x: 50, y: 40 };
const p2 = { x: 50, y: 60 };
const center = { x: 50, y: 50 };
const radius = 10;

// Path coming from left (x=0) to right (x=50)
// incomingTangent1 is at (50, 40)
// incomingTangent2 is at (50, 60)
// With sweep 0:
console.log('Sweep 0 (Microsoft Whiteboard): A 10 10 0 0 0 50 60');
// With sweep 1 (our previous code):
console.log('Sweep 1 (Inverted): A 10 10 0 0 1 50 60');
// In SVG:
// A point starting at (50, 40) ending at (50, 60) on circle (50,50, r=10):
// Center is (50,50). Angle from center:
// (50,40) is at -90 deg (12 o'clock)
// (50,60) is at +90 deg (6 o'clock)
// Clockwise (sweep=1) goes from -90 to +90 through 0 deg (3 o'clock - towards the right / dome!).
// Wait! Let's check which way incomingTangent1 and incomingTangent2 are defined in Module 357044!
