import * as net from 'net';
import * as blank from "blank";

/** 服务器地址 */
const HOST = '127.0.0.1';

/** 服务器端口号 */
const PORT = 3001;

var client: blank.client = <blank.client>new net.Socket();


/** 接收缓冲区 */
var receiveCache = "";

// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function (buffer) {
    var dataString: string;
    if (buffer instanceof Buffer) {
        dataString = buffer.toString();
    } else {
        dataString = buffer;
    }

    log('Receive', dataString);


    //将每次接受到的数据都存入缓冲区
    receiveCache += dataString;

    // 判断结束符号是否为\0符号。
    // 如果是表示全部接受完毕，从缓冲区中取出所有数据并删除最后\0，开始解析JSON。不是则不执行操作
    if (dataString[dataString.length - 1] == "\0") {
        // 删除末尾的\0字符
        dataString = receiveCache.substring(0, receiveCache.length - 1);
        receiveCache = "";
    } else {
        return;
    }

    if (dataString.indexOf("\0") >= 0) {
        dataString.split("\0").forEach(str => {
            actionData(str);
        });
    } else {
        actionData(dataString);
    }
    function actionData(dataStr: string) {
        var data: blank.BufferJSON = JSON.parse(dataStr);

        var onFn: ((d: any, ack: Function) => void) = on[data.eventName];
        if (typeof onFn != "function") return;
        onFn.apply(client, [data.eventData]);
    }
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
    serverEmitShareState(d: blank.serverEmitShareStateData) {
        console.log("当前共享状态：", d.state == 0 ? "未开始" : d.state == 1 ? "正在共享" : "未知");
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
        console.log("取消主持人成功！");
    },
    clientEmitGetClientListACK(d: blank.serverBase<blank.clientEmitGetClientListACK>) {

    },
}

var emit = {
    _send(name: string, d: any) {
        var sendData = JSON.stringify(createBufferJSON(name, d));
        sendData += "\0";
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
     * @param {string[]} receiverIds 接收者的id数组，默认空数组即发给所有人，可以指定发送给谁
     */
    sendShare(d: any, receiverIds: string[] = []) {
        emit.clientEmitSendShare({ data: d, receiverIds: receiverIds });
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
    /** 最长日志数据长度 */
    var max = 200;
    args.forEach((a, i) => {
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
function createBufferJSON(name: string, data: any): blank.BufferJSON {
    return {
        eventName: name,
        eventData: data,
    }
}

function getString(length: number = 1024) {
    var str = "";
    for (var i = 0; i < length; i++) {
        str += parseInt(<any>(Math.random() * 10));
    }
    return str;
}



//================init 初始化===================

//启动客户端自动连接服务器
action.connect();