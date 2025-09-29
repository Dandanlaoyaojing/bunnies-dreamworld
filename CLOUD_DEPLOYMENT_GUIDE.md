# ☁️ 阿里云云存储部署指南

## 📋 部署概览

基于你的阿里云服务器和域名，我已经为你设计了一个完整的云存储解决方案，可以突破微信小程序10MB本地存储限制。

## 🏗️ 系统架构

```
微信小程序 ←→ 阿里云服务器 ←→ MySQL数据库
    ↓              ↓              ↓
本地存储         API接口        云端数据
10MB限制        无限存储        永久保存
```

## 📁 文件结构

```
project/
├── utils/
│   └── aliyunService.js          # 阿里云云存储服务
├── server-api/
│   ├── nodejs-server.js          # Node.js API服务器
│   ├── package.json              # 依赖配置
│   ├── ecosystem.config.js       # PM2配置
│   ├── deploy.sh                 # 部署脚本
│   └── env-example.txt           # 环境变量示例
└── CLOUD_DEPLOYMENT_GUIDE.md     # 本部署指南
```

## 🚀 部署步骤

### 1. 准备阿里云服务器

**服务器要求：**
- ✅ 阿里云ECS实例
- ✅ 已配置域名和SSL证书
- ✅ 开放3000端口（或你选择的端口）
- ✅ 安装Node.js 16+ 和 npm

**检查服务器环境：**
```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查端口是否开放
netstat -tlnp | grep :3000
```

### 2. 配置MySQL数据库

**创建数据库：**
```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE notes_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER 'notes_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON notes_app.* TO 'notes_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 上传服务器代码

**上传文件到服务器：**
```bash
# 使用SCP上传（替换为你的服务器信息）
scp -r server-api/ root@your-domain.com:/opt/notes-app/

# 或者使用SFTP
sftp root@your-domain.com
put -r server-api/ /opt/notes-app/
```

### 4. 配置环境变量

**创建配置文件：**
```bash
# 在服务器上执行
cd /opt/notes-app/
cp env-example.txt .env
nano .env
```

**编辑.env文件：**
```env
# 服务器配置
NODE_ENV=production
PORT=3000

# JWT密钥（请使用强密码）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 数据库配置
DB_HOST=localhost
DB_USER=notes_user
DB_PASSWORD=your_password
DB_NAME=notes_app

# 域名配置
DOMAIN=your-domain.com
PROTOCOL=https
```

### 5. 安装依赖和启动服务

**执行部署脚本：**
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

**手动部署（如果脚本失败）：**
```bash
# 安装依赖
npm install

# 安装PM2
npm install -g pm2

# 创建必要目录
mkdir -p logs uploads/notes uploads/avatars

# 启动服务
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 6. 配置Nginx反向代理

**安装Nginx（如果未安装）：**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

**配置Nginx：**
```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/notes-app
```

**Nginx配置内容：**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;
    
    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态文件服务
    location /uploads/ {
        alias /opt/notes-app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/api/v1/health;
    }
}
```

**启用配置：**
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/notes-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 7. 配置小程序

**更新小程序配置：**
```javascript
// 在 utils/aliyunService.js 中更新服务器地址
setServerUrl('https://your-domain.com')  // 替换为你的域名
```

## 🔧 服务管理

### PM2 命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs notes-app

# 重启服务
pm2 restart notes-app

# 停止服务
pm2 stop notes-app

# 删除服务
pm2 delete notes-app

# 监控
pm2 monit
```

### 数据库管理

```bash
# 备份数据库
mysqldump -u notes_user -p notes_app > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u notes_user -p notes_app < backup_20240101.sql

# 查看数据库大小
mysql -u notes_user -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables GROUP BY table_schema;"
```

## 📊 监控和维护

### 1. 服务器监控

**系统资源监控：**
```bash
# CPU使用率
top

# 内存使用率
free -h

# 磁盘使用率
df -h

# 网络连接
netstat -tulpn
```

### 2. 应用监控

**日志监控：**
```bash
# 实时查看日志
pm2 logs notes-app --lines 100

# 查看错误日志
tail -f logs/err.log

# 查看访问日志
tail -f logs/out.log
```

### 3. 性能优化

**数据库优化：**
```sql
-- 添加索引
ALTER TABLE notes ADD INDEX idx_user_updated (user_id, updated_at);
ALTER TABLE notes ADD INDEX idx_category (category);
ALTER TABLE files ADD INDEX idx_user_created (user_id, created_at);

-- 分析表
ANALYZE TABLE notes;
ANALYZE TABLE files;
```

**服务器优化：**
```bash
# 增加文件描述符限制
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
sysctl -p
```

## 🔒 安全配置

### 1. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # 禁止直接访问Node.js端口
sudo ufw enable
```

### 2. SSL证书配置

```bash
# 使用Let's Encrypt免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 数据库安全

```sql
-- 删除默认用户
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 设置强密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your-strong-password';

-- 刷新权限
FLUSH PRIVILEGES;
```

## 🧪 测试验证

### 1. API测试

```bash
# 健康检查
curl https://your-domain.com/api/v1/health

# 测试注册
curl -X POST https://your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# 测试登录
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 2. 小程序测试

1. 在小程序中进入"我的" → "账户"
2. 点击"测试云连接"按钮
3. 查看连接状态和错误信息
4. 如果连接成功，点击"启用云同步"

## 🚨 故障排除

### 常见问题

**1. 服务器无法启动**
```bash
# 检查端口占用
lsof -i :3000

# 检查日志
pm2 logs notes-app

# 检查环境变量
cat .env
```

**2. 数据库连接失败**
```bash
# 测试数据库连接
mysql -u notes_user -p -h localhost notes_app

# 检查MySQL状态
sudo systemctl status mysql
```

**3. Nginx配置错误**
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

**4. SSL证书问题**
```bash
# 检查证书
openssl x509 -in /path/to/cert.pem -text -noout

# 测试HTTPS
curl -I https://your-domain.com/api/v1/health
```

## 📈 扩展计划

### 1. 负载均衡

```nginx
# 多服务器配置
upstream notes_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### 2. 缓存优化

```javascript
// Redis缓存配置
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});
```

### 3. 文件存储优化

```bash
# 使用阿里云OSS
npm install ali-oss

# 配置OSS上传
const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: 'your-access-key',
  accessKeySecret: 'your-secret-key',
  bucket: 'your-bucket-name'
});
```

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 检查服务器日志：`pm2 logs notes-app`
2. 验证网络连接：`curl https://your-domain.com/api/v1/health`
3. 检查数据库状态：`mysql -u notes_user -p notes_app`
4. 查看Nginx日志：`sudo tail -f /var/log/nginx/error.log`

## 🎉 部署完成

部署完成后，你的笔记应用将具备：

- ✅ 无限存储空间（突破10MB限制）
- ✅ 自动云同步备份
- ✅ 多设备数据同步
- ✅ 数据安全加密存储
- ✅ 高可用性服务架构

现在可以享受无限制的笔记存储体验了！
