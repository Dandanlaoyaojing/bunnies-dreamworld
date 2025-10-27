// pages/login-diagnostic/login-diagnostic.js - 登录诊断工具
const apiService = require('../../utils/apiService')

Page({
  data: {
    diagnosticResult: '',
    isLoading: false,
    testData: {
      username: 'testuser',
      password: 'testpass123'
    }
  },

  onLoad() {
    console.log('登录诊断工具加载')
  },

  // 更新测试数据
  onUsernameInput(e) {
    this.setData({
      'testData.username': e.detail.value
    })
  },

  onPasswordInput(e) {
    this.setData({
      'testData.password': e.detail.value
    })
  },

  // 诊断API连接
  async diagnoseAPI() {
    this.setData({ isLoading: true, diagnosticResult: '正在诊断API连接...' })
    
    try {
      const results = await apiService.diagnoseConnection()
      
      let result = '🔍 API连接诊断结果：\n\n'
      let hasError = false
      
      results.tests.forEach(test => {
        const status = test.status === 'success' ? '✅' : 
                      test.status === 'error' ? '❌' : '⚠️'
        result += `${status} ${test.name}: ${test.message}\n`
        
        if (test.status === 'error') {
          hasError = true
        }
      })
      
      if (hasError) {
        result += '\n💡 建议：\n'
        result += '1. 检查后端服务器是否启动\n'
        result += '2. 确认API地址是否正确\n'
        result += '3. 检查网络连接\n'
      }
      
      this.setData({
        diagnosticResult: result,
        isLoading: false
      })
      
    } catch (error) {
      this.setData({
        diagnosticResult: `❌ 诊断失败：${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试登录API
  async testLogin() {
    this.setData({ isLoading: true, diagnosticResult: '正在测试登录API...' })
    
    try {
      const { username, password } = this.data.testData
      
      console.log('测试登录数据:', { username, password })
      
      const result = await apiService.login(username, password)
      
      console.log('登录API结果:', result)
      
      let resultText = `✅ 登录API测试结果：\n\n`
      resultText += `成功状态: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      
      if (result.success) {
        resultText += `用户ID: ${result.data?.user?.id || '无'}\n`
        resultText += `用户名: ${result.data?.user?.username || '无'}\n`
        resultText += `Token: ${result.data?.token ? '已获取' : '未获取'}\n`
      } else {
        resultText += `错误详情: ${JSON.stringify(result, null, 2)}\n`
      }
      
      this.setData({
        diagnosticResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('登录测试失败:', error)
      
      let errorText = `❌ 登录测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      errorText += `状态码: ${error.statusCode || '无'}\n\n`
      
      if (error.code === 'UNAUTHORIZED') {
        errorText += `🔍 分析：\n`
        errorText += `- 用户名或密码错误\n`
        errorText += `- 账户不存在\n`
        errorText += `- 密码加密方式不匹配\n`
      } else if (error.code === 'NETWORK_ERROR') {
        errorText += `🔍 分析：\n`
        errorText += `- 网络连接失败\n`
        errorText += `- 服务器未启动\n`
        errorText += `- API地址错误\n`
      }
      
      this.setData({
        diagnosticResult: errorText,
        isLoading: false
      })
    }
  },

  // 测试注册API
  async testRegister() {
    this.setData({ isLoading: true, diagnosticResult: '正在测试注册API...' })
    
    try {
      const { username, password } = this.data.testData
      const testUsername = username + '_test_' + Date.now()
      
      console.log('测试注册数据:', { username: testUsername, password })
      
      const result = await apiService.register(testUsername, password, testUsername)
      
      console.log('注册API结果:', result)
      
      let resultText = `✅ 注册API测试结果：\n\n`
      resultText += `成功状态: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      
      if (result.success) {
        resultText += `用户ID: ${result.data?.user?.id || '无'}\n`
        resultText += `用户名: ${result.data?.user?.username || '无'}\n`
        resultText += `\n💡 现在可以用这个账户测试登录：\n`
        resultText += `用户名: ${testUsername}\n`
        resultText += `密码: ${password}\n`
      } else {
        resultText += `错误详情: ${JSON.stringify(result, null, 2)}\n`
      }
      
      this.setData({
        diagnosticResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('注册测试失败:', error)
      
      let errorText = `❌ 注册测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      this.setData({
        diagnosticResult: errorText,
        isLoading: false
      })
    }
  },

  // 检查密码加密
  checkPasswordEncryption() {
    const { password } = this.data.testData
    
    // 模拟登录页面的加密函数
    const encryptPassword = (pwd) => {
      try {
        const salt = 'bunny_notebook_salt_2025'
        const saltedPassword = pwd + salt
        
        // 简单的Base64编码
        const base64 = this.base64Encode(saltedPassword)
        const doubleEncoded = this.base64Encode(base64)
        
        return doubleEncoded
      } catch (error) {
        return pwd
      }
    }
    
    const encrypted = encryptPassword(password)
    
    let result = `🔍 密码加密检查：\n\n`
    result += `原始密码: ${password}\n`
    result += `加密后密码: ${encrypted}\n`
    result += `加密长度: ${encrypted.length}\n\n`
    
    result += `⚠️ 注意：\n`
    result += `如果注册时使用了加密，但登录时没有使用相同的加密方式，\n`
    result += `就会导致密码不匹配的问题。\n\n`
    
    result += `💡 建议：\n`
    result += `1. 检查注册和登录是否使用相同的密码处理方式\n`
    result += `2. 确保后端也使用相同的加密算法\n`
    result += `3. 或者统一不使用加密（仅用于测试）\n`
    
    this.setData({
      diagnosticResult: result,
      isLoading: false
    })
  },

  // Base64编码函数（复制自登录页面）
  base64Encode(str) {
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    while (i < str.length) {
      const a = str.charCodeAt(i++)
      const b = i < str.length ? str.charCodeAt(i++) : 0
      const c = i < str.length ? str.charCodeAt(i++) : 0
      
      const bitmap = (a << 16) | (b << 8) | c
      
      result += base64chars.charAt((bitmap >> 18) & 63)
      result += base64chars.charAt((bitmap >> 12) & 63)
      result += i > str.length + 1 ? '=' : base64chars.charAt((bitmap >> 6) & 63)
      result += i > str.length ? '=' : base64chars.charAt(bitmap & 63)
    }
    
    return result
  },

  // 清空结果
  clearResult() {
    this.setData({ diagnosticResult: '' })
  }
})
