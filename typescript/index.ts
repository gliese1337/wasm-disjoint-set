import B64 from './wasm.base64';

const compiled = new WebAssembly.Module(Buffer.from(B64, "base64"));

export class DisjointSet {
  private readonly wasm = new WebAssembly.Instance(compiled, {}).exports;
  private readonly map = new Map<unknown, number>();
  private _sets = 0;
  private _elements = 0;

  private readonly _asm_add: () => number = this.wasm.add;
  public asm_add(): number {
    this._elements++;
    this._sets++;
    return this._asm_add();
  }

  private readonly _asm_addTo: (s: number) => number = this.wasm.addTo;
  public asm_addTo(s: number): number {
    this._elements++;
    return this._asm_addTo(s);
  }

  private readonly _asm_union: (a: number, b: number) => boolean = this.wasm.union;
  public asm_union(a: number, b: number): number {
   if(this._asm_union(a, b)){
     this._sets--;
   }

   return this._sets;
  }

  public readonly asm_find: (e: number) => number = this.wasm.find;
  public readonly asm_connected: (a: number, b: number) => boolean = this.wasm.connected;

  private readonly _asm_reserve: (size: number) => number = this.wasm.reserve;
  private readonly _asm_unionMany: (start: number, end: number) => number = this.wasm.unionMany;
  private readonly _asm_findMany: (start: number, end: number) => void = this.wasm.findMany;
  private readonly _asm_addMany: (size: number) => number = this.wasm.addMany;

  get ssize(): number { return this._sets; }
  get esize(): number { return this._elements; }

  public has(e: unknown): boolean {
    return this.map.has(e);
  }

  public getId(e: unknown): number {
    if (!this.map.has(e)) throw new Error('Element does not exist');

    return this.map.get(e) as number;
  }

  private check(e: unknown): void {
    if (this.map.has(e)) throw new Error('Key already exists');
  }

  public add(e: unknown): number {
    this.check(e);
    const id = this.wasm.add();
    this.map.set(e, id);
    this._sets++;
    this._elements++;
    
    return id;
  }

  public addTo(e: unknown, s: number): number {
    this.check(e);
    const id = this.wasm.addTo(s);
    this.map.set(e, id);
    this._elements++;
    
    return id;
  }

  public addToRep(e: unknown, s: unknown): number {
    this.check(e);
    const id = this.wasm.addTo(this.getId(s));
    this.map.set(e, id);
    this._elements++;
    
    return id;
  }

  public find(e: unknown): number {
    return this.asm_find(this.getId(e));
  }

  public connected(a: unknown, b: unknown): boolean {
    return this.asm_connected(this.getId(a), this.getId(b));
  }

  public union(a: unknown, b: unknown): number {
    return this.asm_union(this.getId(a), this.getId(b));
  }

  public unionWith(e: unknown, s: number): void {
    this.asm_union(this.getId(e), s);
  }

  private copy(arr: number[]): [ number, number ] {
    const id = this._asm_reserve(arr.length);
    (new Uint32Array(this.wasm.memory.buffer, id, arr.length)).set(arr);
    return [id, id + arr.length * 4];
  }

  public asm_unionMany(...es: number[]): number {
    this._sets -= this._asm_unionMany(...this.copy(es));

    return this._sets;
  }

  public unionMany(...es: number[]): number {
    return this.asm_unionMany(...es.map((e) => this.getId(e)));
  }
  
  public asm_findMany(...es: number[]): void {
    this._asm_findMany(...this.copy(es));
  }
  
  public findMany(...es: unknown[]): void {
    this.asm_findMany(...this.copy(es.map((e) => this.getId(e))));
  }
    
  public asm_addMany(size: number): number[] {
    const firstId = this._asm_addMany(size);
    this._elements += size;

    return Array.from({ length: size }, (_, i) => firstId + i * 4);
  }

  public addMany(...es: unknown[]): number[] {
    const { map } = this;
    if (es.some((e) => map.has(e))) throw new Error("Key already exists");
    const size = es.length;
    const ids = this.asm_addMany(size);
    for (let i = 0; i < size; i++) {
      map.set(es[i], ids[i]);
    }

    return ids;
  }

  public extract(): Set<unknown>[] {
    const sets: { [key: number]: Set<unknown> } = {};
    const find = this.asm_find;
    for (const [ e, id ] of this.map) {
      const sid = find(id);
      const s = sets[sid];
      if (s) s.add(e);
      else sets[sid] = new Set([e]);
    }

    return Object.values(sets);
  }
}
