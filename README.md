如果我们想在终端输入命令行启动一个服务，这是我们需要下载一个工具
```
npm  i yargs --save
```
yags 可以帮助我们解析命令行参数，把参数解析成对象

## 怎样处理缓存
#### 1.对比缓存
Last-Modified
- 当浏览器第一次请求服务器时，服务器会把缓存标识(`Last-Modified`)和数据一起返回客户端，再次请求时，服务器根据浏览器请求信息(`if-modified-since`)判断是否命中缓存，如果命中返回304状态码。
>  1 .但是如果文件修改比较频繁，如果一秒内修改多次那么，Last-Modified是没法准确判断了，因为他只能精确到秒。
2 . 如果文件的修改的时间变了，但是内容未改变，我们也不希望客户端认为文件修改了 。
3 .如果同样的一个文件位于多个CDN服务器上的时候内容虽然一样，修改时间不一样。


ETag
- 当浏览器二次请求的时候，服务器取出请求标识(`if-none-match`)，并根据实体内容生成一段哈希字符串，标识资源状态。当资源未改变命中缓存，反正不执行缓存。
#### 2.强制缓存
Cache-Control 和 Expires
  强制缓存的好处是浏览器不需要发送HTTP请求，一般不常更改的页面都会设置一个较长的强制缓存。
Cache-Control与Expires的作用一致，都是指明当前资源的有效期，控制浏览器是否直接从浏览器缓存取数据还是重新发请求到服务器取数据,如果同时设置的话，其优先级高于Expires。但Expires是HTTP1.0的内容，现在浏览器均默认使用HTTP1.1,所以基本可以忽略 。
Cache-Control  有几个参数
- private 客户端可以缓存
- public 客户端和代理服务器都可以缓存
- max-age=60 缓存内容将在60秒之后生效
- no-cache 需要使用对比缓存验证数据，强制向服务器再次发送
- no-store 所有内容都不会缓存，强制缓存和对比缓存都不会触发

下面用代码说话，是如何处理缓存的。
```
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
```
## 怎样处理压缩
浏览器请求头中，都会携带自己的压缩类型，最常用的两种是gzip和deflate，服务端可以根据Accept-Ecoding头来返回响应的压缩资源
具体实现代码：
```
    getEncoding(req,res){
       let acceptEncoding = req.headers['accept-encoding'];
       if(/\bgzip\b/.test(acceptEncoding)){
           res.setHeaders('Content-Encoding','gzip');
           return zlib.createGzip();
       }else if(/\bdeflate\b/.test(acceptEncoding)){
           res.setHeader('Content-Encoding', 'deflate');
           return zlib.createDeflate();
       }else{
           return null;
       }
    }
```
## 什么是断点续传
对一个文件根据我们请求头中`range`字段中对应的`bytes`的值，下载文件内容。
```
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
```
源代码 [Github地址]()











