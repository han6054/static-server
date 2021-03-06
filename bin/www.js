let yargs = require('yargs');
let Server = require('../src/app.js');
let argv = yargs.option('d', {
    alias: 'root',
    demand: false,
    type: 'string',
    default: process.cwd(),
    description: '静态文件跟目录'
}).option('p', {
    alias: 'port',
    demand: false,
    type: 'string',
    default: 'localhost',
    description: '请配置端口号'
}).option('o', {
    alias: 'host',
    demand: false,
    type: 'string',
    default: '8080',
    description: '请配置监听主机'
})
    .usage('static-server')
    .example('static-server -d / -p 8080 -o localhost ').help('h').argv;

let server = new Server(argv);
server.start();