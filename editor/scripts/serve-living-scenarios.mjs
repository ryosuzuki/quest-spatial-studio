import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const audit=process.env.SPATIAL_AUDIT||'/Users/ryosuzuki/Storage/outputs/spatial-video-replay/2026-10-02/new-take-215403/audit';
createServer(async(req,res)=>{try{const u=decodeURIComponent(req.url.split('?')[0]);const base=u.startsWith('/audit/')?audit:root;const p=resolve(base,u.startsWith('/audit/')?u.slice(7):'.'+(u==='/'?'/living-scenarios.html':u));if(!p.startsWith(base+sep))throw Error('path');const b=await readFile(p);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png'})[extname(p)]||'application/octet-stream');res.end(b);}catch{res.writeHead(404);res.end();}}).listen(Number(process.env.PORT||8795),'127.0.0.1',()=>console.log('Open http://127.0.0.1:8795/living-scenarios.html'));
