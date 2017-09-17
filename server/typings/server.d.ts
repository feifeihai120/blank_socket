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

    // ---------服务器监听的消息-----------

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

        /**
         * 指定要给谁发送分享数据，为接收者的id字符串数组，传空数组则为向所有人发送
         * 
         * @type {string[]}
         */
        receiverIds: string[];
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
         */
        roomId?: string;
    }

    interface clientEmitGetClientListACK {

    }


    // ---------服务器发送的消息-----------

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

        /**
         * 接收者的id字符串数组，为空数组则为所有人。
         * 客户端可根据此字段来判断当前接收到的数据是向所有人发送的，还是指定向自己发送的。
         * 若此字段为空数组则为全局发送的数据，若不为空，则为专门向你发送的。
         * 
         * @type {string[]}
         */
        receiverIds: string[];
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

    /**
     * 服务器向所有新连接进入的客户端发送当前的共享状态，是否正在分享
     * 
     * @interface serverEmitShareStateData
     */
    interface serverEmitShareStateData {
        /**
         * 当前服务器的分析状态, 0:未开始分享, 1:正在分享
         * 
         * @type {serverShareStateEnum}
         */
        state: 1 | 0;
    }

    interface serverEmitShareStateACK {

    }

}