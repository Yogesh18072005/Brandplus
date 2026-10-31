'use client';
import { useEffect, useRef } from 'react';

/** A small, lazy WebGL material study: three evidence layers, opened for inspection. */
export default function EvidenceSculpture() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      import('three').then(T => {
        if (disposed) return;
        let renderer: import('three').WebGLRenderer;
        try { renderer = new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'}); } catch { return; }
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
        renderer.setClearColor(0x000000,0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        host.appendChild(renderer.domElement);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(34,1,.1,50);
        camera.position.set(0,0,9);
        const group = new T.Group(); group.rotation.set(-.38,-.48,-.1); scene.add(group);
        const geometry = new T.BoxGeometry(3.4,2.3,.13);
        const materials = [0xeceafe,0x9590ec,0x553bf3].map((color,i) => new T.MeshPhysicalMaterial({color,roughness:.24,metalness:.1,transparent:true,opacity:i===0?.85:.98,clearcoat:1,clearcoatRoughness:.18}));
        const plates = materials.map((mat,i) => { const mesh = new T.Mesh(geometry,mat); mesh.position.set((i-1)*.35,(i-1)*.12,(i-1)*.65); group.add(mesh); return mesh; });
        const edges = new T.EdgesGeometry(geometry);
        const edgeMat = new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.65});
        plates.forEach(mesh => mesh.add(new T.LineSegments(edges,edgeMat)));
        const lineGeo = new T.BoxGeometry(2.1,.055,.02);
        const lineMat = new T.MeshBasicMaterial({color:0xf3f2fe});
        for(let i=0;i<4;i++){ const line = new T.Mesh(lineGeo,lineMat);line.position.set(-.12,.6-i*.3,.085);line.scale.x=1-i*.14;plates[2]?.add(line); }
        scene.add(new T.AmbientLight(0xffffff,2.5));
        const key=new T.DirectionalLight(0xffffff,4);key.position.set(3,5,7);scene.add(key);
        const fill=new T.DirectionalLight(0xb8b2fb,2);fill.position.set(-4,0,3);scene.add(fill);
        let raf=0,tx=-.48,ty=-.38,visible=true;
        const reduced=matchMedia('(prefers-reduced-motion: reduce)');
        const render=()=>renderer.render(scene,camera);
        const size=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();};
        const resize=new ResizeObserver(size);resize.observe(host);size();
        const tick=()=>{if(disposed||!visible)return;group.rotation.y+=(tx-group.rotation.y)*.065;group.rotation.x+=(ty-group.rotation.x)*.065;render();if(Math.abs(tx-group.rotation.y)+Math.abs(ty-group.rotation.x)>.001)raf=requestAnimationFrame(tick);else raf=0;};
        const move=(event:PointerEvent)=>{if(reduced.matches)return;const box=host.getBoundingClientRect();tx=-.48+(event.clientX-box.left)/box.width*.45;ty=-.38+(event.clientY-box.top)/box.height*.2;if(!raf)raf=requestAnimationFrame(tick);};
        const leave=()=>{tx=-.48;ty=-.38;if(!raf&&!reduced.matches)raf=requestAnimationFrame(tick);};
        host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
        const visibility=new IntersectionObserver(([e])=>{visible=!!e?.isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;}else render();});visibility.observe(host);
        cleanup=()=>{cancelAnimationFrame(raf);resize.disconnect();visibility.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);geometry.dispose();edges.dispose();edgeMat.dispose();lineGeo.dispose();lineMat.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
      }).catch(()=>{});
    },{rootMargin:'150px'});
    observer.observe(host);
    return()=>{disposed=true;observer.disconnect();cleanup();};
  },[]);
  return <div className="at-sculpture" ref={root} aria-hidden="true"><div className="at-sculpture-fallback"><i/><i/><i/></div></div>;
}

