import * as net from "net";
import * as tool from "./tool";
import * as blank from "blank";

/** 服务器监听的IP地址 */
const HOST = "0.0.0.0";

/** 服务器监听的端口号 */
const PORT = 3001;

/** socket服务器 */
const server: net.Server = net.createServer();
server.listen(PORT, HOST);

/** 所有已登录的客户端数组 */
const clientList: blank.client[] = [];

/** 空函数 */
const noop = function () { };

/** 当有新客户端连接入服务器 */
server.on("connection", serverOnConnection);
function serverOnConnection(client: blank.client) {
    log("ServerConnection", "一个用户连接成功 " + client.remoteAddress + ":" + client.remotePort);

    var clientOn = {
        /**
         * 客户端断开连接
         * 
         * @param {boolean} had_error 是否因为错误而导致的断开。false为客户端主动断开，true为发生了错误而断开
         */
        close: function (had_error: boolean) {
            log("on-close", `一个客户端断开连接! ID:${client.id} roomId:${client.roomId} name:${client.name}`);
            //从客户端在线列表中删除
            clientList.splice(clientList.indexOf(client), 1);
            client.end();

            var clients = getClientsByRoom(client.roomId);
            emit.serverEmitClientList(clients, clients.map(c => createClientListItem(c)));
        },
        // connect: function () {

        // },
        data: function (buffer: Buffer) {
            var dataString;
            if (buffer instanceof Buffer) {
                dataString = buffer.toString();
            } else {
                dataString = buffer;
            }
            // console.log("服务器已接收到：" + dataString);

            //将客户端发送的字符串解析为事件模型
            var data: blank.BufferJSON = JSON.parse(dataString);

            //根据事件名匹配事件响应函数
            var onFn: ((d: any, ack: Function) => void) = clientOn[data.eventName];
            if (typeof onFn != "function") return;

            //检测用户是否已登录(未登录状态下只允许调用 登录接口)
            if (data.eventName != "clientEmitLogin" && client.id == undefined) return;

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
        clientEmitLogin(d: blank.clientEmitLoginData, ack: (ackData: blank.serverBase<blank.clientEmitLoginACK>) => void): void {
            client.id = d.id;
            client.name = d.name;
            client.roomId = d.roomId;
            client.isMaster = false;

            if (d.id == undefined || d.name == undefined || d.roomId == undefined) {
                return failACK(client, "clientEmitLogin", `登录失败，需要id,name,roomId`);
            }

            if (getClient(d.id, d.roomId) == undefined) {
                clientList.push(client);
                var clients = getClientsByRoom(client.roomId);
                emit.serverEmitClientList(clients, clients.map(c => createClientListItem(c)));
                return successACK(client, "clientEmitLogin");
            } else {
                return failACK(client, "clientEmitLogin", `登录失败,在房间<${d.roomId}>中，客户端ID<${d.id}>已存在`);
            }
        },

        /**
         * 客户端发送要成为主持人，即共享者。需要ack函数，返回是否成为主持人成功，若当前没有主持人则成功，若已经有主持人则失败
         * 
         * @param {blank.clientEmitSetMasterData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitSetMasterACK>) => void} ack
         */
        clientEmitSetMaster(d: blank.clientEmitSetMasterData, ack: (ackData: blank.serverBase<blank.clientEmitSetMasterACK>) => void): void {
            var master = getMasterByRoom(client.roomId);
            var clients = getClientsByRoom(client.roomId);
            if (master == undefined) {
                client.isMaster = true;
                emit.serverEmitStartShare(clients, {
                    masterId: client.id,
                    masterName: client.name
                });
                return successACK(client, "clientEmitSetMaster");
            } else {
                return failACK(client, "clientEmitSetMaster", `设定主持人失败,在房间<${client.roomId}>中，客户端ID<${master.id}>为主持人`)
            }
        },

        /**
         * 客户端发送共享数据给服务器
         * 
         * @param {blank.clientEmitSendShareData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitSendShareACK>) => void} ack
         */
        clientEmitSendShare(d: blank.clientEmitSendShareData, ack: (ackData: blank.serverBase<blank.clientEmitSendShareACK>) => void): void {
            var clients: blank.client[] = getClientsByRoom(client.roomId);
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
        clientEmitCancelMaster(d: blank.clientEmitCancelMasterData, ack: (ackData: blank.serverBase<blank.clientEmitCancelMasterACK>) => void): void {
            var master = getMasterByRoom(client.roomId);
            var clients = getClientsByRoom(client.roomId);
            if (master === client) {
                client.isMaster = false;
                emit.serverEmitEndShare(clients, {
                    masterId: client.id,
                    masterName: client.name
                });
                return successACK(client, "clientEmitCancelMaster");
            } else {
                return failACK(client, "clientEmitCancelMaster", `当前客户端不是主持人，无法取消`);
            }
        },
        /**
         * 客户端主动获取服务器当前房间内的客户端列表
         * 
         * @param {blank.clientEmitGetClientListData} d
         * @param {(ackData: blank.serverBase<blank.clientEmitGetClientListACK>) => void} ack
         */
        clientEmitGetClientList(d: blank.clientEmitGetClientListData, ack: (ackData: blank.serverBase<blank.clientEmitGetClientListACK>) => void): void {
            var clients: blank.client[];
            if (d.roomId == undefined) {
                clients = clientList;
            } else {
                clients = getClientsByRoom(d.roomId);
            }
            emit.serverEmitClientList(client, clients.map(c => createClientListItem(c)));
            return successACK(client, "clientEmitGetClientList");
        }
    }

    var emit = {

        /**
         * 服务器向客户端发送当前房间内的客户端列表
         */
        serverEmitClientList(socket: blank.client | blank.client[], d: blank.serverEmitClientListData, ack: (ackData?: blank.serverBase<blank.serverEmitClientListACK>) => void = noop) { },

        /**
         * 服务器向所有非主持人发送，开始共享
         */
        serverEmitStartShare(socket: blank.client | blank.client[], d: blank.serverEmitStartShareData, ack: (ackData?: blank.serverBase<blank.serverEmitStartShareACK>) => void = noop) { },

        /**
         * 服务器端转发共享数据给客户端
         */
        serverEmitSendShare(socket: blank.client | blank.client[], d: blank.serverEmitSendShareData, ack: (ackData?: blank.serverBase<blank.serverEmitSendShareACK>) => void = noop) { },

        /**
         * 服务器向所有非主持人发送，结束共享
         */
        serverEmitEndShare(socket: blank.client | blank.client[], d: blank.serverEmitEndShareData, ack: (ackData?: blank.serverBase<blank.serverEmitEndShareACK>) => void = noop) { },
    }

    //循环创建监听
    Object.keys(clientOn).forEach(event => {
        var oldOnFn = clientOn[event];
        clientOn[event] = function () {
            if (event != "data") {
                var logArgs: Array<any> = [].slice.call(arguments);
                if (typeof logArgs[logArgs.length - 1] == "function") {
                    logArgs[logArgs.length - 1] = "<Function>";
                }
                log.apply(this, ["on-" + event].concat(logArgs));
            }
            //--------------
            var args: Array<any> = [].slice.call(arguments);
            return (<Function>oldOnFn).apply(this, args);
        };
        client.on(event, clientOn[event]);
    });


    //循环重写emit发出事件函数
    Object.keys(emit).forEach(event => {
        emit[event] = function (socket: blank.client | blank.client[], d: any, ack: Function = noop) {
            var logArgs: Array<any> = [].slice.call(arguments, 1);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            log.apply(this, ["emit-" + event].concat(logArgs));
            //-------
            if (socket instanceof Array) {
                socket.forEach(s => {
                    // s.emit(event, d, ack);
                    s.write(JSON.stringify(createBufferJSON(event, d)));
                    logSendTo(s);
                });
            } else {
                // socket.emit(event, d, ack);
                socket.write(JSON.stringify(createBufferJSON(event, d)));
                logSendTo(socket);
            }
            function logSendTo(s: blank.client) {
                log.apply(console, ["emit-" + event + "-to"].concat(<any>{
                    id: s.id,
                    roomId: s.roomId,
                    name: s.name
                }));
            }
        }
    });
}

server.on("error", function (err: Error) {
    errorLog("ServerError", err);
})

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
function log(title: string, ...args: any[]) {
    return console.log.apply(console, [">>[" + title + "]"].concat(args));
}
/**
 * 统一错误日志输出
 * 
 * @param {string} title 日志标题
 * @param {...any[]} args 日志内容
 * @returns
 */
function errorLog(title: string, ...args: any[]) {
    return console.error.apply(console, [">>[" + title + "]"].concat(args));
}


/**
 * 给客户端调用成功的ack函数
 * 
 * @param {Function} ack
 */
function successACK(client: blank.client, ackName: string, ackData: any = null): void {
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
function failACK(client: blank.client, ackName: string, message: string = "", code: number = -1): void {
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
function createServerBase<T>(code: number = 0, msg: string = "", data: T = null): blank.serverBase<T> {
    return {
        code: code,
        msg: msg,
        data: data
    }
}

function createServerBaseSuccess(data: any = null) {
    return createServerBase(0, "成功", data);
}

function createServerBaseFail(failMess: string = "失败", code: number = -1) {
    return createServerBase(code, failMess, null);
}


/**
 * 返回指定房间中的指定ID的客户端client连接
 * 
 * @param {string} id 客户端ID
 * @param {string} roomId 房间ID
 * @returns {blank.client}
 */
function getClient(id: string, roomId: string): blank.client {
    return clientList.filter(c => c.id == id && c.roomId == roomId)[0];
}

/**
 * 获取指定房间内的所有客户端socket对象
 * 
 * @param {string} roomId 房间ID
 * @returns {blank.client[]}
 */
function getClientsByRoom(roomId: string): blank.client[] {
    return clientList.filter(c => c.roomId == roomId);
}

/**
 * 创建用于返回给客户端的 客户端列表
 * 
 * @param {blank.client} c 客户端socket对象
 * @returns
 */
function createClientListItem(c: blank.client) {
    return {
        id: c.id,
        roomId: c.roomId,
        name: c.name,
        isMaster: c.isMaster,
    };
}

/**
 * 获取当前房间内的主持人,返回值可能为undefined
 * 
 * @param {string} roomId
 */
function getMasterByRoom(roomId: string): blank.client {
    return clientList
        .filter(c => c.roomId == roomId)
        .filter(c => c.isMaster === true)[0];
}

/**
 * 创建用于底层Socket传输的事件对象
 * 
 * @param {string} name 事件名称
 * @param {*} data 事件数据
 * @returns {blank.BufferJSON}
 */
function createBufferJSON(name: string, data: any): blank.BufferJSON {
    return {
        eventName: name,
        eventData: data,
    }
}