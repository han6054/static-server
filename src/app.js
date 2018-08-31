let config = require('./config');
let http = require('http');
let chalk = require('chalk');
let path = require('path');
let url = require('url');
let {promisify} = require('util');
let fs = require('fs');
let stat = promisify(fs.stat);
let mime = require('mime');
let ejs = require('ejs');
let readdir = promisify(fs.readdir);
let zlib = require('zlib');
function list() {
    let tpl = fs.readFileSync(path.resolve(__dirname,'template','list.ejs'),'utf8');
    return tpl
}
class Server{
    constructor(argv){
     this.list = list();
     this.config = Object.assign({},config,argv)
    }
    start(){
      let server = http.createServer();
      server.on('request',this.request.bind(this));
      server.listen(this.config.port,()=>{
          let url = `${this.config.host}:${this.config.port}`;
          console.log(`server start at ${chalk.green(url)}`)
      })
    }
    async request(req,res){
        try{
            let {pathname} = url.parse(req.url,true);
            let filepath = path.join(this.config.root,pathname);
            let statObj = await stat(filepath);
            if(statObj.isDirectory()){
               let files = await readdir(filepath);
               files = files.map(file=>({
                   name:file,
                   url:path.join(pathname,file)
               }));
               let tpl = this.list;
               let html = ejs.render(tpl,{
                   title:pathname,
                   files,
               });
                res.setHeader('Content-Type','text/html;charset=utf8');
                res.end(html)
            }else{
                this.sendFile(req,res,filepath,statObj)
            }
        }catch (e){
           this.sendError(req,res)
        }

    }
    sendFile(req,res,filepath,statObj){
        res.setHeader('Content-Type', mime.getType(filepath) + ';charset=utf-8');
        let encoding = this.getEncoding(req, res);
        let rs = this.getStream(req, res, filepath, statObj);

        if (encoding) {
            rs.pipe(encoding).pipe(res);
        } else {
            rs.pipe(res);
        }
    }
    handleCache(req,res,filepath,statObj){
        let isNoneMatch = req.headers['is-none-match'];
        res.setHeader('Expires',new Date(Date.now() + 30 *1000).toGMTString());
        let etag = statObj.size;
        let ifModifiedSince = req.headers['if-modified-since'];
        let lastModified = statObj.ctime.toGMTString();
        res.setHeader('ETag',etag);
        res.setHeader('Last-Modified',lastModified);
        //如果任何一个对比缓存头不匹配，则不走缓存
        if(isNoneMatch && isNoneMatch !== etag){
            return false
        }
        if(lastModified && lastModified !==ifModifiedSince){
           return false
        }
        if (isNoneMatch || ifModifiedSince) {
            res.writeHead(304);
            res.end();
            return true;
        } else {
            return false;
        }

    }
    sendError(req,res){
        res.statusCode = 500;
        res.end('there is something wrong in the server! please try later!')
    }
    getEncoding(req,res){
       let acceptEncoding = req.headers['accept-encoding'];
       if(/\bgzip\b/.test(acceptEncoding)){
           res.setHeader('Content-Encoding','gzip');
           return zlib.createGzip();
       }else if(/\bdeflate\b/.test(acceptEncoding)){
           res.setHeader('Content-Encoding', 'deflate');
           return zlib.createDeflate();
       }else{
           return null;
       }
    }
    getStream(req, res, filepath, statObj) {
        let start = 0;
        let end = statObj.size - 1;
        let range = req.headers['range'];
        if (range) {
            res.setHeader('Accept-Range', 'bytes');
            res.statusCode = 206;//返回整个内容的一块
            let result = range.match(/bytes=(\d*)-(\d*)/);
            if (result) {
                start = isNaN(result[1]) ? start : parseInt(result[1]);
                end = isNaN(result[2]) ? end : parseInt(result[2]) - 1;
            }
        }
        return fs.createReadStream(filepath, {
            start, end
        });
    }
}
module.exports = Server;
// let server = new Server();
// server.start();
