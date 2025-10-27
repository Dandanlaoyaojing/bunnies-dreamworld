// pages/login-test/login-test.js - 登录功能测试页面
const apiService = require('../../utils/apiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    testAccount: {
      username: 'testuser',
      password: 'testpass123'
    }
  },

  onLoad() {
    console.log('登录功能测试页面加载')
  },

  // 更新测试账户
  onUsernameInput(e) {
    this.setData({
      'testAccount.username': e.detail.value
    })
  },

  onPasswordInput(e) {
    this.setData({
      'testAccount.password': e.detail.value
    })
  },

  // 测试注册
  async testRegister() {
    this.setData({ isLoading: true, testResult: '正在测试注册...' })
    
    try {
      const { username, password } = this.data.testAccount
      const testUsername = username + '_' + Date.now()
      
      console.log('测试注册:', { username: testUsername, password })
      
      const result = await apiService.register(testUsername, password, testUsername)
      
      console.log('注册结果:', result)
      
      let resultText = `✅ 注册测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      
      if (result.success) {
        resultText += `用户ID: ${result.data?.user?.id || '无'}\n`
        resultText += `用户名: ${result.data?.user?.username || '无'}\n\n`
        resultText += `💡 现在可以用这个账户测试登录：\n`
        resultText += `用户名: ${testUsername}\n`
        resultText += `密码: ${password}\n`
        
        // 更新测试账户
        this.setData({
          'testAccount.username': testUsername
        })
      } else {
        resultText += `错误: ${JSON.stringify(result, null, 2)}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('注册测试失败:', error)
      
      this.setData({
        testResult: `❌ 注册测试失败：\n\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
    }
  },

  // 测试登录
  async testLogin() {
    this.setData({ isLoading: true, testResult: '正在测试登录...' })
    
    try {
      const { username, password } = this.data.testAccount
      
      console.log('测试登录:', { username, password })
      
      const result = await apiService.login(username, password)
      
      console.log('登录结果:', result)
      
      let resultText = `✅ 登录测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      
      if (result.success) {
        resultText += `用户ID: ${result.data?.user?.id || '无'}\n`
        resultText += `用户名: ${result.data?.user?.username || '无'}\n`
        resultText += `Token: ${result.data?.token ? '已获取' : '未获取'}\n`
        resultText += `昵称: ${result.data?.user?.nickname || '无'}\n`
      } else {
        resultText += `错误: ${JSON.stringify(result, null, 2)}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('登录测试失败:', error)
      
      let errorText = `❌ 登录测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      if (error.code === 'UNAUTHORIZED') {
        errorText += `\n🔍 分析：用户名或密码错误\n`
        errorText += `建议：先测试注册功能创建账户\n`
      } else if (error.code === 'NETWORK_ERROR') {
        errorText += `\n🔍 分析：网络连接失败\n`
        errorText += `建议：检查后端服务器是否启动\n`
      }
      
      this.setData({
        testResult: errorText,
        isLoading: false
      })
    }
  },

  // 清空结果
  clearResult() {
    this.setData({ testResult: '' })
  }
})
