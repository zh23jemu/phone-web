import mysql.connector
import time

def get_db_connection():
    """获取数据库连接"""
    return mysql.connector.connect(
        host="localhost",
        user="phone",
        password="phone2025",
        database="phone"
    )

def insert_bank_contacts(user_id):
    """插入银行和客服电话到联系人数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 银行和客服电话列表
    bank_contacts = [
        ("工商银行", "95588"),
        ("建设银行", "95533"),
        ("农业银行", "95599"),
        ("中国银行", "95566"),
        ("交通银行", "95559"),
        ("招商银行", "95555"),
        ("浦发银行", "95528"),
        ("兴业银行", "95561"),
        ("民生银行", "95568"),
        ("光大银行", "95595"),
        ("广发银行", "95508"),
        ("华夏银行", "95577"),
        ("中信银行", "95558"),
        ("平安银行", "95511"),
        ("浙商银行", "95527"),
        ("邮政银行", "95580"),
        ("北京银行", "95526"),
        ("南京银行", "95302"),
        ("花旗银行", "95038"),
        ("宁波银行", "95574"),
        ("杭州银行", "95398"),
        ("上海银行", "95594"),
        ("郑州银行", "95097"),
        ("渤海银行", "95541"),
        ("汇丰银行", "95366"),
        ("中原银行", "95186"),
        ("恒丰银行", "95395"),
        ("蒙商银行", "95352"),
        ("东亚银行", "95382"),
        ("盛京银行", "95337"),
        ("江苏银行", "95319"),
        ("天津银行", "956056"),
        ("温州银行", "962699"),
        ("兰州银行", "96799"),
        ("河北银行", "96368"),
        ("西安银行", "96779"),
        ("台州银行", "95371"),
        ("中国广电", "10099"),
        ("中国移动", "1008611"),
        ("东风日产", "95027"),
        ("京东热线", "95118"),
        ("支付宝客服热线", "95188"),
        ("114查号台", "114"),
        ("国家反诈中心", "96110"),
        ("中国联通", "10010"),
        ("中国移动", "10086"),
        ("中国电信", "10000")
    ]
    
    try:
        # 准备SQL语句
        sql = "INSERT INTO la_contacts (user_id, name, phone, created_at, updated_at) VALUES (%s, %s, %s, %s, %s)"
        current_time = int(time.time())
        
        # 插入每个联系人
        for name, phone in bank_contacts:
            try:
                cursor.execute(sql, (user_id, name, phone, current_time, current_time))
                print(f"Inserted contact: {name} - {phone}")
            except mysql.connector.Error as err:
                print(f"Error inserting {name} - {phone}: {err}")
                continue
        
        conn.commit()
        print("All bank contacts inserted successfully!")
        return True
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # 使用默认用户ID 6
    insert_bank_contacts(6) 