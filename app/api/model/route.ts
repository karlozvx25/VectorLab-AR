import { compileFormula } from "../../../lib/math";

export const runtime = "edge";
const pad4=(n:number)=>(n+3)&~3;
type V=[number,number,number];

function makeGlb(formula:string){
  const fn=compileFormula(formula),n=45,raw:number[]=[];let minZ=Infinity,maxZ=-Infinity;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-4+i*8/(n-1),z=-4+j*8/(n-1),y=fn(x,z);minZ=Math.min(minZ,y);maxZ=Math.max(maxZ,y);raw.push(x,y,z)}
  const pos:number[]=[],norm:number[]=[],groups:number[][]=[[],[],[],[],[]];
  const vertex=(p:V,no:V=[0,1,0])=>{const k=pos.length/3;pos.push(...p);norm.push(...no);return k};
  const tri=(g:number,a:number,b:number,c:number)=>groups[g].push(a,b,c);
  const point=(x:number,z:number,offset=0):V=>[x*.1,(fn(x,z)-minZ)*.085+offset,z*.1];

  // Superficie principal.
  for(let k=0;k<n*n;k++)pos.push(raw[k*3]*.1,(raw[k*3+1]-minZ)*.085,raw[k*3+2]*.1);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const il=Math.max(0,i-1),ir=Math.min(n-1,i+1),jd=Math.max(0,j-1),ju=Math.min(n-1,j+1),x=-4+i*8/(n-1),z=-4+j*8/(n-1);const dx=fn(-4+ir*8/(n-1),z)-fn(-4+il*8/(n-1),z),dz=fn(x,-4+ju*8/(n-1))-fn(x,-4+jd*8/(n-1)),nx=-dx*.085,nz=-dz*.085,ny=(ir-il)*8/(n-1)*.1,len=Math.hypot(nx,ny,nz)||1;norm.push(nx/len,ny/len,nz/len)}
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;tri(0,a,c,b);tri(0,b,c,d)}

  // Malla como cintas tridimensionales ligeramente elevadas: permanece visible en AR.
  const ribbon=(a:V,b:V,c:V,d:V)=>{const ia=vertex(a),ib=vertex(b),ic=vertex(c),id=vertex(d);tri(1,ia,ib,ic);tri(1,ib,id,ic)};
  const step=4,w=.025,raise=.004;
  for(let line=0;line<n;line+=step){const z=-4+line*8/(n-1);for(let i=0;i<n-1;i++){const x0=-4+i*8/(n-1),x1=-4+(i+1)*8/(n-1);ribbon(point(x0,z-w,raise),point(x1,z-w,raise),point(x0,z+w,raise),point(x1,z+w,raise))}}
  for(let line=0;line<n;line+=step){const x=-4+line*8/(n-1);for(let j=0;j<n-1;j++){const z0=-4+j*8/(n-1),z1=-4+(j+1)*8/(n-1);ribbon(point(x-w,z0,raise),point(x+w,z0,raise),point(x-w,z1,raise),point(x+w,z1,raise))}}

  // Flechas X, Y y Z construidas con triángulos para máxima compatibilidad móvil.
  const box=(g:number,min:V,max:V)=>{const faces:[V,V,V,V,V][]=[[[min[0],min[1],max[2]],[max[0],min[1],max[2]],[min[0],max[1],max[2]],[max[0],max[1],max[2]],[0,0,1]],[[max[0],min[1],min[2]],[min[0],min[1],min[2]],[max[0],max[1],min[2]],[min[0],max[1],min[2]],[0,0,-1]],[[max[0],min[1],max[2]],[max[0],min[1],min[2]],[max[0],max[1],max[2]],[max[0],max[1],min[2]],[1,0,0]],[[min[0],min[1],min[2]],[min[0],min[1],max[2]],[min[0],max[1],min[2]],[min[0],max[1],max[2]],[-1,0,0]],[[min[0],max[1],max[2]],[max[0],max[1],max[2]],[min[0],max[1],min[2]],[max[0],max[1],min[2]],[0,1,0]],[[min[0],min[1],min[2]],[max[0],min[1],min[2]],[min[0],min[1],max[2]],[max[0],min[1],max[2]],[0,-1,0]]];for(const f of faces){const a=vertex(f[0],f[4]),b=vertex(f[1],f[4]),c=vertex(f[2],f[4]),d=vertex(f[3],f[4]);tri(g,a,b,c);tri(g,b,d,c)}};
  const pyramid=(g:number,base:V[],tip:V)=>{const center:V=[(base[0][0]+base[2][0])/2,(base[0][1]+base[2][1])/2,(base[0][2]+base[2][2])/2];const ci=vertex(center);for(let i=0;i<4;i++){const a=vertex(base[i]),b=vertex(base[(i+1)%4]),t=vertex(tip);tri(g,a,b,t);tri(g,ci,b,a)}};
  const baseY=Math.max(.016,(0-minZ)*.085+.016),th=.009,maxY=(maxZ-minZ)*.085;
  box(2,[-.5,baseY-th,-th],[.48,baseY+th,th]);pyramid(2,[[.48,baseY-th,-.026],[.48,baseY-th,.026],[.48,baseY+th,.026],[.48,baseY+th,-.026]],[.56,baseY,0]);
  box(3,[-th,.005,-th],[th,maxY+.07,th]);pyramid(3,[[-.026,maxY+.07,-.026],[.026,maxY+.07,-.026],[.026,maxY+.07,.026],[-.026,maxY+.07,.026]],[0,maxY+.15,0]);
  box(4,[-th,baseY-th,-.5],[th,baseY+th,.48]);pyramid(4,[[-.026,baseY-th,.48],[.026,baseY-th,.48],[.026,baseY+th,.48],[-.026,baseY+th,.48]],[0,baseY,.56]);

  const positions=new Float32Array(pos),normals=new Float32Array(norm),arrays=groups.map(g=>new Uint32Array(g)),chunks:Uint8Array[]=[new Uint8Array(positions.buffer),new Uint8Array(normals.buffer),...arrays.map(a=>new Uint8Array(a.buffer))],offsets:number[]=[];let total=0;for(const chunk of chunks){offsets.push(total);total+=pad4(chunk.byteLength)}const bin=new Uint8Array(total);chunks.forEach((c,i)=>bin.set(c,offsets[i]));
  const bufferViews=chunks.map((c,i)=>({buffer:0,byteOffset:offsets[i],byteLength:c.byteLength,target:i<2?34962:34963}));
  const accessors:Array<Record<string,unknown>>=[{bufferView:0,componentType:5126,count:positions.length/3,type:"VEC3",min:[-.56,0,-.56],max:[.56,maxY+.15,.56]},{bufferView:1,componentType:5126,count:normals.length/3,type:"VEC3"},...arrays.map((a,i)=>({bufferView:i+2,componentType:5125,count:a.length,type:"SCALAR"}))];
  const materials=[{name:"Superficie",pbrMetallicRoughness:{baseColorFactor:[.04,.56,.47,1],metallicFactor:.03,roughnessFactor:.55},doubleSided:true},{name:"Malla",pbrMetallicRoughness:{baseColorFactor:[.015,.11,.1,1],metallicFactor:0,roughnessFactor:.7},doubleSided:true},{name:"Eje X",pbrMetallicRoughness:{baseColorFactor:[.94,.25,.16,1],metallicFactor:0,roughnessFactor:.55}},{name:"Eje Y",pbrMetallicRoughness:{baseColorFactor:[.2,.72,.36,1],metallicFactor:0,roughnessFactor:.55}},{name:"Eje Z",pbrMetallicRoughness:{baseColorFactor:[.98,.69,.16,1],metallicFactor:0,roughnessFactor:.55}}];
  const primitives=groups.map((_g,i)=>({attributes:{POSITION:0,NORMAL:1},indices:i+2,material:i}));
  const json={asset:{version:"2.0",generator:"SyborX Calculus Lab"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:"Superficie con malla y ejes"}],meshes:[{primitives}],materials,buffers:[{byteLength:total}],bufferViews,accessors};
  const jsonBytes=new TextEncoder().encode(JSON.stringify(json)),jsonLen=pad4(jsonBytes.length),length=12+8+jsonLen+8+total,out=new ArrayBuffer(length),view=new DataView(out),bytes=new Uint8Array(out);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,length,true);view.setUint32(12,jsonLen,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(0x20,20,20+jsonLen);bytes.set(jsonBytes,20);const binStart=20+jsonLen;view.setUint32(binStart,total,true);view.setUint32(binStart+4,0x004e4942,true);bytes.set(bin,binStart+8);return out;
}

export async function GET(request:Request){try{const formula=new URL(request.url).searchParams.get("f")??"sin(x)*cos(y)";return new Response(makeGlb(formula),{headers:{"Content-Type":"model/gltf-binary","Content-Disposition":"inline; filename=superficie-syborx.glb","Cache-Control":"no-store"}})}catch(e){return Response.json({error:e instanceof Error?e.message:"Ecuación inválida"},{status:400})}}
