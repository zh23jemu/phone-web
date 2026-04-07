import { ref } from 'vue'

// 呼叫记录接口返回类型
interface CallRecord {
    id: number
    call_id: string
    dialer_user_id: number
    backend_user_id: number
    dialed_number: string
    start_time: number
    end_time: number | null
    duration: number | null
    status: string
    location: string | null
    created_at: number
    updated_at: number
}

// 呼叫记录列表
export const callRecords = ref<CallRecord[]>([])

// 获取呼叫记录列表
export async function fetchCallRecords(userId: number) {
    try {
        const res = await uni.request({
            url: `http://106.53.30.150:9097/api/call-records?userId=${userId}`,
            method: 'GET'
        })

        console.log('Raw API response:', res) // 添加调试日志

        if (res.statusCode === 200 && res.data && res.data.code === 0) {
            const records = res.data.data
            console.log('Parsed records:', records) // 添加调试日志

            // 确保返回的是数组
            if (Array.isArray(records)) {
                callRecords.value = records
                return records
            } else {
                console.error('Invalid records format:', records)
                throw new Error('Invalid records format')
            }
        } else {
            console.error('Server returned error:', res.data)
            throw new Error(res.data?.msg || '获取呼叫记录失败')
        }
    } catch (error) {
        console.error('Failed to fetch call records:', error)
        throw error
    }
}
// 格式化时间戳
export function formatTimestamp(timestamp: number): string {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2)
    const day = ('0' + date.getDate()).slice(-2)
    const hours = ('0' + date.getHours()).slice(-2)
    const minutes = ('0' + date.getMinutes()).slice(-2)
    const seconds = ('0' + date.getSeconds()).slice(-2)
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 映射呼叫状态到显示文本
export function mapCallStatusToText(status: string): string {
    switch (status) {
        case 'ringing': return '振铃中'
        case 'connected': return '通话中'
        case 'completed': return '已完成'
        case 'failed': return '拒接'
        case 'no_answer': return '拒接'
        case 'disconnected': return '拒接'
        case 'canceled': return '拒接'
        case 'guaduan': return '拒接'
        case 'weijie': return '拒接'
        default: return status || '未知状态'
    }
}

// 映射呼叫状态到操作按钮文本
export function mapCallStatusToAction(status: string): string {
    return '标记测试'
} 