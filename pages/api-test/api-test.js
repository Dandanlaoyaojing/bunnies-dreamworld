// pages/api-test/api-test.js
// API连接测试页面

const apiService = require('../../utils/apiService.js')

Page({
  data: {
    testResults: [],
    isTesting: false,
    serverStatus: 'unknown'
  },

  onLoad() {
    this.addLog('📱 API测试页面已加载')
    this.addLog('🌐 后端地址: http://localhost:3000/api/v1')
  },

  // 添加日志
  addLog(message) {
    const time = new Date().toLocaleTimeString()
    const log = `[${time}] ${message}`
    console.log(log)
    
    this.setData({
      testResults: [...this.data.testResults, log]
    })
  },

  // 测试1：健康检查
  async testHealth() {
    this.addLog('🔄 测试1: 健康检查...')
    
    try {
      const result = await apiService.healthCheck()
      this.addLog('✅ 健康检查成功')
      this.addLog(`   状态: ${result.data.status}`)
      this.addLog(`   版本: ${result.data.version}`)
      this.setData({ serverStatus: 'online' })
      
      wx.showToast({
        title: '后端连接正常',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 健康检查失败: ${err.message}`)
      this.setData({ serverStatus: 'offline' })
      
      wx.showToast({
        title: '连接失败',
        icon: 'error'
      })
    }
  },

  // 测试2：用户注册
  async testRegister() {
    this.addLog('🔄 测试2: 用户注册...')
    
    // 生成符合格式的用户名（4-20位字母数字下划线）
    const timestamp = Date.now().toString().slice(-8)  // 取最后8位
    const username = `test${timestamp}`  // 格式：test12345678
    const password = '123456'
    const nickname = '测试用户'
    
    try {
      const result = await apiService.register(username, password, nickname)
      this.addLog('✅ 注册成功')
      this.addLog(`   用户名: ${result.data.user.username}`)
      this.addLog(`   昵称: ${result.data.user.nickname}`)
      this.addLog(`   Token: ${result.data.token.substring(0, 20)}...`)
      
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 注册失败: ${err.message}`)
      
      wx.showToast({
        title: '注册失败',
        icon: 'error'
      })
    }
  },

  // 测试3：用户登录
  async testLogin() {
    this.addLog('🔄 测试3: 用户登录...')
    
    const username = 'testuser'
    const password = '123456'
    
    try {
      const result = await apiService.login(username, password)
      this.addLog('✅ 登录成功')
      this.addLog(`   用户ID: ${result.data.user.id}`)
      this.addLog(`   用户名: ${result.data.user.username}`)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 登录失败: ${err.message}`)
      this.addLog(`   提示: 请先注册用户 testuser`)
      
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
    }
  },

  // 测试4：创建笔记
  async testCreateNote() {
    this.addLog('🔄 测试4: 创建笔记...')
    
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.token) {
      this.addLog('❌ 请先登录')
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      const noteData = {
        title: `测试笔记 ${Date.now()}`,
        content: '这是一条测试笔记的内容',
        category: 'knowledge',
        tags: ['测试', 'API']
      }
      
      const result = await apiService.createNote(noteData)
      this.addLog('✅ 笔记创建成功')
      this.addLog(`   笔记ID: ${result.data.id}`)
      
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 创建笔记失败: ${err.message}`)
      
      wx.showToast({
        title: '创建失败',
        icon: 'error'
      })
    }
  },

  // 测试5：获取笔记列表
  async testGetNotes() {
    this.addLog('🔄 测试5: 获取笔记列表...')
    
    try {
      const result = await apiService.getNotes({ page: 1, limit: 10 })
      this.addLog('✅ 获取笔记列表成功')
      this.addLog(`   笔记数量: ${result.data.notes.length}`)
      this.addLog(`   总数: ${result.data.pagination.total}`)
      
      wx.showToast({
        title: '获取成功',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 获取笔记列表失败: ${err.message}`)
      
      wx.showToast({
        title: '获取失败',
        icon: 'error'
      })
    }
  },

  // 测试6：获取统计信息
  async testGetStats() {
    this.addLog('🔄 测试6: 获取统计信息...')
    
    try {
      const result = await apiService.getUserStats()
      this.addLog('✅ 获取统计信息成功')
      this.addLog(`   笔记数: ${result.data.noteCount}`)
      this.addLog(`   总字数: ${result.data.totalWords}`)
      this.addLog(`   收藏数: ${result.data.favoriteCount}`)
      
      wx.showToast({
        title: '获取成功',
        icon: 'success'
      })
    } catch (err) {
      this.addLog(`❌ 获取统计信息失败: ${err.message}`)
      
      wx.showToast({
        title: '获取失败',
        icon: 'error'
      })
    }
  },

  // 运行所有测试
  async runAllTests() {
    this.setData({ testResults: [], isTesting: true })
    
    this.addLog('🚀 开始运行所有测试...')
    this.addLog('='.repeat(40))
    
    await this.testHealth()
    await this.delay(500)
    
    await this.testRegister()
    await this.delay(500)
    
    await this.testLogin()
    await this.delay(500)
    
    await this.testCreateNote()
    await this.delay(500)
    
    await this.testGetNotes()
    await this.delay(500)
    
    await this.testGetStats()
    
    this.addLog('='.repeat(40))
    this.addLog('✅ 所有测试完成')
    
    this.setData({ isTesting: false })
    
    wx.showModal({
      title: '测试完成',
      content: '所有API测试已完成，请查看日志',
      showCancel: false
    })
  },

  // 清空日志
  clearLog() {
    this.setData({
      testResults: [],
      serverStatus: 'unknown'
    })
    this.addLog('📝 日志已清空')
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 复制日志
  copyLog() {
    const logText = this.data.testResults.join('\n')
    wx.setClipboardData({
      data: logText,
      success: () => {
        wx.showToast({
          title: '日志已复制',
          icon: 'success'
        })
      }
    })
  }
})

