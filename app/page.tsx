"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { compileFormula } from "../lib/math";

type Surface = { name: string; formula: string; fn: (x: number, y: number) => number };
const surfaces: Surface[] = [
  { name: "Onda sinusoidal", formula: "sin(x) * cos(y)", fn: (x, y) => Math.sin(x) * Math.cos(y) },
  { name: "Paraboloide", formula: "(x^2 + y^2) / 5 - 1.7", fn: (x, y) => (x * x + y * y) / 5 - 1.7 },
  { name: "Silla de montar", formula: "(x^2 - y^2) / 5", fn: (x, y) => (x * x - y * y) / 5 },
  { name: "Campana", formula: "3 * exp(-(x^2+y^2)/4) - 1.2", fn: (x, y) => 3 * Math.exp(-(x * x + y * y) / 4) - 1.2 },
  { name: "Ondas radiales", formula: "2.4*sin(2*sqrt(x^2+y^2))/(0.7*sqrt(x^2+y^2)+1)", fn: (x, y) => { const r = Math.hypot(x, y); return 2.4 * Math.sin(2 * r) / (0.7 * r + 1) } },
];

function SurfaceCanvas({ surface, grid }: { surface: Surface; grid: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ x: -0.62, z: -0.72 });
  const zoom = useRef(1);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height; ctx.clearRect(0, 0, w, h);
    const project = (x: number, y: number, z: number) => {
      const cz = Math.cos(rotation.current.z), sz = Math.sin(rotation.current.z);
      const cx = Math.cos(rotation.current.x), sx = Math.sin(rotation.current.x);
      const x1 = x * cz - y * sz, y1 = x * sz + y * cz;
      const z2 = y1 * sx + z * cx, scale = Math.min(w, h) * 0.075 * zoom.current;
      return { x: w * 0.55 + x1 * scale, y: h * 0.54 - z2 * scale, depth: y1 * cx - z * sx };
    };
    const n = 34;
    const cells: { pts: ReturnType<typeof project>[]; z: number; depth: number }[] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const coords = [[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([a,b]) => {
        const x = -4 + a * 8 / (n - 1), y = -4 + b * 8 / (n - 1), z = surface.fn(x, y);
        return { ...project(x, y, z), z };
      });
      cells.push({ pts: coords, z: coords.reduce((s,p)=>s+p.z,0)/4, depth: coords.reduce((s,p)=>s+p.depth,0)/4 });
    }
    cells.sort((a,b) => a.depth - b.depth);
    for (const cell of cells) {
      const hue = 178 + Math.max(-2.5, Math.min(2.5, cell.z)) * 13;
      ctx.beginPath(); ctx.moveTo(cell.pts[0].x, cell.pts[0].y); cell.pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 67%, ${47 + cell.z * 3}%, .94)`; ctx.fill();
      if (grid) { ctx.strokeStyle = "rgba(5,46,43,.34)"; ctx.lineWidth = .55; ctx.stroke() }
    }
    const axes = [
      { a: project(-5,0,0), b: project(5,0,0), c: "#ef8354", t: "X" },
      { a: project(0,-5,0), b: project(0,5,0), c: "#78c6a3", t: "Y" },
      { a: project(0,0,-2.5), b: project(0,0,3.5), c: "#f6bd60", t: "Z" },
    ];
    ctx.font = "600 13px Arial";
    axes.forEach(a => { ctx.beginPath(); ctx.moveTo(a.a.x,a.a.y); ctx.lineTo(a.b.x,a.b.y); ctx.strokeStyle=a.c; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle=a.c; ctx.fillText(a.t,a.b.x+5,a.b.y) });
  }, [surface, grid, version]);

  return <canvas ref={canvasRef} aria-label={`Gráfica tridimensional: ${surface.name}`}
    onPointerDown={e=>{dragging.current=true; last.current={x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(!dragging.current)return; rotation.current.z+=(e.clientX-last.current.x)*.009; rotation.current.x+=(e.clientY-last.current.y)*.009; last.current={x:e.clientX,y:e.clientY}; setVersion(v=>v+1)}}
    onPointerUp={()=>dragging.current=false}
    onWheel={e=>{e.preventDefault(); zoom.current=Math.max(.55,Math.min(1.8,zoom.current-e.deltaY*.001)); setVersion(v=>v+1)}} />;
}

export default function Home() {
  const [selected, setSelected] = useState(0), [grid, setGrid] = useState(true);
  const [formula, setFormula] = useState(surfaces[0].formula), [error, setError] = useState("");
  const [surface, setSurface] = useState(surfaces[0]);
  const [arMessage,setArMessage]=useState(""),[canAR,setCanAR]=useState<boolean|null>(null),[mobileAR]=useState(()=>typeof navigator!=="undefined"&&(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1))),[copied,setCopied]=useState(false);
  const arRef=useRef<(HTMLElement&{activateAR?:()=>Promise<void>;canActivateAR?:boolean})|null>(null);
  const arStarted=useRef(false);
  const modelUrl=useMemo(()=>`/api/model?f=${encodeURIComponent(surface.formula)}&model=grid-axes-v1`,[surface.formula]);
  useEffect(()=>{void import("@google/model-viewer")},[]);
  useEffect(()=>{
    const model=arRef.current;if(!model)return;
    const check=()=>setCanAR(Boolean(model.canActivateAR));
    const status=(event:Event)=>{const value=(event as CustomEvent<{status?:string}>).detail?.status;if(value==="session-started"||value==="object-placed"){arStarted.current=true;setArMessage("")}if(value==="failed-session-start")setArMessage("El navegador rechazó la sesión de cámara. En iPhone, usa Compartir y selecciona “Abrir en Safari”; en Android, abre el enlace directamente en Chrome.")};
    model.addEventListener("load",check);model.addEventListener("ar-status",status);const timer=setTimeout(check,1400);
    return()=>{clearTimeout(timer);model.removeEventListener("load",check);model.removeEventListener("ar-status",status)};
  },[modelUrl]);
  const choose = (index:number) => { setSelected(index); setFormula(surfaces[index].formula); setSurface(surfaces[index]); setError("") };
  const generate = () => { try { setSurface({name:"Superficie personalizada",formula,fn:compileFormula(formula)}); setError("") } catch(e) { setError(e instanceof Error?e.message:"Revisa la ecuación.") } };
  const openAR=async()=>{setCopied(false);arStarted.current=false;if(!arRef.current?.activateAR){setArMessage("El visor 3D todavía está cargando. Espera un momento y vuelve a intentarlo.");return}if(!mobileAR&&!canAR){setArMessage("Este navegador de escritorio no puede abrir la cámara AR. Abre esta misma página en Safari desde iPhone/iPad o en Chrome desde Android.");return}setArMessage("Preparando el modelo y solicitando acceso a la cámara…");try{await arRef.current.activateAR();setTimeout(()=>{if(!arStarted.current&&document.visibilityState==="visible")setArMessage("El visor no pudo abrirse dentro de este navegador. En iPhone, usa Compartir y elige “Abrir en Safari”; después pulsa nuevamente Ver en AR.")},2800)}catch{setArMessage("No fue posible iniciar la RA. Comprueba los permisos de cámara e inténtalo nuevamente.")}};
  const copyLink=async()=>{await navigator.clipboard.writeText(location.href);setCopied(true)};
  return <main>
    <header><div className="brand"><span className="mark">∿</span><div><b>SyborX</b><small>Laboratorio de Cálculo</small></div></div><span className="status"><i /> Prototipo educativo</span></header>
    <section className="hero">
      <div className="intro"><span className="eyebrow">CÁLCULO VECTORIAL · UNIDAD 4</span><h1>De la ecuación al<br/><em>espacio real.</em></h1><p>Explora superficies matemáticas en tres dimensiones y prepáralas para llevarlas a realidad aumentada.</p></div>
      <div className="workspace">
        <aside>
          <div className="step"><span>01</span><div><b>Selecciona una superficie</b><small>Comienza con un ejemplo</small></div></div>
          <div className="chips">{surfaces.map((s,i)=><button key={s.name} className={selected===i?"active":""} onClick={()=>choose(i)}>{s.name}</button>)}</div>
          <label htmlFor="formula">ECUACIÓN · z = f(x,y)</label><div className="formula"><span>ƒ</span><input id="formula" value={formula} onChange={e=>{setFormula(e.target.value);setSelected(-1)}} onKeyDown={e=>{if(e.key==="Enter")generate()}}/></div>
          {error && <p className="error">{error}</p>}
          <div className="range"><div><span className="rangeLabel">INTERVALO X</span><span>−4.0 <i/> 4.0</span></div><div><span className="rangeLabel">INTERVALO Y</span><span>−4.0 <i/> 4.0</span></div></div>
          <button className="generate" onClick={generate}>Generar superficie <span>→</span></button>
        </aside>
        <div className="viewer">
          <div className="viewerTop"><div><span className="live">VISTA 3D</span><b>{surface.name}</b></div><div className="tools"><button onClick={()=>setGrid(!grid)}>{grid?"Ocultar":"Mostrar"} malla</button><button onClick={openAR}>{mobileAR||canAR?"Ver en AR ↗":"Cómo ver en AR"}</button></div></div>
          <SurfaceCanvas surface={surface} grid={grid}/><div className="hint">Arrastra para girar · Desliza para acercar</div>
          <div className="legend"><span><i className="low"/>Mínimo</span><span><i className="mid"/>0</span><span><i className="high"/>Máximo</span></div>
          {createElement("model-viewer",{ref:arRef,src:modelUrl,alt:`Modelo 3D de ${surface.name}`,ar:true,"ar-modes":"webxr scene-viewer quick-look","ar-placement":"floor","camera-controls":true,className:"arModel"})}
          <a className="download" href={modelUrl} download="superficie-syborx.glb">Descargar modelo 3D</a>
          {arMessage&&<div className="arMessage" role="status"><button className="closeMessage" aria-label="Cerrar" onClick={()=>setArMessage("")}>×</button><b>Realidad aumentada en celular</b><span>{arMessage}</span><button className="copyLink" onClick={copyLink}>{copied?"Enlace copiado ✓":"Copiar enlace para el celular"}</button></div>}
        </div>
      </div>
    </section>
    <footer><span>Prototipo fase 2 · Visualización y exportación 3D</span><span>Compatible con realidad aumentada móvil</span></footer>
  </main>;
}
