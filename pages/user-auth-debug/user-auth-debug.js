// pages/user-auth-debug/user-auth-debug.js - 用户认证调试工具
const authGuard = require('../../utils/authGuard')
const apiService = require('../../utils/apiService')
const aiService = require('../../utils/aiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    debugInfo: {
      userInfo: null,
      authGuard: null,
      apiService: null,
      aiService: null
    }
  },

  onLoad() {
    console.log('用户认证调试工具加载')
    this.checkUserStatus()
  },

  // 检查用户状态
  checkUserStatus() {
    this.setData({ isLoading: true, testResult: '正在检查用户状态...' })
    
    try {
      // 1. 检查原始存储数据
      const rawUserInfo = wx.getStorageSync('userInfo')
      console.log('原始存储数据:', rawUserInfo)
      
      // 2. 检查authGuard获取的用户信息
      const authGuardUser = authGuard.getCurrentUser()
      console.log('authGuard用户信息:', authGuardUser)
      
      // 3. 检查apiService的token
      const apiServiceToken = apiService.getToken()
      console.log('apiService token:', apiServiceToken)
      
      // 4. 检查aiService的API状态
      const aiServiceStatus = aiService.checkApiStatus()
      console.log('aiService状态:', aiServiceStatus)
      
      let resultText = `✅ 用户状态检查结果：\n\n`
      
      // 原始存储数据
      resultText += `📦 原始存储数据:\n`
      resultText += `存在: ${!!rawUserInfo}\n`
      if (rawUserInfo) {
        resultText += `用户名: ${rawUserInfo.username || '无'}\n`
        resultText += `用户ID: ${rawUserInfo.userId || '无'}\n`
        resultText += `昵称: ${rawUserInfo.nickname || '无'}\n`
        resultText += `头像: ${rawUserInfo.avatar || '无'}\n`
        resultText += `Token: ${rawUserInfo.token ? '存在' : '不存在'}\n`
        resultText += `Token长度: ${rawUserInfo.token ? rawUserInfo.token.length : 0}\n`
        resultText += `登录状态: ${rawUserInfo.isLoggedIn ? '已登录' : '未登录'}\n`
      }
      
      resultText += `\n🔐 authGuard用户信息:\n`
      resultText += `存在: ${!!authGuardUser}\n`
      if (authGuardUser) {
        resultText += `用户名: ${authGuardUser.username || '无'}\n`
        resultText += `用户ID: ${authGuardUser.userId || '无'}\n`
        resultText += `昵称: ${authGuardUser.nickname || '无'}\n`
        resultText += `头像: ${authGuardUser.avatar || '无'}\n`
        resultText += `Token: ${authGuardUser.token ? '存在' : '不存在'}\n`
        resultText += `Token长度: ${authGuardUser.token ? authGuardUser.token.length : 0}\n`
        resultText += `登录状态: ${authGuardUser.isLoggedIn ? '已登录' : '未登录'}\n`
      }
      
      resultText += `\n🌐 apiService token:\n`
      resultText += `存在: ${!!apiServiceToken}\n`
      resultText += `长度: ${apiServiceToken ? apiServiceToken.length : 0}\n`
      
      resultText += `\n🤖 aiService状态:\n`
      resultText += `用户登录: ${aiServiceStatus.user.isLoggedIn ? '是' : '否'}\n`
      resultText += `用户名: ${aiServiceStatus.user.username || '无'}\n`
      resultText += `有Token: ${aiServiceStatus.user.hasToken ? '是' : '否'}\n`
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.userInfo': rawUserInfo,
        'debugInfo.authGuard': authGuardUser,
        'debugInfo.apiService': apiServiceToken,
        'debugInfo.aiService': aiServiceStatus
      })
      
    } catch (error) {
      console.error('用户状态检查失败:', error)
      
      this.setData({
        testResult: `❌ 用户状态检查失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试API状态检查
  async testAPIStatusCheck() {
    this.setData({ isLoading: true, testResult: '正在测试API状态检查...' })
    
    try {
      console.log('测试API状态检查')
      
      const result = await aiService.checkAPIStatus()
      
      console.log('API状态检查结果:', result)
      
      let resultText = `✅ API状态检查测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      resultText += `错误: ${result.error || '无'}\n`
      resultText += `错误代码: ${result.code || '无'}\n\n`
      
      if (result.success) {
        resultText += `✅ API状态正常\n`
        if (result.user) {
          resultText += `用户信息:\n`
          resultText += `- 登录状态: ${result.user.isLoggedIn ? '已登录' : '未登录'}\n`
          resultText += `- 用户名: ${result.user.username || '无'}\n`
          resultText += `- 有Token: ${result.user.hasToken ? '是' : '否'}\n`
        }
        if (result.service) {
          resultText += `服务信息:\n`
          resultText += `- 基础URL: ${result.service.baseURL}\n`
          resultText += `- 端点数量: ${Object.keys(result.service.endpoints).length}\n`
        }
      } else {
        resultText += `❌ API状态异常\n`
        resultText += `错误信息: ${result.error}\n`
        resultText += `错误代码: ${result.code}\n`
        
        if (result.code === 'UNAUTHORIZED') {
          resultText += `\n🔍 分析：用户未登录或Token无效\n`
          resultText += `建议：检查用户登录状态和Token\n`
        } else if (result.code === 'NETWORK_ERROR') {
          resultText += `\n🔍 分析：网络连接失败\n`
          resultText += `建议：检查网络连接和后端服务\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('API状态检查测试失败:', error)
      
      this.setData({
        testResult: `❌ API状态检查测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试API请求
  async testAPIRequest() {
    this.setData({ isLoading: true, testResult: '正在测试API请求...' })
    
    try {
      console.log('测试API请求')
      
      const result = await apiService.getDrafts()
      
      console.log('API请求结果:', result)
      
      let resultText = `✅ API请求测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      resultText += `错误: ${result.error || '无'}\n\n`
      
      if (result.success) {
        resultText += `✅ API请求成功\n`
        if (result.data) {
          resultText += `数据类型: ${typeof result.data}\n`
          if (typeof result.data === 'object' && result.data.drafts) {
            resultText += `草稿数量: ${result.data.drafts.length}\n`
          }
        }
      } else {
        resultText += `❌ API请求失败\n`
        resultText += `错误信息: ${result.error}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('API请求测试失败:', error)
      
      let errorText = `❌ API请求测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      if (error.code === 'UNAUTHORIZED') {
        errorText += `\n🔍 分析：认证失败\n`
        errorText += `建议：检查用户登录状态和Token\n`
      } else if (error.code === 'NETWORK_ERROR') {
        errorText += `\n🔍 分析：网络连接失败\n`
        errorText += `建议：检查网络连接和后端服务\n`
      }
      
      this.setData({
        testResult: errorText,
        isLoading: false
      })
    }
  },

  // 清空结果
  clearResult() {
    this.setData({ 
      testResult: '',
      debugInfo: {
        userInfo: null,
        authGuard: null,
        apiService: null,
        aiService: null
      }
    })
  }
})
