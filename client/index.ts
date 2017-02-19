import * as net from 'net';
import * as blank from "blank";

/** 服务器地址 */
const HOST = '127.0.0.1';

/** 服务器端口号 */
const PORT = 3001;

var client: blank.client = <blank.client>new net.Socket();


// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function (buffer) {
    var dataString;
    if (buffer instanceof Buffer) {
        dataString = buffer.toString();
    } else {
        dataString = buffer;
    }
    log('Receive' + dataString);
    var data: blank.BufferJSON = JSON.parse(dataString);
    var onFn: ((d: any, ack: Function) => void) = on[data.eventName];
    if (typeof onFn != "function") return;
    onFn.apply(client, [data.eventData]);
});

// 为客户端添加“close”事件处理函数
client.on('close', function () {
    console.log('Connection closed.与服务器断开连接');
});


var on = {
    //--------服务器发送事件-----

    serverEmitClientList(d: blank.serverEmitClientListData) {
        console.log("客户端列表：", d);
    },
    serverEmitStartShare(d: blank.serverEmitStartShareData) {
        console.log("开始共享！", "共享者为：", d);
    },
    serverEmitSendShare(d: blank.serverEmitSendShareData) {
        console.log("收到共享数据：", d);
    },
    serverEmitEndShare(d: blank.serverEmitEndShareData) {
        console.log("结束共享！", "共享者为：", d);
    },

    //--------客户端发送的事件的ACK回调------
    clientEmitLoginACK(d: blank.serverBase<blank.clientEmitLoginACK>) {
        if (d.code == 0) {
            console.log("登录成功");
        } else {
            console.log("登录失败!", d.msg);
        }
    },
    clientEmitSetMasterACK(d: blank.serverBase<blank.clientEmitSetMasterACK>) {
        if (d.code == 0) {
            console.log("成为主持人成功");
        } else {
            console.log("成为主持人失败!", d.msg);
        }
    },
    clientEmitSendShareACK(d: blank.serverBase<blank.clientEmitSendShareACK>) {
        if (d.code != 0) {
            console.log(d.msg);
        }
    },
    clientEmitCancelMasterACK(d: blank.serverBase<blank.clientEmitCancelMasterACK>) {

    },
    clientEmitGetClientListACK(d: blank.serverBase<blank.clientEmitGetClientListACK>) {

    },
}

var emit = {
    _send(name: string, d: any) {
        var sendData = JSON.stringify(createBufferJSON(name, d));
        log("Send", sendData);
        client.write(sendData);
    },
    clientEmitLogin(d: blank.clientEmitLoginData) { emit._send("clientEmitLogin", d); },
    clientEmitSetMaster(d: blank.clientEmitSetMasterData) { emit._send("clientEmitSetMaster", d); },
    clientEmitSendShare(d: blank.clientEmitSendShareData) { emit._send("clientEmitSendShare", d); },
    clientEmitCancelMaster(d: blank.clientEmitCancelMasterData) { emit._send("clientEmitCancelMaster", d); },
    clientEmitGetClientList(d: blank.clientEmitGetClientListData) { emit._send("clientEmitGetClientList", d); },
}

/** 客户端操作 */
var action = {
    /**
     * 连接服务器
     */
    connect() {
        client.connect(PORT, HOST, function () {
            console.log('已连接到服务器: ' + HOST + ':' + PORT);
        });
    },
    /**
     * 客户端登录
     */
    login(id: string = "1001", roomId: string = "room1", name: string = "客户端") {
        emit.clientEmitLogin({ id: id, name: name, roomId: roomId });
    },
    /**
     * 成为主持人（共享者）
     */
    setMaster() {
        emit.clientEmitSetMaster({});
    },
    /**
     * 发送共享数据
     * 
     * @param {*} d 共享数据
     */
    sendShare(d: any) {
        emit.clientEmitSendShare({ data: d });
    },
    /**
     * 取消成为主持人
     */
    cancelMaster() {
        emit.clientEmitCancelMaster({});
    },
    /**
     * 获取当前房间内的客户端列表
     */
    getClientList(roomId: string) {
        if (roomId == undefined) {
            console.log("请要获取的输入房间ID！");
            return;
        }
        emit.clientEmitGetClientList({ roomId: roomId });
    },
    /**
     * 获取服务器上所有的客户端列表
     */
    getClientListAll() {
        emit.clientEmitGetClientList({});
    },
}


/**
 * 统一log日志输出
 * 
 * @param {string} title 日志标题
 * @param {...any[]} args 日志内容
 * @returns
 */
function log(title: string, ...args: any[]) {
    // return console.log.apply(console, ["[" + title + "]"].concat(args));
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




//================init 初始化===================

//启动客户端自动连接服务器
action.connect();