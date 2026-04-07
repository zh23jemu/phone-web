const WebSocket = require('ws');
const mysql = require('mysql2/promise'); // 使用 promise 版本方便异步操作
const express = require('express'); // 引入 express

// --- 数据库配置 --- //
const dbConfig = {
    host: 'localhost', // 您的数据库主机
    user: 'phone', // 您的数据库用户名
    password: 'phone2025', // 您的数据库密码
    database: 'phone' // 您的数据库名称
};

// 创建数据库连接池 (推荐使用连接池)
let pool;

async function connectDb() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('Database pool created successfully.');
    } catch (err) {
        console.error('Failed to create database pool:', err);
        // 在生产环境中，这里可能需要更 robust 的错误处理和重试机制
        process.exit(1); // 如果无法连接数据库，退出应用
    }
}

// 连接数据库
connectDb();

// --- HTTP 服务器 (Express) --- //
const app = express();
const httpPort = 9096; // 为 HTTP 服务器设置一个端口，可以与 WebSocket 不同

// 允许跨域请求 (开发环境方便测试)
const cors = require('cors'); // 如果没有安装，请运行 npm install cors
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 定义 /api/call-records 接口
app.get('/api/call-records', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // TODO: 在生产环境中，您需要根据用户认证信息来过滤记录
        // 例如，如果请求中带有用户ID或token，根据用户ID查询相关记录
        // const userId = req.user.id; // 假设用户ID从认证中间件中获取
        // const [rows] = await connection.execute('SELECT * FROM `la_call_records` WHERE `backend_user_id` = ? ORDER BY `start_time` DESC LIMIT 100', [userId]);

        // 简单示例：获取最近的100条呼叫记录 (不按用户过滤)
        const [rows] = await connection.execute('SELECT * FROM `la_call_records` ORDER BY `start_time` DESC LIMIT 100');

        // 返回成功响应
        res.json({ code: 0, msg: 'Success', data: rows });

    } catch (error) {
        console.error('Error fetching call records:', error);
        // 返回错误响应
        res.status(500).json({ code: 1, msg: 'Failed to fetch call records', error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// TODO: 添加其他 HTTP API 接口，例如用于用户认证、获取单个记录详情等

// 启动 HTTP 服务器
app.listen(httpPort, () => {
    console.log(`HTTP server listening on port ${httpPort}`);
});


// --- WebSocket 服务器 --- //
const wss = new WebSocket.Server({ port: 9096 }); // 您可以更改端口号

console.log('WebSocket server started on port 9096');

// 使用用户ID作为键，存储 WebSocket 连接对象
// Map<userId, WebSocket> - 已注册并连接的用户
const connectedUsers = new Map();

// 用于存储正在进行的呼叫状态 (内存中的临时状态)
// Map<callId, { dialerUserId, backendUserId, number, status, startTime }>
// 注意：呼叫的持久化状态存储在数据库中
const activeCalls = new Map();

// 处理新的客户端连接
wss.on('connection', function connection(ws) {
    // 新连接建立，等待客户端发送注册消息
    console.log('A client connected, waiting for user registration.');

    // 处理来自客户端的消息
    ws.on('message', async function incoming(message) { // 将回调函数改为 async
        console.log(`Received message: ${message}`);

        try {
            const data = JSON.parse(message);

            // --- 处理客户端注册消息 ---
            // 假设客户端连接后的第一条消息是注册消息
            if (data.type === 'register' && data.userId) {
                const userId = data.userId;

                // 检查用户ID是否已经被占用（可能用户在其他地方登录）
                if (connectedUsers.has(userId)) {
                    console.log(`User ${userId} is already connected. Closing old connection.`);
                    const oldWs = connectedUsers.get(userId);
                    if (oldWs && oldWs.readyState === WebSocket.OPEN) {
                        oldWs.close(1000, 'New connection established');
                    }
                }

                // 将用户ID与WebSocket连接关联起来并存储
                ws.userId = userId; // 在WebSocket对象上附加一个属性
                connectedUsers.set(userId, ws);
                console.log(`User ${userId} registered. Total connected users: ${connectedUsers.size}`);

                // 可以向客户端发送注册成功的消息
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'registrationSuccess', userId: userId }));
                }
                return; // 处理完注册消息后退出
            }

            // 如果消息不是注册消息，并且客户端还没有注册，则忽略或发送错误
            if (!ws.userId) {
                console.log('Received message from unregistered client. Ignoring or sending error.');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Please register first.' }));
                }
                return; // 未注册用户，不处理后续消息
            }

            // --- 处理其他消息（只有注册后的客户端才能发送）---
            const currentUserId = ws.userId;
            console.log(`Received message from registered user ${currentUserId} of type: ${data.type}`);

            // 使用数据库连接池获取连接
            let connection;
            try {
                connection = await pool.getConnection();

                switch (data.type) {
                    case 'dial':
                        // 收到拨号消息
                        console.log(`User ${currentUserId} is dialing number: ${data.number}`);

                        // 查找目标用户的唯一 ID
                        const targetUser = await findUserByDialNumber(data.number, connection); // 查找用户和ID

                        if (targetUser && connectedUsers.has(targetUser.id)) {
                            const targetUserId = targetUser.id;
                            const callId = generateCallId(); // 生成一个唯一的呼叫ID
                            const startTime = Math.floor(Date.now() / 1000); // Unix时间戳

                            // ** 插入新的呼叫记录到数据库 **
                            try {
                                const [result] = await connection.execute(
                                    'INSERT INTO `la_call_records` (`call_id`, `dialer_user_id`, `backend_user_id`, `dialed_number`, `start_time`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                    [callId, currentUserId, targetUserId, data.number, startTime, 'ringing', startTime, startTime]
                                );
                                console.log('Inserted new call record:', result.insertId);
                            } catch (dbErr) {
                                console.error('Database error inserting call record:', dbErr);
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'dialFailed', number: data.number, message: 'Internal server error (DB)' }));
                                }
                                break; // 插入失败，不继续处理
                            }

                            const incomingCallMessage = {
                                type: 'incomingCall',
                                number: data.number,
                                callId: callId,
                                dialerUserId: currentUserId
                            };

                            // 向目标后台用户发送 incomingCall 消息
                            const targetWs = connectedUsers.get(targetUserId);
                            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                                targetWs.send(JSON.stringify(incomingCallMessage));
                                console.log(`Sent incomingCall to user ${targetUserId} for number ${data.number}, callId: ${callId}`);

                                // 存储内存中的活动呼叫状态
                                activeCalls.set(callId, {
                                    dialerUserId: currentUserId,
                                    backendUserId: targetUserId,
                                    number: data.number,
                                    status: 'ringing',
                                    startTime: startTime // 存储开始时间方便计算时长
                                });

                                // TODO: 可以向拨号器客户端发送一个消息，确认呼叫已发出，正在等待接听
                                // ws.send(JSON.stringify({ type: 'dialInitiated', callId: callId, number: data.number }));

                            } else {
                                console.log(`Target user ${targetUserId} is not connected or WS not open.`);
                                // TODO: 更新数据库中的呼叫状态为未接听或失败
                                await updateCallStatus(callId, 'no_answer', connection);
                                await updateCallEndTimeAndDuration(callId, startTime, startTime, connection); // 未接听，时长为0
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'dialFailed', number: data.number, message: 'Target user offline' }));
                                }
                                // 从内存中移除呼叫状态
                                activeCalls.delete(callId);
                            }

                        } else {
                            console.log(`Could not find a target user or user is not connected for number ${data.number}`);
                            // TODO: 可以在数据库记录拨号失败，或者不记录
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'dialFailed', number: data.number, message: 'Target user not found or offline' }));
                            }
                        }
                        break;

                    case 'answerCall':
                        // 收到接听消息
                        console.log(`User ${currentUserId} wants to answer call: ${data.callId}`);
                        const callToAnswer = activeCalls.get(data.callId);

                        // 验证是否是目标后台用户发来的接听消息，且呼叫状态正确
                        if (callToAnswer && callToAnswer.backendUserId === currentUserId && callToAnswer.status === 'ringing') {
                            // ** 更新数据库中的呼叫状态为 connected **
                            const success = await updateCallStatus(data.callId, 'connected', connection);

                            if (success) {
                                callToAnswer.status = 'connected'; // 更新内存状态
                                console.log(`Call ${data.callId} answered by user ${currentUserId}`);

                                const callAcceptedMessage = {
                                    type: 'callAccepted',
                                    callId: data.callId
                                };

                                // 通知拨号用户和后台用户呼叫已接通
                                const dialerWs = connectedUsers.get(callToAnswer.dialerUserId);
                                if (dialerWs && dialerWs.readyState === WebSocket.OPEN) {
                                    dialerWs.send(JSON.stringify(callAcceptedMessage));
                                }
                                const backendWs = connectedUsers.get(callToAnswer.backendUserId);
                                if (backendWs && backendWs.readyState === WebSocket.OPEN) {
                                    backendWs.send(JSON.stringify(callAcceptedMessage));
                                }
                            } else {
                                console.error(`Failed to update DB status for call ${data.callId}`);
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'error', message: `Failed to answer call ${data.callId}` }));
                                }
                            }
                        } else {
                            console.log(`Invalid answerCall request from user ${currentUserId} for call ${data.callId}`);
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'error', message: `Invalid request for call ${data.callId}` }));
                            }
                        }
                        break;

                    case 'hangupCall':
                        // 收到挂断消息
                        console.log(`User ${currentUserId} wants to hangup call: ${data.callId}`);
                        const callToHangup = activeCalls.get(data.callId);
                        const endTime = Math.floor(Date.now() / 1000);

                        // 验证是否是参与呼叫的用户发来的挂断消息，且呼叫状态未结束
                        if (callToHangup && (callToHangup.dialerUserId === currentUserId || callToHangup.backendUserId === currentUserId) && callToHangup.status !== 'ended') {
                            // ** 更新数据库中的呼叫状态为 completed **
                            const success = await updateCallStatus(data.callId, 'completed', connection); // 或 'canceled'/'backend_canceled' 等更具体的状态

                            if (success) {
                                // 更新数据库中的结束时间和时长
                                await updateCallEndTimeAndDuration(data.callId, callToHangup.startTime, endTime, connection);

                                callToHangup.status = 'ended'; // 更新内存状态
                                console.log(`Call ${data.callId} hung up by user ${currentUserId}`);

                                const callEndedMessage = {
                                    type: 'callEnded',
                                    callId: data.callId,
                                    reason: 'user_hangup' // 可以更具体，例如 'dialer_hangup' 或 'backend_hangup'
                                };

                                // 通知参与呼叫的双方呼叫已结束
                                const dialerWs = connectedUsers.get(callToHangup.dialerUserId);
                                if (dialerWs && dialerWs.readyState === WebSocket.OPEN) {
                                    dialerWs.send(JSON.stringify(callEndedMessage));
                                }
                                const backendWs = connectedUsers.get(callToHangup.backendUserId);
                                if (backendWs && backendWs.readyState === WebSocket.OPEN) {
                                    backendWs.send(JSON.stringify(callEndedMessage));
                                }

                                // 清理内存中的呼叫状态
                                activeCalls.delete(data.callId);
                            } else {
                                console.error(`Failed to update DB status for call ${data.callId}`);
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'error', message: `Failed to hangup call ${data.callId}` }));
                                }
                            }

                        } else {
                            console.log(`Invalid hangupCall request from user ${currentUserId} for call ${data.callId}`);
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'error', message: `Invalid request for call ${data.callId}` }));
                            }
                        }
                        break;

                    // TODO: 根据需要添加其他消息类型处理

                    default:
                        console.log(`Unknown message type received from user ${currentUserId}: ${data.type}`);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
                        }
                }

            } finally {
                // 确保释放数据库连接
                if (connection) {
                    connection.release();
                }
            }

        } catch (error) {
            console.error(`Error processing message from user ${ws.userId}: ${error}`);
            // 向发送消息的客户端发送错误消息
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'Internal server error' })); // 避免暴露详细错误信息
            }
        }
    });

    // 处理客户端断开连接
    ws.on('close', async function close(code, reason) { // 将回调函数改为 async
        const disconnectedUserId = ws.userId;
        if (disconnectedUserId) {
            console.log(`User ${disconnectedUserId} disconnected (Code: ${code}, Reason: ${reason}).`);
            connectedUsers.delete(disconnectedUserId); // 从连接列表中移除用户

            // 检查该用户是否正在进行呼叫，并结束呼叫状态
            let connection;
            try {
                connection = await pool.getConnection();

                // 查找该用户参与的任何进行中的呼叫 (状态不是 'ended' 相关的)
                const callsInvolved = Array.from(activeCalls.values()).filter(
                    call => (call.dialerUserId === disconnectedUserId || call.backendUserId === disconnectedUserId) && call.status !== 'ended'
                );

                for (const call of callsInvolved) {
                    console.log(`Call ${call.callId} ended due to user ${disconnectedUserId} disconnection.`);
                    const endTime = Math.floor(Date.now() / 1000);

                    // ** 更新数据库中的呼叫状态和结束时间/时长 **
                    const endStatus = call.status === 'ringing' ? 'no_answer' : 'disconnected'; // 根据断开时的状态设置结束状态
                    await updateCallStatus(call.callId, endStatus, connection);
                    await updateCallEndTimeAndDuration(call.callId, call.startTime, endTime, connection);

                    const callEndedMessage = {
                        type: 'callEnded',
                        callId: call.callId,
                        reason: 'client disconnected' // 添加断开原因
                    };

                    // 通知另一方用户（如果在线）
                    const otherUserId = call.dialerUserId === disconnectedUserId ? call.backendUserId : call.dialerUserId;
                    if (otherUserId && connectedUsers.has(otherUserId)) {
                        const otherUserWs = connectedUsers.get(otherUserId);
                        if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
                            otherUserWs.send(JSON.stringify(callEndedMessage));
                        }
                    }
                    // 从内存中移除呼叫状态
                    activeCalls.delete(call.callId); // 使用 call.callId 来删除
                }

            } catch (dbErr) {
                console.error(`Database error during client ${disconnectedUserId} disconnection cleanup:`, dbErr);
            } finally {
                // 确保释放数据库连接
                if (connection) {
                    connection.release();
                }
            }

        } else {
            console.log(`An unregistered client disconnected (Code: ${code}, Reason: ${reason}).`);
        }
        console.log(`Current connected users: ${connectedUsers.size}`);
    });

    // 处理连接错误
    ws.on('error', function error(err) {
        const erroredUserId = ws.userId || 'unregistered';
        console.error(`WebSocket error for user ${erroredUserId}: ${err}`);
        // 错误通常会紧跟着 close 事件，所以清理逻辑主要在 close 事件中处理
    });
});

// --- 辅助函数 (数据库操作) ---

// 更新呼叫记录的状态
async function updateCallStatus(callId, status, connection) {
    try {
        const [result] = await connection.execute(
            'UPDATE `la_call_records` SET `status` = ?, `updated_at` = ? WHERE `call_id` = ?',
            [status, Math.floor(Date.now() / 1000), callId]
        );
        console.log(`Updated call ${callId} status to ${status}. Rows affected: ${result.affectedRows}`);
        return result.affectedRows > 0;
    } catch (error) {
        console.error(`Database error updating status for call ${callId}:`, error);
        return false;
    }
}

// 更新呼叫记录的结束时间和持续时间
async function updateCallEndTimeAndDuration(callId, startTime, endTime, connection) {
    const duration = endTime - startTime; // 计算时长（秒）
    try {
        const [result] = await connection.execute(
            'UPDATE `la_call_records` SET `end_time` = ?, `duration` = ?, `updated_at` = ? WHERE `call_id` = ?',
            [endTime, duration, Math.floor(Date.now() / 1000), callId]
        );
        console.log(`Updated call ${callId} end time and duration. Rows affected: ${result.affectedRows}`);
        return result.affectedRows > 0;
    } catch (error) {
        console.error(`Database error updating end time/duration for call ${callId}:`, error);
        return false;
    }
}

// --- 辅助函数 (其他) ---

// 简单的生成唯一呼叫ID的函数
function generateCallId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 8); // 增加长度以降低冲突概率
}

// ** 实现根据拨号号码查找用户ID的逻辑 **
// 通过查询 la_user 表来查找与拨号号码匹配的用户
// 返回用户对象 { id, mobile, ... } 或 null
async function findUserByDialNumber(number, connection) {
    try {
        // 假设 la_user 表中存储电话号码的字段是 'mobile'
        const [rows] = await connection.execute(
            'SELECT `id`, `mobile` FROM `la_user` WHERE `mobile` = ? LIMIT 1',
            [number]
        );

        if (rows.length > 0) {
            console.log(`Found user ${rows[0].id} for number ${number}`);
            return rows[0]; // 返回找到的用户对象
        } else {
            console.log(`No user found for number ${number}`);
            return null;
        }
    } catch (error) {
        console.error(`Database error finding user by number ${number}:`, error);
        return null;
    }
}


// 如果您需要处理其他类型的请求（例如 POST），可以在这里添加相应的 app.post(...) 等