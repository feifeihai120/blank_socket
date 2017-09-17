# blank_socket
白板多人共享，Socket通讯服务器

# 项目简介
使用Node.js开发，使用原生Socket的API实现白板共享数据。

# 目录简介
server 为服务器端代码

client 为客户端Demo演示代码

# 服务器启动方法
1、首先安装Node.js环境。（windows环境注意安装完成Node后需设置环境变量）

中文： http://nodejs.cn/

官方： https://nodejs.org/en/

2、在命令行进入项目下的`server`目录中。执行：

```
node ./index.js
```

显示出如下信息则表示启动成功：

```
>>[ServerListening] 0.0.0.0:3001
  服务器已成功启动，开始监听！
```

# 客户端启动方法
1、安装Node环境，如上。

2、在命令行进入项目下的`client`目录中。执行`node`命令，进入node执行环境。再输入：

```
.load ./index.js
```

若显示出如下信息则表示启动成功,且成功连接到服务器：

```
> 已连接到服务器: 127.0.0.1:3001
```

同时服务器会显示出新用户连接成功的日志：

```
>>[ServerConnection] 一个用户连接成功 127.0.0.1:63212
```

此时在客户端可以执行`action`来查看可以使用哪些命令：

```
> 已连接到服务器: 127.0.0.1:3001
> action
{ connect: [Function],
  login: [Function],
  setMaster: [Function],
  sendShare: [Function],
  cancelMaster: [Function],
  getClientList: [Function],
  getClientListAll: [Function] }
> 
```

其中：

```
/**
 * 连接服务器
 */
connect() 

/**
 * 客户端登录
 */
login(id: string, roomId: string, name: string) 

/**
 * 成为主持人（共享者）
 */
setMaster() 

/**
 * 发送共享数据
 * 
 * @param {*} d 共享数据
 */
sendShare(d: any)

/**
 * 取消成为主持人
 */
cancelMaster() 

/**
 * 获取当前房间内的客户端列表
 */
getClientList(roomId: string)

/**
 * 获取服务器上所有的客户端列表
 */
getClientListAll() 
```

在客户端中执行action中的各个方法，结合服务器端控制台输出看查看各项功能的使用和测试。

服务器端和客户端的监听/连接的IP地址和端口号都可以在项目目录中的index.js中查看并修改。

 