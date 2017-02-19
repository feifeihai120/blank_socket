"use strict";
var net = require("net");
/** 服务器监听的IP地址 */
var HOST = "0.0.0.0";
/** 服务器监听的端口号 */
var PORT = 3001;
/** socket服务器 */
var server = net.createServer();
server.listen(PORT, HOST);
/** 所有已登录的客户端数组 */
var clientList = [];
/** 空函数 */
var noop = function () { };
/** 当有新客户端连接入服务器 */
server.on("connection", serverOnConnection);
function serverOnConnection(client) {
    log("ServerConnection", "一个用户连接成功 " + client.remoteAddress + ":" + client.remotePort);
    var clientOn = {
        /**
         * 客户端断开连接
         *
         * @param {boolean} had_error 是否因为错误而导致的断开。false为客户端主动断开，true为发生了错误而断开
         */
        close: function (had_error) {
            log("on-close", "\u4E00\u4E2A\u5BA2\u6237\u7AEF\u65AD\u5F00\u8FDE\u63A5! ID:" + client.id + " roomId:" + client.roomId + " name:" + client.name);
            //从客户端在线列表中删除
            clientList.splice(clientList.indexOf(client), 1);
            client.end();
            var clients = getClientsByRoom(client.roomId);
            emit.serverEmitClientList(clients, clients.map(function (c) { return createClientListItem(c); }));
        },
        // connect: function () {
        // },
        data: function (buffer) {
            var dataString;
            if (buffer instanceof Buffer) {
                dataString = buffer.toString();
            }
            else {
                dataString = buffer;
            }
            // console.log("服务器已接收到：" + dataString);
            //将客户端发送的字符串解析为事件模型
            var data = JSON.parse(dataString);
            //根据事件名匹配事件响应函数
            var onFn = clientOn[data.eventName];
            if (typeof onFn != "function")
                return;
            //检测用户是否已登录(未登录状态下只允许调用 登录接口)
            if (data.eventName != "clientEmitLogin" && client.id == undefined)
                return;
            //触发实际事件响应函数
            onFn.apply(client, [data.eventData]);
        },
        // drain: function () {
        // },
        end: function () {
        },
        // error: function (err: Error) {
        // },
        // lookup: function (err: Error, address: string, family: string | number, host: string) {
        // },
        // timeout: function () {
        // },
        //--------自定义事件-----------
        /**
         * 客户端手机登录
         *
         * @param {any} d
         */
        clientEmitLogin: function (d, ack) {
            client.id = d.id;
            client.name = d.name;
            client.roomId = d.roomId;
            client.isMaster = false;
            if (d.id == undefined || d.name == undefined || d.roomId == undefined) {
                return failACK(client, "clientEmitLogin", "\u767B\u5F55\u5931\u8D25\uFF0C\u9700\u8981id,name,roomId");
            }
            if (getClient(d.id, d.roomId) == undefined) {
                clientList.push(client);
                var clients = getClientsByRoom(client.roomId);
                emit.serverEmitClientList(clients, clients.map(function (c) { return createClientListItem(c); }));
                return successACK(client, "clientEmitLogin");
            }
            else {
                return failACK(client, "clientEmitLogin", "\u767B\u5F55\u5931\u8D25,\u5728\u623F\u95F4<" + d.roomId + ">\u4E2D\uFF0C\u5BA2\u6237\u7AEFID<" + d.id + ">\u5DF2\u5B58\u5728");
            }
        },
        /**
         * 客户端发送要成为主持人，即共享者。需要ack函数，返回是否成为主持人成功，若当前没有主持人则成功，若已经有主持人则失败
         *
         * @param {blank.clientEmitSetMasterData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitSetMasterACK>) => void} ack
         */
        clientEmitSetMaster: function (d, ack) {
            var master = getMasterByRoom(client.roomId);
            var clients = getClientsByRoom(client.roomId);
            if (master == undefined) {
                client.isMaster = true;
                emit.serverEmitStartShare(clients, {
                    masterId: client.id,
                    masterName: client.name
                });
                return successACK(client, "clientEmitSetMaster");
            }
            else {
                return failACK(client, "clientEmitSetMaster", "\u8BBE\u5B9A\u4E3B\u6301\u4EBA\u5931\u8D25,\u5728\u623F\u95F4<" + client.roomId + ">\u4E2D\uFF0C\u5BA2\u6237\u7AEFID<" + master.id + ">\u4E3A\u4E3B\u6301\u4EBA");
            }
        },
        /**
         * 客户端发送共享数据给服务器
         *
         * @param {blank.clientEmitSendShareData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitSendShareACK>) => void} ack
         */
        clientEmitSendShare: function (d, ack) {
            var clients = getClientsByRoom(client.roomId);
            if (!client.isMaster) {
                return failACK(client, "clientEmitSendShare", "发送共享数据失败，您当前不是主持人，不能发送共享数据");
            }
            emit.serverEmitSendShare(clients, {
                data: d.data
            });
            return successACK(client, "clientEmitSendShare");
        },
        /**
         * 客户端发送取消自己为主持人身份
         *
         * @param {blank.clientEmitCancelMasterData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitCancelMasterACK>) => void} ack
         */
        clientEmitCancelMaster: function (d, ack) {
            var master = getMasterByRoom(client.roomId);
            var clients = getClientsByRoom(client.roomId);
            if (master === client) {
                client.isMaster = false;
                emit.serverEmitEndShare(clients, {
                    masterId: client.id,
                    masterName: client.name
                });
                return successACK(client, "clientEmitCancelMaster");
            }
            else {
                return failACK(client, "clientEmitCancelMaster", "\u5F53\u524D\u5BA2\u6237\u7AEF\u4E0D\u662F\u4E3B\u6301\u4EBA\uFF0C\u65E0\u6CD5\u53D6\u6D88");
            }
        },
        /**
         * 客户端主动获取服务器当前房间内的客户端列表
         *
         * @param {blank.clientEmitGetClientListData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitGetClientListACK>) => void} ack
         */
        clientEmitGetClientList: function (d, ack) {
            var clients;
            if (d.roomId == undefined) {
                clients = clientList;
            }
            else {
                clients = getClientsByRoom(d.roomId);
            }
            emit.serverEmitClientList(client, clients.map(function (c) { return createClientListItem(c); }));
            return successACK(client, "clientEmitGetClientList");
        }
    };
    var emit = {
        /**
         * 服务器向客户端发送当前房间内的客户端列表
         */
        serverEmitClientList: function (socket, d, ack) {
            if (ack === void 0) { ack = noop; }
        },
        /**
         * 服务器向所有非主持人发送，开始共享
         */
        serverEmitStartShare: function (socket, d, ack) {
            if (ack === void 0) { ack = noop; }
        },
        /**
         * 服务器端转发共享数据给客户端
         */
        serverEmitSendShare: function (socket, d, ack) {
            if (ack === void 0) { ack = noop; }
        },
        /**
         * 服务器向所有非主持人发送，结束共享
         */
        serverEmitEndShare: function (socket, d, ack) {
            if (ack === void 0) { ack = noop; }
        }
    };
    //循环创建监听
    Object.keys(clientOn).forEach(function (event) {
        var oldOnFn = clientOn[event];
        clientOn[event] = function () {
            if (event != "data") {
                var logArgs = [].slice.call(arguments);
                if (typeof logArgs[logArgs.length - 1] == "function") {
                    logArgs[logArgs.length - 1] = "<Function>";
                }
                log.apply(this, ["on-" + event].concat(logArgs));
            }
            //--------------
            var args = [].slice.call(arguments);
            return oldOnFn.apply(this, args);
        };
        client.on(event, clientOn[event]);
    });
    //循环重写emit发出事件函数
    Object.keys(emit).forEach(function (event) {
        emit[event] = function (socket, d, ack) {
            if (ack === void 0) { ack = noop; }
            var logArgs = [].slice.call(arguments, 1);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            log.apply(this, ["emit-" + event].concat(logArgs));
            //-------
            if (socket instanceof Array) {
                socket.forEach(function (s) {
                    // s.emit(event, d, ack);
                    s.write(JSON.stringify(createBufferJSON(event, d)));
                    logSendTo(s);
                });
            }
            else {
                // socket.emit(event, d, ack);
                socket.write(JSON.stringify(createBufferJSON(event, d)));
                logSendTo(socket);
            }
            function logSendTo(s) {
                log.apply(console, ["emit-" + event + "-to"].concat({
                    id: s.id,
                    roomId: s.roomId,
                    name: s.name
                }));
            }
        };
    });
}
server.on("error", function (err) {
    errorLog("ServerError", err);
});
server.on("close", function () {
    log("ServerClose");
});
/** 服务器已启动成功监听 */
server.on("listening", function () {
    log("ServerListening", server.address().address + ":" + server.address().port);
    console.log("服务器已成功启动，开始监听！");
});
/**
 * 统一log日志输出
 *
 * @param {string} title 日志标题
 * @param {...any[]} args 日志内容
 * @returns
 */
function log(title) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return console.log.apply(console, [">>[" + title + "]"].concat(args));
}
/**
 * 统一错误日志输出
 *
 * @param {string} title 日志标题
 * @param {...any[]} args 日志内容
 * @returns
 */
function errorLog(title) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return console.error.apply(console, [">>[" + title + "]"].concat(args));
}
/**
 * 给客户端调用成功的ack函数
 *
 * @param {Function} ack
 */
function successACK(client, ackName, ackData) {
    if (ackData === void 0) { ackData = null; }
    // if (ackData == null) {
    // return ack(createServerBaseSuccess());
    client.write(JSON.stringify(createBufferJSON(ackName + "ACK", createServerBaseSuccess(ackData))));
    // } else {
    //     return client(createServerBaseSuccess(ackData));
    // }
}
/**
 * 给客户端调用失败的ack函数
 *
 * @param {Function} ack ack函数
 * @param {string} message 错误信息
 * @param {number} code 错误码,默认-1
 */
function failACK(client, ackName, message, code) {
    if (message === void 0) { message = ""; }
    if (code === void 0) { code = -1; }
    // return ack(createServerBaseFail(message, code));
    client.write(JSON.stringify(createBufferJSON(ackName + "ACK", createServerBaseFail(message, code))));
}
/**
 * 创建一个服务器返回数据对象
 *
 * @template T
 * @param {number} code 状态码，成功为0，非0为失败，默认为0
 * @param {string} msg 信息，默认空字符串
 * @param {T} data 实际数据，默认为null
 * @returns {blank.serverBase<T>}
 */
function createServerBase(code, msg, data) {
    if (code === void 0) { code = 0; }
    if (msg === void 0) { msg = ""; }
    if (data === void 0) { data = null; }
    return {
        code: code,
        msg: msg,
        data: data
    };
}
function createServerBaseSuccess(data) {
    if (data === void 0) { data = null; }
    return createServerBase(0, "成功", data);
}
function createServerBaseFail(failMess, code) {
    if (failMess === void 0) { failMess = "失败"; }
    if (code === void 0) { code = -1; }
    return createServerBase(code, failMess, null);
}
/**
 * 返回指定房间中的指定ID的客户端client连接
 *
 * @param {string} id 客户端ID
 * @param {string} roomId 房间ID
 * @returns {blank.client}
 */
function getClient(id, roomId) {
    return clientList.filter(function (c) { return c.id == id && c.roomId == roomId; })[0];
}
/**
 * 获取指定房间内的所有客户端socket对象
 *
 * @param {string} roomId 房间ID
 * @returns {blank.client[]}
 */
function getClientsByRoom(roomId) {
    return clientList.filter(function (c) { return c.roomId == roomId; });
}
/**
 * 创建用于返回给客户端的 客户端列表
 *
 * @param {blank.client} c 客户端socket对象
 * @returns
 */
function createClientListItem(c) {
    return {
        id: c.id,
        roomId: c.roomId,
        name: c.name,
        isMaster: c.isMaster
    };
}
/**
 * 获取当前房间内的主持人,返回值可能为undefined
 *
 * @param {string} roomId
 */
function getMasterByRoom(roomId) {
    return clientList
        .filter(function (c) { return c.roomId == roomId; })
        .filter(function (c) { return c.isMaster === true; })[0];
}
/**
 * 创建用于底层Socket传输的事件对象
 *
 * @param {string} name 事件名称
 * @param {*} data 事件数据
 * @returns {blank.BufferJSON}
 */
function createBufferJSON(name, data) {
    return {
        eventName: name,
        eventData: data
    };
}
//# sourceMappingURL=index.js.map