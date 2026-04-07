import { ref } from 'vue'

// WebSocket 连接状态
export const wsStatus = ref('未连接')
export const messageStatus = ref('')

// WebSocket 连接实例
let websocketTask: UniApp.SocketTask | null = null

// 消息处理器映射
const messageHandlers: Record<string, (data: any) => void> = {}

// 连接 WebSocket
export function connectWebSocket(userId: string, url: string) {
    if (websocketTask) {
        console.log('WebSocket connection already exists.')
        messageStatus.value = 'WebSocket已连接或连接中'
        return
    }

    wsStatus.value = '连接中'
    messageStatus.value = '正在连接 WebSocket...'

    websocketTask = uni.connectSocket({
        url,
        complete: () => { }
    })

    websocketTask.onOpen(() => {
        console.log('WebSocket connected.')
        wsStatus.value = '已连接'
        messageStatus.value = `WebSocket连接成功，用户ID: ${userId}`

        // 连接成功后立即发送注册消息
        sendWebSocketMessage({
            type: 'register',
            userId
        })
    })

    websocketTask.onMessage((res) => {
        console.log('Received message:', res.data)
        try {
            const message = JSON.parse(res.data)
            handleWebSocketMessage(message)
        } catch (error) {
            console.error('Failed to parse message:', error)
            messageStatus.value = '收到无效消息格式'
        }
    })

    websocketTask.onError((res) => {
        console.error('WebSocket error:', res)
        wsStatus.value = '连接错误'
        messageStatus.value = `WebSocket连接错误: ${res.errMsg || '未知错误'}`
        websocketTask = null
    })

    websocketTask.onClose((res) => {
        console.log('WebSocket closed.', res)
        wsStatus.value = '连接已关闭'
        messageStatus.value = `WebSocket连接已关闭 (Code: ${res.code}, Reason: ${res.reason})`
        websocketTask = null

        if (res.code !== 1000) {
            console.log('WebSocket closed abnormally, attempting to reconnect...')
            setTimeout(() => {
                connectWebSocket(userId, url)
            }, 5000)
        }
    })
}

// 关闭 WebSocket 连接
export function closeWebSocket() {
    if (websocketTask && websocketTask.readyState === WebSocket.OPEN) {
        websocketTask.close({
            code: 1000,
            reason: '页面卸载',
            success: () => {
                console.log('WebSocket closed successfully.')
            }
        })
    } else {
        console.log('WebSocket is not open, cannot close.')
    }
}

// 发送 WebSocket 消息
export function sendWebSocketMessage(message: any) {
    if (websocketTask && websocketTask.readyState === WebSocket.OPEN) {
        websocketTask.send({
            data: JSON.stringify(message),
            success: () => {
                console.log('Message sent:', message)
            },
            fail: (err) => {
                console.error('Failed to send message:', message, err)
                messageStatus.value = '消息发送失败'
            }
        })
    } else {
        console.warn('WebSocket is not connected, message not sent:', message)
        messageStatus.value = 'WebSocket未连接，消息发送失败'
    }
}

// 注册消息处理器
export function registerMessageHandler(type: string, handler: (data: any) => void) {
    messageHandlers[type] = handler
}

// 处理接收到的消息
function handleWebSocketMessage(message: any) {
    const handler = messageHandlers[message.type]
    if (handler) {
        handler(message)
    } else {
        console.log('No handler registered for message type:', message.type)
    }
}

// 导出 WebSocket 状态
export function getWebSocketStatus() {
    return {
        wsStatus,
        messageStatus
    }
} 