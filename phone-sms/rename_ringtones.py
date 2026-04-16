import os

# 目标文件夹路径（根据你的实际路径修改）
dir_path = os.path.join(os.path.dirname(__file__), 'static', 'test')

# 获取所有文件，按名称排序（可根据需要调整排序规则）
files = sorted([f for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))])

# 起始序号
start_num = 21

for idx, filename in enumerate(files):
    ext = os.path.splitext(filename)[1]  # 保留原扩展名
    new_name = f"ringtone{start_num + idx}{ext}"
    src = os.path.join(dir_path, filename)
    dst = os.path.join(dir_path, new_name)
    print(f"重命名: {filename} -> {new_name}")
    os.rename(src, dst)

print("批量重命名完成！") 