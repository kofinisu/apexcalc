const UNITS = { m: { len: 1 }, km: { len: 1000 }, s: { time: 1 }, h: { time: 3600 }, kg: { mass: 1 }, g: { mass: 0.001 } };
export function convert(value, fromUnit, toUnit) {
  const a = Object.hasOwn(UNITS, fromUnit) ? UNITS[fromUnit] : null, b = Object.hasOwn(UNITS, toUnit) ? UNITS[toUnit] : null;
  if (!a || !b) throw new Error('Unknown unit');
  const dim = Object.keys(a)[0]; if (!Object.hasOwn(b, dim)) throw new Error('Incompatible units');
  return value * a[dim] / b[dim];
}
