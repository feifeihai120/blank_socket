declare module "blank" {

    import * as net from "net";

    /**
    * 白板项目的一个用户socket连接
    */
    interface client extends net.Socket {
        /**
         * 是否为主持人
         * 
         * @type {boolean}
         */
        isMaster: boolean;

        /**
         * 客户端名称
         * 
         * @type {string}
         */
        name: string;

        /**
         * 客户端ID
         * 
         * @type {string}
         */
        id: string;

        /**
         * 房间ID（案件ID）
         * 
         * @type {string}
         */
        roomId: string;
    }

    // interface client {
    //     emit(event: "clientEmitLogin", data: clientEmitLoginData, ack: (d: clientEmitLoginACK) => void): boolean;
    //     emit(event: "clientEmitSetMaster", data: clientEmitSetMasterData, ack: (d: clientEmitSetMasterACK) => void): boolean;
    //     emit(event: "clientEmitSendShare", data: clientEmitSendShareData, ack: (d: clientEmitSendShareACK) => void): boolean;
    //     emit(event: "clientEmitCancelMaster", data: clientEmitCancelMasterData, ack: (d: clientEmitCancelMasterACK) => void): boolean;
    //     emit(event: string, ...args: any[]): boolean;
    // }

    /**
     * 客户端发送的实体，转换为JSON字符串后发送
     * 
     * @interface BufferJSON
     */
    interface BufferJSON {
        /**
         * 事件名称
         * 
         * @type {string}
         */
        eventName: string;

        /**
         * 事件数据
         * 
         * @type {*}
         */
        eventData: any;
    }

    /**
     * 服务器返回数据的所有实体的基础类
     * 
     * @interface serverBase
     * @template T
     */
    interface serverBase<T> {
        /**
         * 状态表示码，0为成功，非0为失败
         * 
         * @type {number}
         */
        code?: number;

        /**
         * 具体的数据内容
         * 
         * @type {T}
         */
        data?: T;

        /**
         * 信息文字
         * 
         * @type {string}
         */
        msg?: string;
    }

    // ---------服务器监听消息-----------

    /**
     * 客户端登录
     * 
     * @interface clientEmitLogin
     */
    interface clientEmitLoginData {
        /**
         * 客户端名称
         * 
         * @type {string}
         */
        name: string;

        /**
         * 客户端Id
         * 
         * @type {string}
         */
        id: string;

        /**
         * 房间ID
         * 
         * @type {string}
         */
        roomId: string;
    }

    interface clientEmitLoginACK {

    }

    /**
     * 客户端发送要成为主持人，即共享者。需要ack函数，返回是否成为主持人成功，若当前没有主持人则成功，若已经有主持人则失败
     * 
     * @interface clientEmitSetMaster
     */
    interface clientEmitSetMasterData {
        //无
    }

    interface clientEmitSetMasterACK {

    }

    /**
     * 客户端发送共享数据给服务器
     * 
     * @interface clientEmitSendShare
     */
    interface clientEmitSendShareData {
        /**
         * 具体要共享的数据
         * 
         * @type {*}
         */
        data: any;
    }

    interface clientEmitSendShareACK {

    }

    /**
     * 客户端发送取消自己为主持人身份
     * 
     * @interface clientEmitCancelMaster
     */
    interface clientEmitCancelMasterData {
        //无
    }

    interface clientEmitCancelMasterACK {

    }


    /**
     * 客户端主动获取服务器当前房间内的客户端列表
     * 
     * @interface clientEmitGetClientListData
     */
    interface clientEmitGetClientListData {
        /**
         * 要获取的指定客户端列表的房间ID，如果不传则获取当前所有在线的客户端列表
         * 
         * @type {string}
         * @memberOf clientEmitGetClientListData
         */
        roomId?:string;
    }

    interface clientEmitGetClientListACK {

    }

    // ---------服务器监听消息-----------

    /**
     * 服务器向客户端发送当前客户端列表
     * 
     * @interface serverEmitClientList
     */
    interface serverEmitClientListData extends Array<serverEmitClientListItem> {

    }

    /**
     * 服务器向客户端发送当前客户端列表项
     * 
     * @interface serverEmitClientListItem
     */
    interface serverEmitClientListItem {
        /**
         * 客户端名称
         * 
         * @type {string}
         */
        name: string;

        /**
         * 客户端Id
         * 
         * @type {string}
         */
        id: string;

        /**
         * 房间ID
         * 
         * @type {string}
         */
        roomId: string;
    }

    interface serverEmitClientListACK {

    }

    /**
     * 服务器向所有非主持人发送，开始共享
     * 
     * @interface serverEmitStartShare
     */
    interface serverEmitStartShareData {

        /**
         * 主持人名称
         * 
         * @type {string}
         */
        masterName: string;

        /**
         * 主持人ID
         * 
         * @type {string}
         */
        masterId: string;
    }

    interface serverEmitStartShareACK {

    }

    /**
     * 服务器端转发共享数据给客户端
     * 
     * @interface serverEmitSendShare
     */
    interface serverEmitSendShareData {
        /**
         * 具体共享数据
         * 
         * @type {*}
         */
        data: any;
    }

    interface serverEmitSendShareACK {

    }

    /**
     * 服务器向所有非主持人发送，结束共享。
     * 
     * @interface serverEmitEndShare
     */
    interface serverEmitEndShareData {

        /**
         * 主持人名称
         * 
         * @type {string}
         */
        masterName: string;

        /**
         * 主持人ID
         * 
         * @type {string}
         */
        masterId: string;
    }

    interface serverEmitEndShareACK {

    }

}