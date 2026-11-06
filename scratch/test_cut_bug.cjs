const nodes = [
  { center: { x: 0, y: 0 }, radius: 2, outgoingTangent1: { x: NaN }, incomingTangent1: { x: NaN } },
  { center: { x: 10, y: 0 }, radius: 2, outgoingTangent1: { x: NaN }, incomingTangent1: { x: NaN } },
  { center: { x: 20, y: 0 }, radius: 2, outgoingTangent1: { x: NaN }, incomingTangent1: { x: NaN } },
];

for (let i = 1; i < nodes.length; i++) {
  nodes[i - 1].outgoingTangent1 = { x: 1, y: 1 };
  nodes[i].incomingTangent1 = { x: 1, y: 1 };
}

console.log('nodes[0].outgoing:', nodes[0].outgoingTangent1);
console.log('nodes[1].outgoing:', nodes[1].outgoingTangent1);
console.log('nodes[2].outgoing (last):', nodes[2].outgoingTangent1);

for (let i = 0; i < nodes.length; i++) {
  const isLast = i === nodes.length - 1;
  const isBreak = isNaN(nodes[i].outgoingTangent1.x);
  console.log(`i=${i}, isLast=${isLast}, isBreak=${isBreak}, chosenEnd=${isLast && !isBreak ? i : i - 1}`);
}
