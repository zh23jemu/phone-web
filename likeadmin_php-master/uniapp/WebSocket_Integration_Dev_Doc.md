# 开发文档：模拟拨号和后台 UniApp 的 WebSocket 集成

**1. 引言**
*   简要描述目标：在模拟拨号 UniApp 和后台 UniApp 之间使用 WebSocket 建立实时通信。
*   解释预期的工作流程：拨号应用拨出一个号码 -> 后台应用接收到该号码并显示呼叫控制选项（接听/挂断）。

**2. 系统架构**
*   组件图或描述：
    *   模拟拨号 UniApp (WebSocket 客户端)
    *   后台 UniApp (WebSocket 客户端) - *注意：这里假设"后台 UniApp"是另一个客户端应用，它与服务器交互。如果后台逻辑是单独的服务器端应用，请在此处澄清架构。*
    *   WebSocket 服务器（需要实现，可能是现有后台基础设施的一部分或专用服务）。

**3. WebSocket 通信设置**
*   **WebSocket 服务器：**
    *   提及需要实现 WebSocket 服务器。可以使用多种技术实现（Node.js + `ws`、Python + `websockets` 等）。除非有特定要求，文档不应详细介绍服务器实现，但应说明其必要性。
    *   指定服务器 URL 和端口。
*   **UniApp 客户端（拨号和后台）：**
    *   解释如何在 UniApp 中使用 `uni.connectSocket` 建立 WebSocket 连接。
    *   提供连接的基本代码结构：
        ```javascript
        uni.connectSocket({
            url: 'ws://your-websocket-server-url',
            success: function (res) {
                console.log('WebSocket connected');
            }
        });
        ```
    *   解释事件监听器：
        *   `uni.onSocketOpen`: 连接成功打开。
        *   `uni.onSocketMessage`: 收到服务器消息。
        *   `uni.onSocketError`: 连接错误。
        *   `uni.onSocketClose`: 连接关闭。

**4. 消息协议**
*   定义客户端和服务器之间交换的消息结构。JSON 是一种常用的格式。
*   建议的消息类型：
    *   `dial`：从拨号器发送到服务器，当拨号时触发。
        ```json
        {
            "type": "dial",
            "number": "1234567890",
            "dialerClientId": "unique-id-of-dialer"
        }
        ```
    *   `incomingCall`：从服务器发送到后台，当收到拨号消息时触发。
        ```json
        {
            "type": "incomingCall",
            "number": "1234567890",
            "callId": "unique-id-for-this-call",
            "dialerClientId": "unique-id-of-dialer"
        }
        ```
    *   `answerCall`：当用户接听时，从后台发送到服务器。
        ```json
        {
            "type": "answerCall",
            "callId": "unique-id-for-this-call",
            "backendClientId": "unique-id-of-backend"
        }
        ```
    *   `hangupCall`：当用户挂断时，从后台发送到服务器。
        ```json
        {
            "type": "hangupCall",
            "callId": "unique-id-for-this-call",
            "backendClientId": "unique-id-of-backend"
        }
        ```
    *   `callAccepted`：当呼叫被接听时，从服务器发送到拨号器和后台。
        ```json
        {
            "type": "callAccepted",
            "callId": "unique-id-for-this-call"
        }
        ```
    *   `callEnded`：当呼叫被挂断时，从服务器发送到拨号器和后台。
        ```json
        {
            "type": "callEnded",
            "callId": "unique-id-for-this-call"
        }
        ```
*   解释需要使用唯一标识符（`dialerClientId`、`backendClientId`、`callId`）来管理多个潜在的连接和呼叫。

**5. 实现步骤（模拟拨号 UniApp）**
*   添加获取拨号号码的机制（例如，输入框的值）。
*   实现一个按钮或操作来发起呼叫。
*   发起呼叫时：
    *   构造一个 `dial` 消息对象。
    *   使用 `uni.sendSocketMessage` 发送消息。
        ```javascript
        let message = { type: 'dial', number: dialedNumber, dialerClientId: '...' };
        uni.sendSocketMessage({
            data: JSON.stringify(message),
            success: function () {
                console.log('Dial message sent');
            }
        });
        ```
    *   处理来自服务器的入站消息（例如，`callAccepted`、`callEnded`）以更新拨号器 UI 状态。

**6. 实现步骤（后台 UniApp）**
*   在启动时建立到服务器的 WebSocket 连接。
*   实现 `uni.onSocketMessage` 监听器来处理来自服务器的入站消息。
*   收到 `incomingCall` 消息时：
    *   从消息中提取号码和 `callId`。
    *   更新 UI 显示来电号码。
    *   显示"接听"和"挂断"按钮。
*   实现"接听"按钮操作：
    *   使用收到的 `callId` 构造一个 `answerCall` 消息。
    *   使用 `uni.sendSocketMessage` 将消息发送到服务器。
    *   更新 UI 以反映呼叫已连接。
*   实现"挂断"按钮操作：
    *   使用收到的 `callId` 构造一个 `hangupCall` 消息。
    *   使用 `uni.sendSocketMessage` 将消息发送到服务器。
    *   更新 UI 以反映呼叫已结束并隐藏呼叫控件。
*   处理来自服务器的 `callAccepted` 和 `callEnded` 消息，以确保 UI 一致性。

**7. 错误处理和边缘情况**
*   处理 WebSocket 连接错误 (`uni.onSocketError`)。
*   处理意外消息。
*   客户端在通话过程中断开连接会发生什么？
*   如果连接断开，实现重连逻辑。
*   处理多个同时进行的呼叫（需要服务器逻辑来管理呼叫状态）。

**8. 结论**
*   总结通过 WebSocket 成功实现实时呼叫信令。
*   提及潜在的未来增强功能。 