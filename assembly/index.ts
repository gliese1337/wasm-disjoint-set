@global
let id: u32 = 0;

@global
let msize: u32 = memory.size() * 65536;

@inline
function getId(): u32 {
  id += 4;
  if (id === msize) {
    memory.grow(1);
    msize += 65536;
  }

  return id;
}

export function add(): u32 {
  const id = getId();
  store<i32>(id, 0);
  return id;
}

export function find(x: u32): u32 {
  while(true) {
    const parent = load<i32>(x);
    if (parent <= 0 || parent === x) return x;
    const gp = load<i32>(parent);
    if (gp > 0 && gp !== parent) store<i32>(x, gp);
    x = parent;
  }

  return 0;
}

export function connected(a: u32, b: u32): boolean {
  return find(a) === find(b);
}

export function addTo(s: u32): u32 {
  const id = getId();
  s = find(s);
  store<i32>(s, load<i32>(s) - 1);
  store<i32>(id, s);
  return id;
}

export function union(a: u32, b: u32): boolean {
  a = find(a);
  b = find(b);

  if (a === b) return false;

  const ra = load<i32>(a);
  const rb = load<i32>(b);

  if (ra === rb) {
    store<i32>(a, ra - 1);
    store<i32>(b, a);
  } else if (ra < rb) {
    store<i32>(b, a);
  } else {
    store<i32>(a, b);
  }

  return true;
}

export function reserve(size: u32): u32 {
  size = size << 2
  while (id + size > msize) {
    memory.grow(1);
    msize += 65536;
  }

  return id + 4;
}

export function unionMany(start: u32, end: u32): u32 {
  let i = start;
  let a = find(load<u32>(i));
  let ra = load<i32>(a);
  let reductions: u32 = 0;

  while (i < end) {
    i += 4;
    const b = find(load<u32>(i));
    if (b === a) continue;
    reductions++;
    const rb = load<i32>(b);
    if (ra === rb) {
      store<i32>(a, --ra);
      store<i32>(b, a);
    } else if (ra < rb) {
      store<i32>(b, a);
    } else {
      store<i32>(a, b);
      a = b;
      ra = rb;
    }
  }

  return reductions;
}

export function findMany(start: u32, end: u32): void {
  for (let i = start; i < end; i += 4) {
    store<u32>(i, find(load<u32>(i)));
  }
}

export function addMany(size: u32): u32 {
  reserve(size);
  const start = id + 4;
  const end = id + (size << 2);
  for (let i = start; i <= end; i += 4) {
    store<i32>(i, 0);
  }

  id = end;

  return start;
}