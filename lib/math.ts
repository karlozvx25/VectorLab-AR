export type MathFn = (x: number, y: number) => number;

type Token = { kind: "number" | "name" | "op" | "eof"; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      const start = i++;
      while (i < source.length && /[0-9.eE]/.test(source[i])) i++;
      if (i < source.length && /[+-]/.test(source[i]) && /[eE]/.test(source[i - 1])) i++;
      const value = source.slice(start, i);
      if (!Number.isFinite(Number(value))) throw new Error("Número inválido.");
      tokens.push({ kind: "number", value }); continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const start = i++;
      while (i < source.length && /[a-zA-Z]/.test(source[i])) i++;
      tokens.push({ kind: "name", value: source.slice(start, i).toLowerCase() }); continue;
    }
    if ("+-*/^()".includes(c)) { tokens.push({ kind: "op", value: c }); i++; continue }
    throw new Error(`Símbolo no permitido: ${c}`);
  }
  tokens.push({ kind: "eof", value: "" });
  return tokens;
}

export function compileFormula(value: string): MathFn {
  const source = value.trim().replace(/^z\s*=\s*/i, "");
  if (!source || source.length > 180) throw new Error("Escribe una ecuación más corta.");
  const tokens = tokenize(source); let at = 0;
  const peek = () => tokens[at];
  const take = (value?: string) => { const t = tokens[at++]; if (value && t.value !== value) throw new Error(`Se esperaba “${value}”.`); return t };
  type Node = (x:number,y:number)=>number;
  const primary = ():Node => {
    const token = peek();
    if (token.kind === "number") { take(); const n=Number(token.value); return ()=>n }
    if (token.value === "(") { take("("); const node=expression(); take(")"); return node }
    if (token.kind === "name") {
      const name=take().value;
      if (name === "x") return x=>x;
      if (name === "y") return (_x,y)=>y;
      if (name === "pi") return ()=>Math.PI;
      const functions:Record<string,(n:number)=>number>={sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,log:Math.log};
      const fn=functions[name]; if(!fn) throw new Error(`Función no permitida: ${name}.`);
      take("("); const arg=expression(); take(")"); return (x,y)=>fn(arg(x,y));
    }
    throw new Error("La ecuación está incompleta.");
  };
  const unary = ():Node => { if(peek().value==="+"){take();return unary()} if(peek().value==="-"){take();const n=unary();return(x,y)=>-n(x,y)} return primary() };
  const power = ():Node => { let left=unary(); if(peek().value==="^"){take();const right=power(),a=left;left=(x,y)=>Math.pow(a(x,y),right(x,y))} return left };
  const product = ():Node => { let left=power(); while(peek().value==="*"||peek().value==="/"){const op=take().value,right=power(),a=left;left=op==="*"?(x,y)=>a(x,y)*right(x,y):(x,y)=>a(x,y)/right(x,y)} return left };
  const expression = ():Node => { let left=product(); while(peek().value==="+"||peek().value==="-"){const op=take().value,right=product(),a=left;left=op==="+"?(x,y)=>a(x,y)+right(x,y):(x,y)=>a(x,y)-right(x,y)} return left };
  const fn=expression(); if(peek().kind!=="eof") throw new Error("Revisa los paréntesis y operadores.");
  const test=fn(.7,1.1); if(!Number.isFinite(test)) throw new Error("La función no produce valores válidos.");
  return (x,y)=>{const z=fn(x,y);return Number.isFinite(z)?Math.max(-12,Math.min(12,z)):0};
}
