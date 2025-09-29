#!/bin/bash
# 阿里云服务器部署脚本

echo "🚀 开始部署笔记应用服务器..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p uploads/notes
mkdir -p uploads/avatars

# 安装依赖
echo "📦 安装依赖包..."
npm install

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，请根据 env-example.txt 创建 .env 文件"
    echo "📝 复制示例配置文件..."
    cp env-example.txt .env
    echo "✅ 请编辑 .env 文件并填入正确的配置信息"
    exit 1
fi

# 设置文件权限
echo "🔐 设置文件权限..."
chmod 755 nodejs-server.js
chmod 755 ecosystem.config.js
chmod 755 deploy.sh

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 启动服务
echo "🎯 启动服务..."
pm2 start ecosystem.config.js

# 设置开机自启
echo "🔄 设置开机自启..."
pm2 startup
pm2 save

# 显示服务状态
echo "📊 服务状态:"
pm2 status

echo "✅ 部署完成！"
echo "🌐 服务地址: http://your-domain.com:3000"
echo "💊 健康检查: http://your-domain.com:3000/api/v1/health"
echo "📋 查看日志: pm2 logs notes-app"
echo "🔄 重启服务: pm2 restart notes-app"
echo "⏹️  停止服务: pm2 stop notes-app"
