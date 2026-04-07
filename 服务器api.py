import asyncio
import websockets
import mysql.connector
import json
import time
import uuid
import http.server
import socketserver
import threading
import urllib.parse
from http import HTTPStatus
import websockets.protocol
import re
import requests

# --- 数据库配置 ---
db_config = {
    'host': 'localhost',  # 您的数据库主机
    'user': 'phone',      # 您的数据库用户名
    'password': 'phone2025',  # 您的数据库密码
    'database': 'phone'   # 您的数据库名称
}

# --- 内存中的状态管理 ---
# dictionary<userId, websocket> - 已注册并连接的用户
connected_users = {}
# 添加铃声状态管理
ringtone_status = {
    'isPlaying': False,
    'lastUpdateTime': 0,
    'userId': None  # 添加用户ID字段
}

# 全局变量
websocket_event_loop = None  # 存储WebSocket服务器的事件循环

# --- 辅助函数 (数据库操作) ---
def get_db_connection():
    """获取一个新的数据库连接"""
    try:
        return mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None

def close_db_connection(connection):
    """关闭数据库连接"""
    if connection:
        connection.close()

def get_active_call(call_id, connection):
    """从数据库获取活动通话信息"""
    cursor = connection.cursor(dictionary=True)
    try:
        sql = """
            SELECT * FROM `la_call_records` 
            WHERE `call_id` = %s 
            AND status NOT IN ('ended', 'completed', 'failed', 'no_answer', 'disconnected', 'canceled')
            LIMIT 1
        """
        cursor.execute(sql, (call_id,))
        return cursor.fetchone()
    except mysql.connector.Error as err:
        print(f"Database error getting active call {call_id}: {err}")
        return None
    finally:
        cursor.close()

def get_user_active_calls(user_id, connection):
    """获取用户的活动通话"""
    cursor = connection.cursor(dictionary=True)
    try:
        sql = """
            SELECT * FROM `la_call_records` 
            WHERE (dialer_user_id = %s OR backend_user_id = %s) 
            AND status NOT IN ('ended', 'completed', 'failed', 'no_answer', 'disconnected', 'canceled', 'weijie', 'guaduan')
            ORDER BY start_time DESC
        """
        cursor.execute(sql, (user_id, user_id))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        print(f"Database error getting active calls for user {user_id}: {err}")
        return []
    finally:
        cursor.close()

def update_call_status(call_id, status, connection):
    """更新呼叫记录的状态"""
    cursor = connection.cursor()
    try:
        sql = "UPDATE `la_call_records` SET `status` = %s, `updated_at` = %s WHERE `call_id` = %s"
        updated_at = int(time.time())
        cursor.execute(sql, (status, updated_at, call_id))
        connection.commit()
        print(f"Updated call {call_id} status to {status}. Rows affected: {cursor.rowcount}")
        if cursor.rowcount > 0:
            # 获取通话信息以便通知相关用户
            # Re-fetch the call to get the updated status and user IDs
            updated_call_info = get_active_call(call_id, connection) 
            if updated_call_info:
                 print(f"Successfully updated status for call {call_id}. Notifying users.")
                 # Use a new event loop to run the async notification
                 try:
                     loop = asyncio.new_event_loop()
                     asyncio.set_event_loop(loop)
                     loop.run_until_complete(notify_users_refresh(updated_call_info.get('dialer_user_id'), updated_call_info.get('backend_user_id')))
                     loop.close()
                 except Exception as e:
                     print(f"Error notifying users after status update: {e}")
            return True
        return False
    except mysql.connector.Error as err:
        print(f"Database error updating status for call {call_id}: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def update_call_end_time_and_duration(call_id, start_time, end_time, connection):
    """更新呼叫记录的结束时间和持续时间"""
    duration = end_time - start_time if start_time is not None and end_time is not None else None
    cursor = connection.cursor()
    try:
        sql = "UPDATE `la_call_records` SET `end_time` = %s, `duration` = %s, `updated_at` = %s WHERE `call_id` = %s"
        updated_at = int(time.time())
        cursor.execute(sql, (end_time, duration, updated_at, call_id))
        connection.commit()
        print(f"Updated call {call_id} end time and duration. Rows affected: {cursor.rowcount}")
        if cursor.rowcount > 0:
            # Getting call_info here might get the status before the end_time update
            # It's better to get call info after both status and end time are potentially updated,
            # or rely on the status update notification. Let's rely on status update notification primarily,
            # but ensure this also triggers a refresh if status wasn't just updated (e.g. if only duration changes)
            # Re-fetching the call here is safer if this function can be called independently.
            call_info = get_active_call(call_id, connection)
            if call_info:
                print(f"Updated call {call_id} end time/duration. Notifying users.")
                # Use a new event loop to run the async notification
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(notify_users_refresh(call_info.get('dialer_user_id'), call_info.get('backend_user_id')))
                    loop.close()
                except Exception as e:
                    print(f"Error notifying users after end time update: {e}")
        return True
    except mysql.connector.Error as err:
        print(f"Database error updating end time/duration for call {call_id}: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def insert_call_record(call_id, dialer_user_id, backend_user_id, dialed_number, start_time, status, connection, location=None, call_type='normal'):
    """插入新的呼叫记录"""
    cursor = connection.cursor()
    try:
        sql = "INSERT INTO `la_call_records` (`call_id`, `dialer_user_id`, `backend_user_id`, `dialed_number`, `start_time`, `status`, `location`, `call_type`, `display`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        created_at = updated_at = int(time.time())
        cursor.execute(sql, (call_id, dialer_user_id, backend_user_id, dialed_number, start_time, status, location, call_type, 1, created_at, updated_at))
        connection.commit()
        print(f"Inserted new call record with ID: {call_id}. Notifying users {dialer_user_id}, {backend_user_id}")
        # Use a new event loop to run the async notification
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(notify_users_refresh(dialer_user_id, backend_user_id))
            loop.close()
        except Exception as e:
             print(f"Error notifying users after insert: {e}")
        return True
    except mysql.connector.Error as err:
        print(f"Database error inserting call record: {err}")
        connection.rollback()
        return False
    finally:
        cursor.close()


# --- 辅助函数 (其他) ---
def generate_call_id():
    """生成一个唯一的呼叫ID"""
    return str(uuid.uuid4()) # 使用UUID更可靠
    
async def notify_users_refresh(*user_ids):
    """Send refresh notification to specified users if they are connected via WebSocket."""
    message = json.dumps({'type': 'refreshCallRecords'})
    for user_id in user_ids:
        if user_id and user_id in connected_users:
            ws = connected_users[user_id]
            try:
                await ws.send(message)
                print(f"Sent refreshCallRecords to user {user_id}")
            except Exception as e:
                print(f"Error sending refreshCallRecords to user {user_id}: {e}")


# --- WebSocket 消息处理 ---
async def process_message(websocket, message):
    """处理来自客户端的单个消息"""
    try:
        data = json.loads(message)
        print(f"Received message: {data}")

        # 检查是否是已注册用户发送的消息
        current_user_id = None
        if hasattr(websocket, 'user_id'):
            current_user_id = websocket.user_id

        # 处理客户端注册消息
        if data.get('type') == 'register' and data.get('userId'):
            user_id = data['userId']

            # 检查用户ID是否已经被占用
            if user_id in connected_users:
                print(f"User {user_id} is already connected. Closing old connection.")
                old_ws = connected_users.get(user_id)
                try:
                    await old_ws.close(code=1000, reason='New connection established')
                    print(f"Old connection for user {user_id} closed successfully.")
                except Exception as close_err:
                    print(f"Error closing old connection for user {user_id}: {close_err}")

            # 将用户ID与WebSocket连接关联起来并存储
            websocket.user_id = user_id
            connected_users[user_id] = websocket
            print(f"User {user_id} registered. Total connected users: {len(connected_users)}")

            # 发送注册成功的消息
            await websocket.send(json.dumps({'type': 'registrationSuccess', 'userId': user_id}))

            # 检查用户是否有正在进行的通话，如果有则发送当前通话状态
            conn = get_db_connection()
            if conn:
                try:
                    active_calls = get_user_active_calls(user_id, conn)
                    if active_calls:
                        # 如果找到未结束的通话，发送当前通话状态
                        for call in active_calls:
                            call_status_message = {
                                'type': 'callStatus',
                                'callId': call['call_id'],
                                'status': call['status'],
                                'number': call['dialed_number'],
                                'dialerUserId': call['dialer_user_id'],
                                'backendUserId': call['backend_user_id'],
                                'call_type': call.get('call_type', 'normal')
                            }
                            await websocket.send(json.dumps(call_status_message))
                            print(f"Sent active call status to reconnected user {user_id}")
                except Exception as db_err:
                    print(f"Error checking active calls for user {user_id}: {db_err}")
                finally:
                    close_db_connection(conn)

            return

        # 如果消息不是注册消息，并且客户端还没有注册，则忽略或发送错误
        if not current_user_id:
            print("Received message from unregistered client. Ignoring or sending error.")
            return

        print(f"Processing message from registered user {current_user_id} of type: {data.get('type')}")

        # --- 处理其他 WebSocket 消息 (如接听、挂断) ---
        conn = get_db_connection()
        if not conn:
            await websocket.send(json.dumps({'type': 'error', 'message': 'Database connection failed'}))
            return

        try:
            # 处理接听消息
            if data.get('type') == 'answerCall' and data.get('callId'):
                call_id = data['callId']
                print(f"User {current_user_id} wants to answer call: {call_id}")
                
                # 从数据库获取通话信息
                call_to_answer = get_active_call(call_id, conn)
                
                # 验证是否是目标后台用户发来的接听消息，且呼叫状态正确
                if call_to_answer and call_to_answer['backend_user_id'] == current_user_id and call_to_answer['status'] == 'ringing':
                    # 更新数据库中的呼叫状态为 connected
                    if update_call_status(call_id, 'connected', conn):
                        print(f"Call {call_id} answered by user {current_user_id}")

                        call_accepted_message = {
                            'type': 'callAccepted',
                            'callId': call_id
                        }

                        # 通知拨号用户和后台用户呼叫已接通
                        dialer_ws = connected_users.get(call_to_answer['dialer_user_id'])
                        if dialer_ws:
                            try:
                                await dialer_ws.send(json.dumps(call_accepted_message))
                            except Exception as send_err:
                                print(f"Error sending callAccepted to dialer {call_to_answer['dialer_user_id']}: {send_err}")

                        backend_ws = connected_users.get(call_to_answer['backend_user_id'])
                        if backend_ws:
                            try:
                                await backend_ws.send(json.dumps(call_accepted_message))
                            except Exception as send_err:
                                print(f"Error sending callAccepted to backend {call_to_answer['backend_user_id']}: {send_err}")

                    else:
                        print(f"Failed to update DB status for call {call_id} on answer.")
                        await websocket.send(json.dumps({'type': 'error', 'message': f"Failed to answer call {call_id}"}))
                else:
                    print(f"Invalid answerCall request from user {current_user_id} for call {call_id}")
                    await websocket.send(json.dumps({'type': 'error', 'message': f"Invalid request for call {call_id}"}))

            # 处理挂断消息
            elif data.get('type') == 'hangupCall' and data.get('callId'):
                call_id = data['callId']
                print(f"User {current_user_id} wants to hangup call: {call_id}")
                
                # 从数据库获取通话信息
                call_to_hangup = get_active_call(call_id, conn)
                end_time = int(time.time())

                # 验证是否是参与呼叫的用户发来的挂断消息，且呼叫状态未结束
                if call_to_hangup and (call_to_hangup['dialer_user_id'] == current_user_id or call_to_hangup['backend_user_id'] == current_user_id):
                    # 更新数据库中的呼叫状态
                    end_status = 'completed' # 默认完成
                    if call_to_hangup['status'] == 'ringing':
                        # 检查是否是回拨电话
                        if call_to_hangup.get('call_type') == 'redial':
                            end_status = 'no_answer' # 如果是回拨电话且在响铃状态挂断，标记为未接听
                        else:
                            end_status = 'canceled' # 如果不是回拨电话，标记为取消

                    if update_call_status(call_id, end_status, conn):
                        print(f"Successfully updated status for call {call_id} to {end_status}.")
                        # 更新结束时间和时长
                        if update_call_end_time_and_duration(call_id, call_to_hangup['start_time'], end_time, conn):
                            print(f"Successfully updated end time and duration for call {call_id}.")
                        else:
                            print(f"Failed to update end time and duration for call {call_id}.")

                        # 通知另一方用户
                        other_user_id = None
                        if call_to_hangup['dialer_user_id'] == current_user_id:
                            other_user_id = call_to_hangup['backend_user_id']
                        elif call_to_hangup['backend_user_id'] == current_user_id:
                            other_user_id = call_to_hangup['dialer_user_id']

                        if other_user_id and other_user_id in connected_users:
                            other_user_ws = connected_users[other_user_id]
                            if other_user_ws:
                                try:
                                    call_ended_message = {
                                        'type': 'callEnded',
                                        'callId': call_id,
                                        'reason': 'user_hangup',
                                        'endStatus': end_status
                                    }
                                    send_ws_message(other_user_ws, call_ended_message)
                                    print(f"Sent callEnded to user {other_user_id}.")
                                except Exception as send_err:
                                    print(f"Error sending callEnded to user {other_user_id}: {send_err}")

                    else:
                        print(f"Failed to update DB status for call {call_id} on hangup.")
                        await websocket.send(json.dumps({'type': 'error', 'message': f'Failed to hangup call {call_id}'}))

            else:
                print(f"Unknown WebSocket message type received from user {current_user_id}: {data.get('type')}")
                await websocket.send(json.dumps({'type': 'error', 'message': f"Unknown message type: {data.get('type')}"}))

        except json.JSONDecodeError:
            print(f"Received invalid JSON via WebSocket from user {current_user_id}: {message}")
            await websocket.send(json.dumps({'type': 'error', 'message': 'Invalid JSON format'}))
        except Exception as e:
            print(f"Error processing WebSocket message from user {current_user_id}: {e}")
            await websocket.send(json.dumps({'type': 'error', 'message': 'Internal server error'}))
        finally:
            close_db_connection(conn)
    except Exception as e:
        print(e)


async def check_heartbeat(websocket, last_ping_time):
    """检查心跳状态"""
    try:
        while True:
            await asyncio.sleep(30)  # 每30秒检查一次
            if time.time() - last_ping_time > 30:  # 如果超过30秒没有收到心跳
                print("No heartbeat received, closing connection")
                await websocket.close(code=1000, reason="No heartbeat")
                break
    except asyncio.CancelledError:
        print("Heartbeat check cancelled")
    except Exception as e:
        print(f"Error in heartbeat check: {e}")
        try:
            await websocket.close(code=1011, reason="Heartbeat error")
        except:
            pass

def send_ws_message(ws, message):
    """Helper function to send WebSocket message from any thread"""
    if websocket_event_loop and ws:
        asyncio.run_coroutine_threadsafe(ws.send(json.dumps(message)), websocket_event_loop)
        
async def websocket_handler(websocket):
    """处理WebSocket连接"""
    global websocket_event_loop
    websocket_event_loop = asyncio.get_event_loop()
    print("A client connected, waiting for user registration.")
    try:
        # 在连接对象上存储用户 ID，初始为 None
        websocket.user_id = None
        last_ping_time = time.time()
        
        # 启动心跳检查任务
        heartbeat_task = asyncio.create_task(check_heartbeat(websocket, last_ping_time))
        
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get('type') == 'ping':
                    last_ping_time = time.time()
                    await websocket.send(json.dumps({'type': 'pong'}))
                    continue
                await process_message(websocket, message)
            except json.JSONDecodeError:
                print(f"Invalid JSON received: {message}")
                continue
            except Exception as e:
                print(f"Error processing message: {e}")
                continue
                
    except websockets.exceptions.ConnectionClosed as e:
        print(f"WebSocket connection closed: {e.code} - {e.reason}")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # 取消心跳检查任务
        if 'heartbeat_task' in locals():
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # 处理客户端断开连接
        disconnected_user_id = getattr(websocket, 'user_id', None)
        if disconnected_user_id:
            print(f"User {disconnected_user_id} disconnected.")
            connected_users.pop(disconnected_user_id, None)


        else:
             print("An unregistered client disconnected.")

        print(f"Current connected users: {len(connected_users)}")


# --- HTTP 服务器 (用于获取历史记录 和 处理拨号请求) ---
class CallRecordsHTTPHandler(http.server.BaseHTTPRequestHandler):

    # 允许 CORS 预检请求
    def do_OPTIONS(self):
        self.send_response(HTTPStatus.OK)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_success_response(self, data):
        """发送成功响应"""
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        response_data = {'code': 0, 'msg': 'Success', 'data': data}
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def send_error_response(self, message):
        """发送错误响应"""
        self.send_response(HTTPStatus.BAD_REQUEST)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        response_data = {'code': 1, 'msg': message}
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
            
        if parsed_url.path == '/api/dial':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return
                
                # 验证必要参数
                required_fields = ['dialerUserId', 'targetUserId', 'number']
                for field in required_fields:
                    if field not in data:
                        self.send_error_response(f'Missing required field: {field}')
                        return

                dialer_user_id = data['dialerUserId']
                target_user_id = data['targetUserId']
                dialed_number = data['number']
                location = data.get('location', '未知位置')
                call_type = data.get('callType', 'normal')

                print(f"Received HTTP POST dial request: Dialer User ID: {dialer_user_id}, Target User ID: {target_user_id}, Dialed Number: {dialed_number}, Location: {location}, Call Type: {call_type}")

                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    # 检查目标用户是否在线
                    target_ws = connected_users.get(target_user_id)
                    is_connected = False
                    if target_ws:
                        try:
                            is_connected = True
                        except Exception as e:
                            print(e)
                            is_connected = False

                    # 插入新的呼叫记录到数据库
                    call_id = generate_call_id()
                    start_time = int(time.time())
                    initial_status = 'ringing'
                    if insert_call_record(call_id, dialer_user_id, target_user_id, dialed_number, start_time, initial_status, conn, location, call_type):
                        # 如果目标用户在线，发送 incomingCall 消息
                        if is_connected:
                            # 查询号码的标记类型
                            mark_type_from_db = None
                            try:
                                mark_cursor = conn.cursor(dictionary=True)
                                sql_get_mark = "SELECT mark_type FROM `la_call_mark` WHERE `dialed_number` = %s LIMIT 1"
                                mark_cursor.execute(sql_get_mark, (dialed_number,))
                                mark_result = mark_cursor.fetchone()
                                if mark_result:
                                    mark_type_from_db = mark_result['mark_type']
                            except Exception as mark_err:
                                print(f"Error querying mark_type for number {dialed_number}: {mark_err}")
                            finally:
                                if 'mark_cursor' in locals() and mark_cursor:
                                    mark_cursor.close()

                            incoming_call_message = {
                                'type': 'incomingCall',
                                'number': dialed_number,
                                'callId': call_id,
                                'dialerUserId': dialer_user_id,
                                'mark_type': mark_type_from_db,
                                'call_type': call_type
                            }

                            try:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)
                                loop.run_until_complete(target_ws.send(json.dumps(incoming_call_message)))
                                loop.close()
                                print(f"Sent incomingCall to target user {target_user_id} via WS for number {dialed_number}, callId: {call_id}")
                            except Exception as ws_send_err:
                                print(f"Failed to send incomingCall via WS to user {target_user_id}: {ws_send_err}")

                        self.send_success_response({'callId': call_id})

                except mysql.connector.Error as err:
                    print(f"Database error in /api/dial: {err}")
                    self.send_error_response('Failed to create call record')
                finally:
                    if 'conn' in locals():
                        close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/dial: {e}")
                self.send_error_response('Internal server error')

            return

        elif parsed_url.path == '/api/hangup':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                call_id = data.get('callId')
                action = data.get('action') # reject or hangup
                # user_id = data.get('userId') # 如果需要验证操作用户，可以从这里获取

                if not call_id or not action:
                    self.send_response(HTTPStatus.BAD_REQUEST)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Missing callId or action in request'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Database connection failed'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                try:
                    # 获取当前呼叫状态
                    call = get_active_call(call_id, conn)
                    if not call:
                        self.send_response(HTTPStatus.NOT_FOUND)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        response_data = {'code': 1, 'msg': 'Call not found or already ended'}
                        self.wfile.write(json.dumps(response_data).encode('utf-8'))
                        return

                    end_time = int(time.time())
                    # end_status = 'completed' # 默认状态 (我们将根据 action 或当前状态判断)

                    # ===> 根据 action 或当前通话状态设置结束状态 <===
                    end_status = 'completed' # 默认状态

                    # 优先根据 action 设置状态
                    if action == 'guaduan':
                        end_status = 'guaduan'
                    elif action == 'weijie':
                        end_status = 'weijie'
                    else:
                        # 如果 action 不是特定的 'guaduan' 或 'weijie'，则使用原有的逻辑
                        # 根据当前通话状态和 action 设置结束状态
                        if call['status'] == 'ringing':
                            if action == 'reject':
                                end_status = 'rejected' # 被叫方拒接
                                # TODO: 在这里添加调用 Calling 系统播放拒接铃声的逻辑 (HTTP)
                                print(f"TODO HTTP: Call Calling system to play reject ringtone for call {call_id}")
                            elif action == 'hangup':
                                # 检查是否是回拨电话
                                if call.get('call_type') == 'redial':
                                    end_status = 'no_answer' # 如果是回拨电话且在响铃状态挂断，标记为未接听
                                else:
                                    end_status = 'canceled' # 如果不是回拨电话，标记为取消
                                # TODO: 在这里添加调用 Calling 系统播放挂断铃声的逻辑 (如果需要不同于拒接的铃声) (HTTP)
                                print(f"TODO HTTP: Call Calling system to play hangup ringtone for call {call_id}")
                            # else: 如果 action 不是 reject 或 hangup，状态保持不变或根据其他默认逻辑处理

                        elif call['status'] == 'connected':
                             end_status = 'completed' # 通话中挂断
                             if action == 'hangup':
                                  # TODO: 在这里添加调用 Calling 系统播放通话结束铃声的逻辑 (HTTP)
                                  print(f"TODO HTTP: Call Calling system to play completed ringtone for call {call_id}")
                             # else: 如果 action 不是 hangup，通话中通常只有挂断操作
                    # ===> 结束设置结束状态 <===

                    # 更新数据库中的呼叫状态
                    if update_call_status(call_id, end_status, conn):
                        print(f"Successfully updated status for call {call_id} to {end_status} via HTTP.")
                        # 更新结束时间和时长
                        if update_call_end_time_and_duration(call_id, call.get('start_time'), end_time, conn):
                            print(f"Successfully updated end time and duration for call {call_id} via HTTP.")
                        else:
                            print(f"Failed to update end time and duration for call {call_id} via HTTP.")

                        # TODO: 通知另一方用户 (拨号方) 通话已结束，可以通过 WebSocket 发送消息
                        # 这部分需要获取到拨号方的 user_id，然后查找其 WebSocket 连接并发送消息
                        dialer_user_id = call.get('dialer_user_id')
                        if dialer_user_id and dialer_user_id in connected_users:
                            dialer_ws = connected_users[dialer_user_id]
                            if dialer_ws:
                                try:
                                    call_ended_message = {
                                        'type': 'callEnded',
                                        'callId': call_id,
                                        'reason': action, # 使用 action 作为结束原因
                                        'endStatus': end_status
                                    }
                                    send_ws_message(dialer_ws, call_ended_message)
                                    print(f"Sent callEnded to dialer user {dialer_user_id} via WS from HTTP handler.")
                                except Exception as ws_send_err:
                                     print(f"Error sending callEnded via WS from HTTP handler to user {dialer_user_id}: {ws_send_err}")


                        self.send_success_response({'code': 0, 'msg': 'Call action processed successfully', 'status': end_status})

                    else:
                        print(f"Failed to update DB status for call {call_id} via HTTP.")
                        self.send_error_response('Failed to update call status')


                except Exception as e:
                    print(f"Error processing hangup action request: {e}")
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': f'Internal server error: {str(e)}'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                finally:
                    close_db_connection(conn)
            
            except Exception as e:
                print(f"Unexpected error in /api/hangup: {e}")
                self.send_error_response('Internal server error')
            return # Add return after /api/hangup processing

        elif parsed_url.path == '/api/mark-number':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                number = data.get('number')
                mark_type = data.get('markType')
                user_id = data.get('userId')

                if not number or not mark_type:
                    self.send_response(HTTPStatus.BAD_REQUEST)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Missing required parameters'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Database connection failed'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                try:
                    cursor = conn.cursor()
                    # 检查是否已存在该号码的标记
                    check_sql = "SELECT * FROM `la_call_mark` WHERE `dialed_number` = %s"
                    cursor.execute(check_sql, (number,))
                    existing_mark = cursor.fetchone()

                    if existing_mark:
                        # 更新现有标记
                        update_sql = "UPDATE `la_call_mark` SET `mark_type` = %s, `updated_at` = %s WHERE `dialed_number` = %s"
                        updated_at = int(time.time())
                        cursor.execute(update_sql, (mark_type, updated_at, number))
                    else:
                        # 插入新标记
                        insert_sql = "INSERT INTO `la_call_mark` (`dialed_number`, `mark_type`, `marked_by_user_id`, `created_at`, `updated_at`) VALUES (%s, %s, %s, %s, %s)"
                        created_at = updated_at = int(time.time())
                        cursor.execute(insert_sql, (number, mark_type, user_id, created_at, updated_at))

                    conn.commit()

                    self.send_response(HTTPStatus.OK)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 0, 'msg': 'Marked successfully'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))

                except mysql.connector.Error as err:
                    print(f"Database error marking number: {err}")
                    conn.rollback()
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Failed to mark number', 'error': str(err)}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except json.JSONDecodeError:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Invalid JSON format'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            except Exception as e:
                print(f"Error processing mark number request: {e}")
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': f'Internal server error: {str(e)}'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
            
            except Exception as e:
                print(f"Unexpected error in /api/mark-number: {e}")
                self.send_error_response('Internal server error')
            return # Add return after /api/mark-number processing

        elif parsed_url.path == '/api/delete-call-record':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                # 获取要删除的通话记录ID
                call_ids = data.get('callId', [])
                if not call_ids:
                    self.send_response(HTTPStatus.BAD_REQUEST)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'No call IDs provided'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                # 确保 call_ids 是列表
                if not isinstance(call_ids, list):
                    call_ids = [call_ids]

                print(f"Attempting to update display status for call records with IDs: {call_ids}")

                conn = get_db_connection()
                cursor = conn.cursor()

                # 检查记录是否存在
                placeholders = ', '.join(['%s'] * len(call_ids))
                check_sql = f"SELECT COUNT(*) FROM `la_call_records` WHERE `call_id` IN ({placeholders})"
                cursor.execute(check_sql, tuple(call_ids))
                count = cursor.fetchone()[0]

                if count == 0:
                    print(f"Call records not found with IDs: {call_ids}")
                    self.send_response(HTTPStatus.NOT_FOUND)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Call records not found'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                # 更新通话记录的 display 状态
                sql = f"UPDATE `la_call_records` SET `display` = 0, `updated_at` = %s WHERE `call_id` IN ({placeholders})"
                updated_at = int(time.time())
                cursor.execute(sql, (updated_at, *call_ids))
                conn.commit()

                print(f"Successfully updated display status for call records with IDs: {call_ids}")
                self.send_response(HTTPStatus.OK)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 0, 'msg': 'Call records updated successfully'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                
            except mysql.connector.Error as err:
                print(f"Database error updating call records: {err}")
                if 'conn' in locals():
                    conn.rollback()
                self.send_error_response('Failed to update call records')
            finally:
                if 'cursor' in locals():
                    cursor.close()
                if 'conn' in locals():
                    close_db_connection(conn)
            
            return # Add return after /api/delete-call-record processing

        # 发送消息
        elif parsed_url.path == '/api/send-message':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                sender_id = data.get('senderId')
                receiver_phone = data.get('receiverPhone')
                content = data.get('content')
                ismy = data.get('ismy') # Get ismy from request
                
                if not sender_id or not receiver_phone or not content:
                    self.send_error_response('Missing required parameters')
                    return
            
                
                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    cursor = conn.cursor()
                    current_time = int(time.time())

                    # 插入消息记录
                    insert_message_sql = """
                        INSERT INTO `la_messages` 
                        (sender_id, receiver_phone, content, status, ismy, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(insert_message_sql, (sender_id, receiver_phone, content,'sent', ismy, current_time, current_time))
                    message_id = cursor.lastrowid

                    # 更新或创建发送者的会话
                    update_sender_conversation_sql = """
                        INSERT INTO `la_conversations` 
                        (user_id, phone, last_message, last_message_time, unread_count, created_at, updated_at, ismy)
                        VALUES (%s, %s, %s, %s, 0, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                        last_message = VALUES(last_message),
                        last_message_time = VALUES(last_message_time),
                        updated_at = VALUES(updated_at)
                    """
                    cursor.execute(update_sender_conversation_sql,
                                 (sender_id, receiver_phone, content, current_time, current_time, current_time, ismy))

                    # 更新或创建接收者的会话
                    update_receiver_conversation_sql = """
                        INSERT INTO `la_conversations` 
                        (user_id, phone, last_message, last_message_time, unread_count, created_at, updated_at, ismy)
                        VALUES (%s, %s, %s, %s, 1, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                        last_message = VALUES(last_message),
                        last_message_time = VALUES(last_message_time),
                        unread_count = unread_count + 1,
                        updated_at = VALUES(updated_at)
                    """
                    cursor.execute(update_receiver_conversation_sql,
                                 (receiver_phone, sender_id, content, current_time, current_time, current_time, ismy))

                    conn.commit()

                    self.send_success_response({'messageId': message_id})

                except mysql.connector.Error as err:
                    print(f"Database error sending message: {err}")
                    conn.rollback()
                    self.send_error_response('Failed to send message')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/send-message: {e}")
                self.send_error_response('Internal server error')

            return

        # 删除单条消息
        elif parsed_url.path == '/api/delete-message':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                message_id = data.get('messageId')
                user_id = data.get('userId')

                if not message_id or not user_id:
                    self.send_error_response('Missing messageId or userId parameter')
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    cursor = conn.cursor()
                    # 删除消息
                    delete_sql = """
                        DELETE FROM `la_messages`
                        WHERE id = %s AND (sender_id = %s OR receiver_phone = %s)
                    """
                    cursor.execute(delete_sql, (message_id, user_id, user_id))

                    if cursor.rowcount > 0:
                        conn.commit()
                        self.send_success_response({'deleted': True})
                    else:
                        self.send_error_response('Message not found or no permission to delete')

                except mysql.connector.Error as err:
                    print(f"Database error deleting message: {err}")
                    conn.rollback()
                    self.send_error_response('Failed to delete message')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/delete-message: {e}")
                self.send_error_response('Internal server error')

            return

        # 删除单个会话
        elif parsed_url.path == '/api/delete-conversation':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                user_id = data.get('userId')
                phone = data.get('phone')

                if not user_id or not phone:
                    self.send_error_response('Missing userId or phone parameter')
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    cursor = conn.cursor()
                    # 删除会话
                    delete_conversation_sql = """
                        DELETE FROM `la_conversations`
                        WHERE user_id = %s AND phone = %s
                    """
                    cursor.execute(delete_conversation_sql, (user_id, phone))

                    # 删除相关消息
                    delete_messages_sql = """
                        DELETE FROM `la_messages`
                        WHERE (sender_id = %s AND receiver_phone = %s)
                           OR (sender_id = %s AND receiver_phone = %s)
                    """
                    cursor.execute(delete_messages_sql, (user_id, phone, phone, user_id))

                    conn.commit()
                    self.send_success_response({
                        'deleted': True,
                        'conversationDeleted': cursor.rowcount > 0
                    })

                except mysql.connector.Error as err:
                    print(f"Database error deleting conversation: {err}")
                    conn.rollback()
                    self.send_error_response('Failed to delete conversation')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/delete-conversation: {e}")
                self.send_error_response('Internal server error')

            return

        # 批量删除会话
        elif parsed_url.path == '/api/delete-conversations':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                user_id = data.get('userId')
                phones = data.get('phones', [])  # 要删除的会话手机号列表

                if not user_id or not phones:
                    self.send_error_response('Missing userId or phones parameter')
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    cursor = conn.cursor()
                    deleted_count = 0

                    # 对每个手机号执行删除操作
                    for phone in phones:
                        # 删除会话
                        delete_conversation_sql = """
                            DELETE FROM `la_conversations`
                            WHERE user_id = %s AND phone = %s
                        """
                        cursor.execute(delete_conversation_sql, (user_id, phone))

                        # 删除相关消息
                        delete_messages_sql = """
                            DELETE FROM `la_messages`
                            WHERE (sender_id = %s AND receiver_phone = %s)
                               OR (sender_id = %s AND receiver_phone = %s)
                        """
                        cursor.execute(delete_messages_sql, (user_id, phone, phone, user_id))

                        if cursor.rowcount > 0:
                            deleted_count += 1

                    conn.commit()
                    self.send_success_response({
                        'deleted': True,
                        'deletedCount': deleted_count,
                        'totalCount': len(phones)
                    })

                except mysql.connector.Error as err:
                    print(f"Database error batch deleting conversations: {err}")
                    conn.rollback()
                    self.send_error_response('Failed to delete conversations')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/delete-conversations: {e}")
                self.send_error_response('Internal server error')

            return

        # 处理挂断动作 (拒接或挂断)
        elif parsed_url.path == '/api/hangup':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                call_id = data.get('callId')
                action = data.get('action') # reject or hangup
                # user_id = data.get('userId') # 如果需要验证操作用户，可以从这里获取

                if not call_id or not action:
                    self.send_response(HTTPStatus.BAD_REQUEST)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Missing callId or action in request'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Database connection failed'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

                try:
                    # 获取当前呼叫状态
                    call = get_active_call(call_id, conn)
                    if not call:
                        self.send_response(HTTPStatus.NOT_FOUND)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        response_data = {'code': 1, 'msg': 'Call not found or already ended'}
                        self.wfile.write(json.dumps(response_data).encode('utf-8'))
                        return

                    end_time = int(time.time())
                    # end_status = 'completed' # 默认状态 (我们将根据 action 或当前状态判断)

                    # ===> 根据 action 或当前通话状态设置结束状态 <===
                    end_status = 'completed' # 默认状态

                    # 优先根据 action 设置状态
                    if action == 'guaduan':
                        end_status = 'guaduan'
                    elif action == 'weijie':
                        end_status = 'weijie'
                    else:
                        # 如果 action 不是特定的 'guaduan' 或 'weijie'，则使用原有的逻辑
                        # 根据当前通话状态和 action 设置结束状态
                        if call['status'] == 'ringing':
                            if action == 'reject':
                                end_status = 'rejected' # 被叫方拒接
                                # TODO: 在这里添加调用 Calling 系统播放拒接铃声的逻辑 (HTTP)
                                print(f"TODO HTTP: Call Calling system to play reject ringtone for call {call_id}")
                            elif action == 'hangup':
                                # 检查是否是回拨电话
                                if call.get('call_type') == 'redial':
                                    end_status = 'no_answer' # 如果是回拨电话且在响铃状态挂断，标记为未接听
                                else:
                                    end_status = 'canceled' # 如果不是回拨电话，标记为取消
                                # TODO: 在这里添加调用 Calling 系统播放挂断铃声的逻辑 (如果需要不同于拒接的铃声) (HTTP)
                                print(f"TODO HTTP: Call Calling system to play hangup ringtone for call {call_id}")
                            # else: 如果 action 不是 reject 或 hangup，状态保持不变或根据其他默认逻辑处理

                        elif call['status'] == 'connected':
                             end_status = 'completed' # 通话中挂断
                             if action == 'hangup':
                                  # TODO: 在这里添加调用 Calling 系统播放通话结束铃声的逻辑 (HTTP)
                                  print(f"TODO HTTP: Call Calling system to play completed ringtone for call {call_id}")
                             # else: 如果 action 不是 hangup，通话中通常只有挂断操作
                    # ===> 结束设置结束状态 <===

                    # 更新数据库中的呼叫状态
                    if update_call_status(call_id, end_status, conn):
                        print(f"Successfully updated status for call {call_id} to {end_status} via HTTP.")
                        # 更新结束时间和时长
                        if update_call_end_time_and_duration(call_id, call.get('start_time'), end_time, conn):
                            print(f"Successfully updated end time and duration for call {call_id} via HTTP.")
                        else:
                            print(f"Failed to update end time and duration for call {call_id} via HTTP.")

                        # TODO: 通知另一方用户 (拨号方) 通话已结束，可以通过 WebSocket 发送消息
                        # 这部分需要获取到拨号方的 user_id，然后查找其 WebSocket 连接并发送消息
                        dialer_user_id = call.get('dialer_user_id')
                        if dialer_user_id and dialer_user_id in connected_users:
                            dialer_ws = connected_users[dialer_user_id]
                            if dialer_ws:
                                try:
                                    call_ended_message = {
                                        'type': 'callEnded',
                                        'callId': call_id,
                                        'reason': action, # 使用 action 作为结束原因
                                        'endStatus': end_status
                                    }
                                    send_ws_message(dialer_ws, call_ended_message)
                                    print(f"Sent callEnded to dialer user {dialer_user_id} via WS from HTTP handler.")
                                except Exception as ws_send_err:
                                     print(f"Error sending callEnded via WS from HTTP handler to user {dialer_user_id}: {ws_send_err}")


                        self.send_success_response({'code': 0, 'msg': 'Call action processed successfully', 'status': end_status})

                    else:
                        print(f"Failed to update DB status for call {call_id} via HTTP.")
                        self.send_error_response('Failed to update call status')


                except Exception as e:
                    print(f"Error processing hangup action request: {e}")
                    self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': f'Internal server error: {str(e)}'}
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                finally:
                    close_db_connection(conn)
            
            except Exception as e:
                print(f"Unexpected error in /api/hangup: {e}")
                self.send_error_response('Internal server error')
            return # Add return after /api/hangup processing

        # 获取联系人信息
        elif parsed_url.path == '/api/contact':
            try:
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                
                phone = data.get('phone')

                if not phone:
                    self.send_error_response('Missing userId or phone parameter')
                    return

                conn = get_db_connection();
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    cursor = conn.cursor(dictionary=True)
                    # 查询联系人表，不再使用 user_id
                    sql = "SELECT id, phone, name FROM `la_contacts` WHERE `phone` = %s LIMIT 1"
                    cursor.execute(sql, (phone,))
                    contact = cursor.fetchone()

                    if contact:
                        # 找到联系人，返回信息
                        self.send_success_response(contact)
                    else:
                        # 未找到联系人，返回空数据但code为0
                        self.send_success_response(None)

                except mysql.connector.Error as err:
                    print(f"Database error fetching contact: {err}")
                    self.send_error_response('Failed to fetch contact information')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/contact: {e}")
                self.send_error_response('Internal server error')

            return # Add return after /api/contact processing
        
        
        elif parsed_url.path == '/api/ringtone-status':
            try:
                # 获取 Content-Length
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                user_id = data.get('userId')
                is_playing = data.get('isPlaying')
                
                if not user_id or is_playing is None:
                    self.send_error_response('Missing required parameters')
                    return
                    
                # 直接更新内存中的状态
                ringtone_status['isPlaying'] = is_playing
                ringtone_status['lastUpdateTime'] = int(time.time())
                ringtone_status['userId'] = user_id
                
                self.send_success_response({'message': 'Ringtone status updated'})
                
            except Exception as e:
                print(f"Error updating ringtone status: {e}")
                self.send_error_response('Failed to update ringtone status')
            return
        
        elif parsed_url.path == '/api/update-call-status':
            try:
                # 获取 Content-Length
                content_length = 0
                try:
                    content_length = int(self.headers.get('Content-Length', 0))
                except (ValueError, TypeError):
                    self.send_error_response('Invalid Content-Length header')
                    return

                if content_length <= 0:
                    self.send_error_response('Missing or invalid Content-Length')
                    return

                # 读取请求体
                try:
                    post_data = self.rfile.read(content_length)
                except ConnectionResetError:
                    print("Client disconnected while reading request body")
                    return
                except Exception as e:
                    print(f"Error reading request body: {e}")
                    return

                try:
                    data = json.loads(post_data.decode('utf-8'))
                except json.JSONDecodeError:
                    self.send_error_response('Invalid JSON data')
                    return
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                    return

                call_id = data.get('callId')
                new_status = data.get('status')

                if not call_id or not new_status:
                    self.send_error_response('Missing callId or status parameter')
                    return

                conn = get_db_connection()
                if not conn:
                    self.send_error_response('Database connection failed')
                    return

                try:
                    # 获取当前呼叫状态
                    call = get_active_call(call_id, conn)
                    if not call:
                        self.send_error_response('Call not found or already ended')
                        return

                    # 更新通话状态
                    if update_call_status(call_id, new_status, conn):
                        print(f"Call {call_id} status updated to {new_status} via HTTP API")
                        self.send_success_response({
                            'code': 0,
                            'msg': 'Call status updated successfully',
                            'data': {
                                'status': new_status
                            }
                        })
                    else:
                        print(f"Failed to update call status for {call_id}")
                        self.send_error_response('Failed to update call status')

                except mysql.connector.Error as err:
                    print(f"Database error updating call status: {err}")
                    conn.rollback()
                    self.send_error_response('Database error while updating call status')
                finally:
                    close_db_connection(conn)

            except Exception as e:
                print(f"Unexpected error in /api/update-call-status: {e}")
                self.send_error_response('Internal server error')
            return
        
        else:
            # 处理其他 POST 请求路径
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'Not Found')

            return # Add return after handling not found path


    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/api/call-records':
            try:
                # 获取查询参数
                query_params = dict(urllib.parse.parse_qsl(parsed_url.query))
                user_id = query_params.get('userId')
                number = query_params.get('number')
                page = int(query_params.get('page', 1))
                page_size = int(query_params.get('pageSize', 20))

                if not user_id:
                    self.send_error_response('Missing userId parameter')
                    return

                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)

                try:
                    # 构建基础查询
                    base_query = """
                        SELECT cr.*, 
                               CASE 
                                   WHEN c.name IS NOT NULL THEN c.name 
                                   ELSE cr.dialed_number 
                               END as display_name,
                               c.name as contact_name
                        FROM `la_call_records` cr
                        LEFT JOIN `la_contacts` c ON cr.dialed_number = c.phone
                        WHERE (cr.dialer_user_id = %s OR cr.backend_user_id = %s)
                        AND cr.display = 1
                    """
                    params = [user_id, user_id]

                    # 如果提供了号码，添加号码过滤条件
                    if number:
                        base_query += " AND cr.dialed_number = %s"
                        params.append(number)

                    # 添加排序
                    base_query += " ORDER BY cr.start_time DESC"

                    # 获取总记录数
                    count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as t"
                    cursor.execute(count_query, params)
                    total = cursor.fetchone()['total']

                    # 添加分页
                    base_query += " LIMIT %s OFFSET %s"
                    params.extend([page_size, (page - 1) * page_size])

                    # 执行查询
                    cursor.execute(base_query, params)
                    records = cursor.fetchall()

                    # 构建响应
                    response_data = {
                        'code': 0,
                        'msg': 'Success',
                        'data': {
                            'list': records,
                            'total': total,
                            'page': page,
                            'pageSize': page_size
                        }
                    }

                    self.send_response(HTTPStatus.OK)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))

                except mysql.connector.Error as err:
                    print(f"Database error: {err}")
                    self.send_error_response('Database error')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Error processing request: {e}")
                self.send_error_response('Internal server error')
                
        elif parsed_url.path == '/api/all-call-records':
            try:
                # 获取查询参数
                query_params = dict(urllib.parse.parse_qsl(parsed_url.query))
                user_id = query_params.get('userId')
                number = query_params.get('number')
                page = int(query_params.get('page', 1))
                page_size = int(query_params.get('pageSize', 20))

                if not user_id:
                    self.send_error_response('Missing userId parameter')
                    return

                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)

                try:
                    # 构建基础查询 - 移除 display 条件
                    base_query = """
                        SELECT cr.*, 
                               CASE 
                                   WHEN c.name IS NOT NULL THEN c.name 
                                   ELSE cr.dialed_number 
                               END as display_name,
                               c.name as contact_name,
                               cm.mark_type
                        FROM `la_call_records` cr
                        LEFT JOIN `la_contacts` c ON cr.dialed_number = c.phone
                        LEFT JOIN `la_call_mark` cm ON cr.dialed_number = cm.dialed_number
                        WHERE (cr.dialer_user_id = %s OR cr.backend_user_id = %s)
                    """
                    params = [user_id, user_id]

                    # 如果提供了号码，添加号码过滤条件
                    if number:
                        base_query += " AND cr.dialed_number = %s"
                        params.append(number)

                    # 添加排序
                    base_query += " ORDER BY cr.start_time DESC"

                    # 获取总记录数
                    count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as t"
                    cursor.execute(count_query, params)
                    total = cursor.fetchone()['total']

                    # 添加分页
                    base_query += " LIMIT %s OFFSET %s"
                    params.extend([page_size, (page - 1) * page_size])

                    # 执行查询
                    cursor.execute(base_query, params)
                    records = cursor.fetchall()

                    # 构建响应
                    response_data = {
                        'code': 0,
                        'msg': 'Success',
                        'data': {
                            'list': records,
                            'total': total,
                            'page': page,
                            'pageSize': page_size
                        }
                    }

                    self.send_response(HTTPStatus.OK)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))

                except mysql.connector.Error as err:
                    print(f"Database error: {err}")
                    self.send_error_response('Database error')
                finally:
                    cursor.close()
                    close_db_connection(conn)

            except Exception as e:
                print(f"Error processing request: {e}")
                self.send_error_response('Internal server error')
        
        elif parsed_url.path == '/api/call-status':
            # 解析查询参数
            query_params = urllib.parse.parse_qs(parsed_url.query)
            call_id = query_params.get('callId', [None])[0]
    
            if not call_id:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Missing callId parameter'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return
    
            # 如果不在 active_calls 中，从数据库查询
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor(dictionary=True)
                    # 直接查询通话记录，不限制状态
                    sql = "SELECT * FROM `la_call_records` WHERE `call_id` = %s LIMIT 1"
                    cursor.execute(sql, (call_id,))
                    call = cursor.fetchone()
                    status = call['status'] if call else 'ended'  # 如果找不到记录，返回 ended
                    cursor.close()
                except mysql.connector.Error as err:
                    print(f"Database error checking call status: {err}")
                    status = 'unknown'
                finally:
                    cursor.close()
                    close_db_connection(conn)
            else:
                status = 'unknown'
    
            self.send_response(HTTPStatus.OK)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response_data = {
                'code': 0,
                'msg': 'Success',
                'data': {
                    'status': status
                }
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

            return # Add return after /api/call-status processing
        
        elif parsed_url.path == '/api/marked-numbers':
            # 处理获取标记号码列表的请求
            query_params = urllib.parse.parse_qs(parsed_url.query)
            search_query = query_params.get('query', [None])[0] # 搜索关键字
            page = int(query_params.get('page', [1])[0]) # 当前页码，默认为1
            page_size = int(query_params.get('pageSize', [20])[0]) # 每页数量，默认为20

            offset = (page - 1) * page_size

            conn = get_db_connection()
            if not conn:
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Failed to connect to database'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            try:
                cursor = conn.cursor(dictionary=True)
                sql = "SELECT * FROM `la_call_mark`"
                params = []

                if search_query:
                    sql += " WHERE `dialed_number` LIKE %s"
                    params.append(f'%{search_query}%')

                sql += " ORDER BY `created_at` DESC LIMIT %s OFFSET %s"
                params.extend([page_size, offset])

                cursor.execute(sql, params)
                rows = cursor.fetchall()

                # 同时获取总数，用于分页 (可选，但更好)
                sql_count = "SELECT COUNT(*) FROM `la_call_mark`"
                if search_query:
                    sql_count += " WHERE `dialed_number` LIKE %s"
                    cursor.execute(sql_count, [f'%{search_query}%'])
                else:
                    cursor.execute(sql_count)
                total_count = cursor.fetchone()['COUNT(*)']


                self.send_response(HTTPStatus.OK)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS
                self.end_headers()

                response_data = {'code': 0, 'msg': 'Success', 'data': {'list': rows, 'total': total_count, 'page': page, 'pageSize': page_size}}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))

            except mysql.connector.Error as err:
                print(f"Error fetching marked numbers: {err}")
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Failed to fetch marked numbers', 'error': str(err)}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            finally:
                cursor.close()
                close_db_connection(conn)

            return # Add return after /api/marked-numbers processing

        elif parsed_url.path == '/api/ringtone-status':
            # 获取请求参数中的用户ID
            query_params = dict(urllib.parse.parse_qsl(parsed_url.query))
            user_id = query_params.get('userId')
            
            if not user_id:
                self.send_error_response('Missing user ID')
                return
            
            # 返回铃声状态
            self.send_response(HTTPStatus.OK)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response_data = {
                'code': 0,
                'msg': 'Success',
                'data': {
                    'isPlaying': ringtone_status['isPlaying'],
                    'lastUpdateTime': ringtone_status['lastUpdateTime'],
                    'userId': ringtone_status['userId']
                }
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

            return # Add return after /api/ringtone-status processing
            
        elif parsed_url.path == '/api/check-incoming-calls':
            # 处理检查来电的请求
            query_params = urllib.parse.parse_qs(parsed_url.query)
            user_id_str = query_params.get('userId', [None])[0]

            if not user_id_str:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Missing userId parameter'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            try:
                target_user_id = int(user_id_str)
            except ValueError:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Invalid userId format'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            print(f"Checking incoming calls for user_id: {target_user_id}")

            conn = get_db_connection()
            if not conn:
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Database connection failed'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            try:
                cursor = conn.cursor(dictionary=True)
                # 查询指定用户的、状态为 'ringing' 的最近一条呼叫记录
                sql = """
                    SELECT cr.*, lm.mark_type
                    FROM `la_call_records` cr
                    LEFT JOIN `la_call_mark` lm ON cr.dialed_number = lm.dialed_number
                    WHERE cr.backend_user_id = %s AND cr.status = 'ringing'
                    ORDER BY cr.start_time DESC
                    LIMIT 1
                """
                cursor.execute(sql, (target_user_id,))
                incoming_call = cursor.fetchone()
                print(f"Incoming call check result for user {target_user_id}: {incoming_call}")

                self.send_response(HTTPStatus.OK)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                if incoming_call:
                    response_data = {
                        'code': 0,
                        'msg': 'Success',
                        'data': {
                            'callId': incoming_call['call_id'],
                            'number': incoming_call['dialed_number'],
                            'dialerUserId': incoming_call['dialer_user_id'],
                            'location': incoming_call['location'], # 返回归属地信息
                            'mark_type': incoming_call.get('mark_type'), # 返回标记类型
                            'status': incoming_call['status'], # 返回状态，应该是 'ringing'
                            'call_type': incoming_call['call_type']
                        }
                    }
                else:
                    # 没有找到来电，返回空数据
                    response_data = {'code': 0, 'msg': 'No incoming calls', 'data': None}

                self.wfile.write(json.dumps(response_data).encode('utf-8'))

            except mysql.connector.Error as err:
                print(f"Database error checking incoming calls: {err}")
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Failed to check incoming calls', 'error': str(err)}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            finally:
                if 'cursor' in locals():
                    cursor.close()
                close_db_connection(conn)
            return
        
        elif parsed_url.path == '/api/phone-location':
            # 解析查询参数
            query_params = urllib.parse.parse_qs(parsed_url.query)
            phone = query_params.get('phone', [None])[0]

            if not phone:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Missing phone parameter'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            # 验证手机号格式
            if not re.match(r'^1[3-9]\d{9}$', phone):
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Invalid phone number format'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            try:
                # 调用阿里云API查询归属地
                url = f'https://jisusjhmcx.market.alicloudapi.com/shouji/query?shouji={phone}'
                headers = {
                    'Authorization': 'APPCODE 2d27d29e43df4960a21ae35440eea039'
                }
                response = requests.get(url, headers=headers)
                data = response.json()

                if response.status_code == 200 and data.get('status') == 0:
                    result = data.get('result', {})
                    response_data = {
                        'code': 0,
                        'msg': 'Success',
                        'data': {
                            'province': result.get('province', ''),
                            'city': result.get('city', ''),
                            'company': result.get('company', '')
                        }
                    }
                else:
                    response_data = {
                        'code': 1,
                        'msg': 'Failed to get location info',
                        'data': None
                    }

                self.send_response(HTTPStatus.OK)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))

            except Exception as e:
                print(f"Error querying phone location: {e}")
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': f'Internal server error: {str(e)}'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
        
        # 获取会话列表
        elif parsed_url.path == '/api/conversations':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            user_id = query_params.get('userId', [None])[0]
            
            if not user_id:
                self.send_error_response('Missing userId parameter')
                return

            conn = get_db_connection()
            if not conn:
                self.send_error_response('Database connection failed')
                return

            try:
                cursor = conn.cursor(dictionary=True)
                # 获取会话列表，同时关联联系人表获取显示名称
                sql = """
                    SELECT c.*, 
                           CASE 
                               WHEN ct.name IS NOT NULL THEN ct.name 
                               ELSE c.phone 
                           END as display_name
                    FROM `la_conversations` c
                    LEFT JOIN `la_contacts` ct ON c.phone = ct.phone
                    WHERE c.user_id = %s
                    ORDER BY c.last_message_time DESC
                """
                print("Executing SQL for /api/conversations:", sql)
                print("With parameters:", (user_id,))
                
                start_time = time.time()
                cursor.execute(sql, (user_id,))
                conversations = cursor.fetchall()
                end_time = time.time()
                print(f"Query for /api/conversations took {end_time - start_time:.4f} seconds.")
                
                self.send_success_response(conversations)
                
            except mysql.connector.Error as err:
                print(f"Database error fetching conversations: {err}")
                self.send_error_response('Failed to fetch conversations')
            finally:
                cursor.close()
                close_db_connection(conn)

            return # Add return after /api/conversations processing

        # 获取聊天记录
        elif parsed_url.path == '/api/messages':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            user_id = query_params.get('userId', [None])[0]
            phone = query_params.get('phone', [None])[0]
            page = int(query_params.get('page', [1])[0])
            page_size = int(query_params.get('pageSize', [20])[0])
            
            if not user_id or not phone:
                self.send_error_response('Missing userId or phone parameter')
                return

            conn = get_db_connection()
            if not conn:
                self.send_error_response('Database connection failed')
                return

            try:
                cursor = conn.cursor(dictionary=True)
                offset = (page - 1) * page_size
                
                # 获取聊天记录
                sql = """
                    SELECT *, ismy FROM `la_messages` # Select ismy directly from DB
                    WHERE (sender_id = %s AND receiver_phone = %s)
                       OR (sender_id = %s AND receiver_phone = %s)
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(sql, (user_id, phone, phone, user_id, page_size, offset))
                messages = cursor.fetchall()
                
                # 获取总数
                count_sql = """
                    SELECT COUNT(*) as total FROM `la_messages`
                    WHERE (sender_id = %s AND receiver_phone = %s)
                       OR (sender_id = %s AND receiver_phone = %s)
                """
                cursor.execute(count_sql, (user_id, phone, phone, user_id))
                total = cursor.fetchone()['total']
                
                # 将消息标记为已读
                update_sql = """
                    UPDATE `la_messages`
                    SET status = 'read', updated_at = %s
                    WHERE sender_id = %s AND receiver_phone = %s AND status != 'read'
                """
                current_time = int(time.time())
                cursor.execute(update_sql, (current_time, phone, user_id))
                
                # 更新会话的未读消息数
                update_conversation_sql = """
                    UPDATE `la_conversations`
                    SET unread_count = 0, updated_at = %s
                    WHERE user_id = %s AND phone = %s
                """
                cursor.execute(update_conversation_sql, (current_time, user_id, phone))
                
                conn.commit()
                
                self.send_success_response({
                    'list': messages,
                    'total': total,
                    'page': page,
                    'pageSize': page_size
                })
                
            except mysql.connector.Error as err:
                print(f"Database error fetching messages: {err}")
                conn.rollback()
                self.send_error_response('Failed to fetch messages')
            finally:
                cursor.close()
                close_db_connection(conn)
        
        else:
            # 处理其他 GET 请求路径 (如果存在)
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/api/call-records':
            # 解析查询参数
            query_params = urllib.parse.parse_qs(parsed_url.query)
            call_id = query_params.get('callId', [None])[0]

            if not call_id:
                self.send_response(HTTPStatus.BAD_REQUEST)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Missing callId parameter'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            conn = get_db_connection()
            if not conn:
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Database connection failed'}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return

            try:
                cursor = conn.cursor()
                # 删除通话记录
                sql = "DELETE FROM `la_call_records` WHERE `call_id` = %s"
                cursor.execute(sql, (call_id,))
                conn.commit()

                if cursor.rowcount > 0:
                    # 删除成功
                    self.send_response(HTTPStatus.OK)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 0, 'msg': 'Call record deleted successfully'}
                else:
                    # 记录不存在
                    self.send_response(HTTPStatus.NOT_FOUND)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    response_data = {'code': 1, 'msg': 'Call record not found'}

                self.wfile.write(json.dumps(response_data).encode('utf-8'))

            except mysql.connector.Error as err:
                print(f"Database error deleting call record: {err}")
                conn.rollback()
                self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = {'code': 1, 'msg': 'Failed to delete call record', 'error': str(err)}
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            finally:
                cursor.close()
                close_db_connection(conn)
        
        else:
            # 处理其他 DELETE 请求路径
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'Not Found')

# --- 启动服务器 ---
async def main():
    # 启动 WebSocket 服务器 (保持在 9096 端口)
    websocket_port = 9096
    try:
        ws_server = await websockets.serve(websocket_handler, "0.0.0.0", websocket_port)
        print(f"WebSocket server started on port {websocket_port}")
    except Exception as ws_err:
        print(f"Failed to start WebSocket server on port {websocket_port}: {ws_err}")
        return  # 如果WebSocket服务器启动失败，直接退出

    # 启动 HTTP 服务器
    http_port = 9097
    try:
        # 创建自定义的HTTP服务器类
        class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
            daemon_threads = True  # 使用守护线程
            allow_reuse_address = True  # 允许地址重用
            request_queue_size = 100  # 设置请求队列大小
            
        # 使用自定义的HTTP服务器类
        httpd = ThreadedHTTPServer(("0.0.0.0", http_port), CallRecordsHTTPHandler)
        print(f"HTTP server listening on port {http_port}")
        
        # 在单独的线程中运行HTTP服务器
        http_thread = threading.Thread(target=httpd.serve_forever)
        http_thread.daemon = True
        http_thread.start()
        
        # 设置服务器关闭超时
        httpd.timeout = 30
        
    except Exception as http_err:
        print(f"Failed to start HTTP server on port {http_port}: {http_err}")
        return  # 如果HTTP服务器启动失败，直接退出

    try:
        # 保持WebSocket服务器运行
        await ws_server.wait_closed()
    except KeyboardInterrupt:
        print("Shutting down servers...")
        httpd.shutdown()  # 优雅地关闭HTTP服务器
        httpd.server_close()
    except Exception as e:
        print(f"Error in server main loop: {e}")
    finally:
        print("Servers stopped.")

# ===> 在 __main__ 中运行 asyncio 的主函数 <===
if __name__ == "__main__":
    # 确保在Windows上 asyncio 的事件循环策略兼容 http.server 的线程
    # 尽管如此，同步的 http.server 和 asyncio 混合使用需要小心，
    # 更好的方案是使用像 aiohttp 这样的异步框架来同时处理 HTTP 和 WebSocket
    # 或者使用单独的进程/服务来运行 HTTP 和 WebSocket 服务器
    try:
        # 在 Windows 上，默认的事件循环策略可能不支持子线程中的 asyncio.run
        # 可以尝试设置不同的策略，但这里我们只是简单运行 main()
        # 假设在兼容的环境下运行
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped manually.")
    except Exception as main_err:
         print(f"An error occurred in main execution: {main_err}")