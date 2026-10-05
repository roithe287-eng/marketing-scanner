import {defineConfig} from 'vite';
import handler from './server/handler';
export default defineConfig({plugins:[{name:'pocket-local-api',configureServer(server){server.middlewares.use('/api/pocket',(req,res)=>{req.url='/api/pocket'+(req.url||'');void handler(req,res);});}}],build:{emptyOutDir:true,target:'es2022'}});
