"use strict";
var net = require('net');
/** 服务器地址 */
var HOST = '127.0.0.1';
/** 服务器端口号 */
var PORT = 3001;
var client = new net.Socket();
/** 接收缓冲区 */
var receiveCache = "";
// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function (buffer) {
    var dataString;
    if (buffer instanceof Buffer) {
        dataString = buffer.toString();
    }
    else {
        dataString = buffer;
    }
    log('Receive', dataString);
    //将每次接受到的数据都存入缓冲区
    receiveCache += dataString;
    //判断结束符号是否为\0符号。
    // 如果是表示全部接受完毕，从缓冲区中取出所有数据并删除最后\0，开始解析JSON。不是则不执行操作
    if (dataString[dataString.length - 1] == "\0") {
        dataString = receiveCache.substring(0, receiveCache.length - 1);
        receiveCache = "";
    }
    else {
        return;
    }
    var data = JSON.parse(dataString);
    var onFn = on[data.eventName];
    if (typeof onFn != "function")
        return;
    onFn.apply(client, [data.eventData]);
});
// 为客户端添加“close”事件处理函数
client.on('close', function () {
    console.log('Connection closed.与服务器断开连接');
});
var on = {
    //--------服务器发送事件-----
    serverEmitClientList: function (d) {
        console.log("客户端列表：", d);
    },
    serverEmitStartShare: function (d) {
        console.log("开始共享！", "共享者为：", d);
    },
    serverEmitSendShare: function (d) {
        console.log("收到共享数据：", d);
    },
    serverEmitEndShare: function (d) {
        console.log("结束共享！", "共享者为：", d);
    },
    //--------客户端发送的事件的ACK回调------
    clientEmitLoginACK: function (d) {
        if (d.code == 0) {
            console.log("登录成功");
        }
        else {
            console.log("登录失败!", d.msg);
        }
    },
    clientEmitSetMasterACK: function (d) {
        if (d.code == 0) {
            console.log("成为主持人成功");
        }
        else {
            console.log("成为主持人失败!", d.msg);
        }
    },
    clientEmitSendShareACK: function (d) {
        if (d.code != 0) {
            console.log(d.msg);
        }
    },
    clientEmitCancelMasterACK: function (d) {
    },
    clientEmitGetClientListACK: function (d) {
    }
};
var emit = {
    _send: function (name, d) {
        var sendData = JSON.stringify(createBufferJSON(name, d));
        sendData += "\0";
        log("Send", sendData);
        client.write(sendData);
    },
    clientEmitLogin: function (d) { emit._send("clientEmitLogin", d); },
    clientEmitSetMaster: function (d) { emit._send("clientEmitSetMaster", d); },
    clientEmitSendShare: function (d) { emit._send("clientEmitSendShare", d); },
    clientEmitCancelMaster: function (d) { emit._send("clientEmitCancelMaster", d); },
    clientEmitGetClientList: function (d) { emit._send("clientEmitGetClientList", d); }
};
/** 客户端操作 */
var action = {
    /**
     * 连接服务器
     */
    connect: function () {
        client.connect(PORT, HOST, function () {
            console.log('已连接到服务器: ' + HOST + ':' + PORT);
        });
    },
    /**
     * 客户端登录
     */
    login: function (id, roomId, name) {
        if (id === void 0) { id = "1001"; }
        if (roomId === void 0) { roomId = "room1"; }
        if (name === void 0) { name = "客户端"; }
        emit.clientEmitLogin({ id: id, name: name, roomId: roomId });
    },
    /**
     * 成为主持人（共享者）
     */
    setMaster: function () {
        emit.clientEmitSetMaster({});
    },
    /**
     * 发送共享数据
     *
     * @param {*} d 共享数据
     */
    sendShare: function (d) {
        emit.clientEmitSendShare({ data: d });
    },
    /**
     * 取消成为主持人
     */
    cancelMaster: function () {
        emit.clientEmitCancelMaster({});
    },
    /**
     * 获取当前房间内的客户端列表
     */
    getClientList: function (roomId) {
        if (roomId == undefined) {
            console.log("请要获取的输入房间ID！");
            return;
        }
        emit.clientEmitGetClientList({ roomId: roomId });
    },
    /**
     * 获取服务器上所有的客户端列表
     */
    getClientListAll: function () {
        emit.clientEmitGetClientList({});
    }
};
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
    /** 最长日志数据长度 */
    var max = 200;
    args.forEach(function (a, i) {
        var s = String(a);
        if (s.length > max) {
            args[i] = s.substring(0, max / 2) + "...<" + s.length + ">..." + s.substring(s.length - max / 2, s.length);
        }
    });
    return console.log.apply(console, ["[" + title + "]"].concat(args));
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
function getString(length) {
    if (length === void 0) { length = 1024; }
    var str = "";
    for (var i = 0; i < length; i++) {
        str += parseInt((Math.random() * 10));
    }
    return str;
}
//================init 初始化===================
//启动客户端自动连接服务器
action.connect();
//# sourceMappingURL=index.js.map