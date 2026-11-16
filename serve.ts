import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg'};
createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);if(path==='/')path='/game/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(8080,'127.0.0.1',()=>console.log('EMBERFALL KEEP: http://localhost:8080'));
