// pages/password-reset-test/password-reset-test.js - 密码重置功能测试页面
const apiService = require('../../utils/apiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    testType: 'requestReset' // requestReset, resetPassword, changePassword
  },

  onLoad() {
    console.log('密码重置功能测试页面加载')
  },

  // 测试请求密码重置
  async testRequestPasswordReset() {
    this.setData({ isLoading: true, testResult: '正在测试请求密码重置API...' })
    
    try {
      const testData = {
        username: 'testuser',
        email: 'test@example.com'
      }
      
      console.log('发送测试数据:', testData)
      
      const result = await apiService.requestPasswordReset(testData.username, testData.email)
      
      console.log('API调用结果:', result)
      
      this.setData({
        testResult: `✅ 请求密码重置测试成功！\n\nAPI响应:\n${JSON.stringify(result, null, 2)}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('API测试失败:', error)
      
      this.setData({
        testResult: `❌ 请求密码重置测试失败！\n\n错误信息:\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    }
  },

  // 测试重置密码
  async testResetPassword() {
    this.setData({ isLoading: true, testResult: '正在测试重置密码API...' })
    
    try {
      const testData = {
        username: 'testuser',
        resetCode: '123456',
        newPassword: 'newpassword123'
      }
      
      console.log('发送测试数据:', testData)
      
      const result = await apiService.resetPassword(testData.username, testData.resetCode, testData.newPassword)
      
      console.log('API调用结果:', result)
      
      this.setData({
        testResult: `✅ 重置密码测试成功！\n\nAPI响应:\n${JSON.stringify(result, null, 2)}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('API测试失败:', error)
      
      this.setData({
        testResult: `❌ 重置密码测试失败！\n\n错误信息:\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    }
  },

  // 测试修改密码
  async testChangePassword() {
    this.setData({ isLoading: true, testResult: '正在测试修改密码API...' })
    
    try {
      const testData = {
        oldPassword: 'oldpassword123',
        newPassword: 'newpassword123'
      }
      
      console.log('发送测试数据:', testData)
      
      const result = await apiService.changePassword(testData.oldPassword, testData.newPassword)
      
      console.log('API调用结果:', result)
      
      this.setData({
        testResult: `✅ 修改密码测试成功！\n\nAPI响应:\n${JSON.stringify(result, null, 2)}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('API测试失败:', error)
      
      this.setData({
        testResult: `❌ 修改密码测试失败！\n\n错误信息:\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    }
  },

  // 测试密码重置页面跳转
  testPasswordResetPage() {
    wx.navigateTo({
      url: '/pages/password-reset/password-reset?username=testuser'
    })
  },

  // 测试修改密码页面跳转
  testChangePasswordPage() {
    wx.navigateTo({
      url: '/pages/change-password/change-password'
    })
  },

  // 清空测试结果
  clearResult() {
    this.setData({ testResult: '' })
  }
})
