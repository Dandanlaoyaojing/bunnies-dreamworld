// server-api/nodejs-server.js
// 基于Node.js + Express的阿里云服务器API
// 部署到你的阿里云服务器上

const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 数据库配置 - 替换为你的阿里云数据库配置
const dbConfig = {
  host: 'your-aliyun-db-host',
  user: 'your-username',
  password: 'your-password',
  database: 'notes_app',
  charset: 'utf8mb4'
};

// 创建数据库连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT密钥 - 生产环境请使用环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|mp4|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        email VARCHAR(100),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建笔记表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        note_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255),
        content LONGTEXT,
        category VARCHAR(50),
        tags JSON,
        images JSON,
        voices JSON,
        category_tag VARCHAR(100),
        source VARCHAR(255),
        word_count INT DEFAULT 0,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_note_id (note_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建文件表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_id VARCHAR(100) UNIQUE NOT NULL,
        original_name VARCHAR(255),
        file_name VARCHAR(255),
        file_path VARCHAR(500),
        file_size BIGINT,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_file_id (file_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

// JWT中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '缺少认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效的认证令牌' });
    }
    req.user = user;
    next();
  });
}

// 健康检查接口
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 用户注册
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 检查用户是否已存在
    const connection = await pool.getConnection();
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      connection.release();
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const [result] = await connection.execute(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      [username, passwordHash, email || null]
    );

    connection.release();

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: result.insertId, username: username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: '注册成功',
      data: {
        userId: result.insertId,
        username: username,
        token: token
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 用户登录
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        token: token
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取用户笔记
app.get('/api/v1/notes', authenticateToken, async (req, res) => {
  try {
    const { lastSyncTime } = req.query;
    const userId = req.user.userId;

    const connection = await pool.getConnection();
    
    let query = `
      SELECT * FROM notes 
      WHERE user_id = ? AND is_deleted = FALSE
    `;
    let params = [userId];

    if (lastSyncTime) {
      query += ' AND updated_at > ?';
      params.push(lastSyncTime);
    }

    query += ' ORDER BY updated_at DESC';

    const [notes] = await connection.execute(query, params);
    connection.release();

    // 格式化笔记数据
    const formattedNotes = notes.map(note => ({
      id: note.note_id,
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags ? JSON.parse(note.tags) : [],
      images: note.images ? JSON.parse(note.images) : [],
      voices: note.voices ? JSON.parse(note.voices) : [],
      categoryTag: note.category_tag,
      source: note.source,
      wordCount: note.word_count,
      createTime: note.created_at,
      updateTime: note.updated_at,
      serverId: note.id
    }));

    res.json({
      success: true,
      data: {
        notes: formattedNotes,
        lastSyncTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取笔记失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 创建笔记
app.post('/api/v1/notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      id: noteId,
      title,
      content,
      category,
      tags,
      images,
      voices,
      categoryTag,
      source,
      wordCount,
      createTime,
      updateTime
    } = req.body;

    if (!noteId || (!title && !content)) {
      return res.status(400).json({
        success: false,
        message: '笔记ID和内容不能为空'
      });
    }

    const connection = await pool.getConnection();

    // 检查笔记是否已存在
    const [existingNote] = await connection.execute(
      'SELECT id FROM notes WHERE note_id = ? AND user_id = ?',
      [noteId, userId]
    );

    if (existingNote.length > 0) {
      connection.release();
      return res.status(409).json({
        success: false,
        message: '笔记已存在'
      });
    }

    // 插入新笔记
    const [result] = await connection.execute(`
      INSERT INTO notes (
        user_id, note_id, title, content, category, tags, images, voices,
        category_tag, source, word_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, noteId, title, content, category,
      JSON.stringify(tags || []),
      JSON.stringify(images || []),
      JSON.stringify(voices || []),
      categoryTag, source, wordCount || 0,
      createTime || new Date(),
      updateTime || new Date()
    ]);

    connection.release();

    res.json({
      success: true,
      message: '笔记创建成功',
      data: {
        noteId: result.insertId,
        note: {
          id: noteId,
          title,
          content,
          category,
          tags: tags || [],
          images: images || [],
          voices: voices || [],
          categoryTag,
          source,
          wordCount: wordCount || 0,
          createTime: createTime || new Date(),
          updateTime: updateTime || new Date()
        }
      }
    });
  } catch (error) {
    console.error('创建笔记失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新笔记
app.put('/api/v1/notes/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = req.params.id;
    const {
      title,
      content,
      category,
      tags,
      images,
      voices,
      categoryTag,
      source,
      wordCount
    } = req.body;

    const connection = await pool.getConnection();

    // 检查笔记是否存在且属于当前用户
    const [existingNote] = await connection.execute(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? AND is_deleted = FALSE',
      [noteId, userId]
    );

    if (existingNote.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 更新笔记
    const [result] = await connection.execute(`
      UPDATE notes SET 
        title = ?, content = ?, category = ?, tags = ?, images = ?, voices = ?,
        category_tag = ?, source = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [
      title, content, category,
      JSON.stringify(tags || []),
      JSON.stringify(images || []),
      JSON.stringify(voices || []),
      categoryTag, source, wordCount || 0,
      noteId, userId
    ]);

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    res.json({
      success: true,
      message: '笔记更新成功',
      data: {
        noteId: noteId,
        note: {
          id: req.body.id,
          title,
          content,
          category,
          tags: tags || [],
          images: images || [],
          voices: voices || [],
          categoryTag,
          source,
          wordCount: wordCount || 0,
          updateTime: new Date()
        }
      }
    });
  } catch (error) {
    console.error('更新笔记失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 删除笔记
app.delete('/api/v1/notes/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = req.params.id;

    const connection = await pool.getConnection();

    // 软删除笔记
    const [result] = await connection.execute(
      'UPDATE notes SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    res.json({
      success: true,
      message: '笔记删除成功',
      data: {
        noteId: noteId
      }
    });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 文件上传
app.post('/api/v1/files', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const userId = req.user.userId;
    const { fileName } = req.body;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const connection = await pool.getConnection();

    // 保存文件信息到数据库
    const [result] = await connection.execute(`
      INSERT INTO files (user_id, file_id, original_name, file_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      fileId,
      req.file.originalname,
      fileName || req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype
    ]);

    connection.release();

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/notes/${req.file.filename}`;

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        fileId: fileId,
        fileName: fileName || req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 文件下载
app.get('/api/v1/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const fileId = req.params.fileId;

    const connection = await pool.getConnection();
    const [files] = await connection.execute(
      'SELECT * FROM files WHERE file_id = ? AND user_id = ?',
      [fileId, userId]
    );
    connection.release();

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const file = files[0];
    
    // 检查文件是否存在
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 设置响应头
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);

    // 发送文件
    res.sendFile(file.file_path);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取用户统计信息
app.get('/api/v1/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const connection = await pool.getConnection();

    // 获取笔记统计
    const [noteStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_notes,
        SUM(word_count) as total_words,
        COUNT(DISTINCT category) as total_categories
      FROM notes 
      WHERE user_id = ? AND is_deleted = FALSE
    `, [userId]);

    // 获取分类统计
    const [categoryStats] = await connection.execute(`
      SELECT category, COUNT(*) as count
      FROM notes 
      WHERE user_id = ? AND is_deleted = FALSE AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `, [userId]);

    // 获取文件统计
    const [fileStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size
      FROM files 
      WHERE user_id = ?
    `, [userId]);

    connection.release();

    res.json({
      success: true,
      data: {
        notes: noteStats[0],
        categories: categoryStats,
        files: fileStats[0]
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制'
      });
    }
  }
  
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 服务器启动成功，端口: ${PORT}`);
      console.log(`📱 API地址: http://localhost:${PORT}/api/v1`);
      console.log(`💾 健康检查: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🔄 正在关闭服务器...');
  pool.end(() => {
    console.log('✅ 数据库连接池已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 正在关闭服务器...');
  pool.end(() => {
    console.log('✅ 数据库连接池已关闭');
    process.exit(0);
  });
});

startServer();

module.exports = app;
