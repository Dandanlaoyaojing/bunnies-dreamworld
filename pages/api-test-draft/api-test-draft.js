// pages/api-test-draft/api-test-draft.js - 草稿API测试页面
const apiService = require('../../utils/apiService')

Page({
  data: {
    testResult: '',
    isLoading: false
  },

  onLoad() {
    console.log('草稿API测试页面加载')
  },

  // 测试创建草稿API
  async testCreateDraft() {
    this.setData({ isLoading: true, testResult: '正在测试创建草稿API...' })
    
    try {
      const testDraftData = {
        title: '测试草稿标题',
        content: '这是一个测试草稿的内容，用于验证createDraft API方法是否正常工作。',
        category: 'knowledge',
        tags: ['测试', 'API', '草稿']
      }
      
      console.log('发送测试数据:', testDraftData)
      
      const result = await apiService.createDraft(testDraftData)
      
      console.log('API调用结果:', result)
      
      this.setData({
        testResult: `✅ 测试成功！\n\nAPI响应:\n${JSON.stringify(result, null, 2)}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('API测试失败:', error)
      
      this.setData({
        testResult: `❌ 测试失败！\n\n错误信息:\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    }
  },

  // 测试获取草稿列表API
  async testGetDrafts() {
    this.setData({ isLoading: true, testResult: '正在测试获取草稿列表API...' })
    
    try {
      const result = await apiService.getDrafts()
      
      console.log('获取草稿列表结果:', result)
      
      this.setData({
        testResult: `✅ 获取草稿列表成功！\n\nAPI响应:\n${JSON.stringify(result, null, 2)}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('获取草稿列表失败:', error)
      
      this.setData({
        testResult: `❌ 获取草稿列表失败！\n\n错误信息:\n${error.message}\n\n错误代码: ${error.code || 'UNKNOWN'}`,
        isLoading: false
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    }
  },

  // 清空测试结果
  clearResult() {
    this.setData({ testResult: '' })
  }
})
