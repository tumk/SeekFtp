# SeekFtp 插件使用指南

## 功能特性
- FTP/SFTP 连接管理
- 文件上传/下载
- 文件比较
- 远程文件浏览

## 配置说明

### 1. 添加 FTP 连接
1. 打开命令面板 (Ctrl+Shift+P)
2. 输入 "SeekFtp: 添加连接"
3. 填写以下信息：
   - 名称：连接名称
   - 类型：FTP 或 SFTP
   - 主机：服务器地址
   - 端口：FTP(21) 或 SFTP(22)
   - 用户名
   - 密码
   - 本地路径：项目本地路径
   - 部署路径：服务器上的目标路径

### 2. 使用方法

#### 文件上传
1. 在 VS Code 左侧 FTP 资源管理器中选择已配置的连接
2. 右键点击要上传的文件/文件夹
3. 选择 "上传到服务器"

#### 文件下载
1. 在 FTP 资源管理器中展开远程连接
2. 右键点击远程文件
3. 选择 "下载到本地"

#### 文件比较
1. 在 FTP 资源管理器中选择远程文件
2. 右键选择 "与本地文件比较"
3. 系统会打开对比视图，显示本地和远程文件的差异

## 快捷键
- 刷新连接：F5
- 断开连接：右键菜单 "断开连接"
- 重新连接：右键菜单 "连接"

## 注意事项
1. 首次使用需要先配置连接信息
2. 建议在上传前先进行文件比较
3. SFTP 连接支持密码和密钥认证
4. 确保有正确的文件读写权限

## 常见问题
1. 连接失败
   - 检查网络连接
   - 验证服务器地址和端口
   - 确认用户名密码正确

2. 上传/下载失败
   - 检查文件权限
   - 确认路径配置正确
   - 验证磁盘空间充足
