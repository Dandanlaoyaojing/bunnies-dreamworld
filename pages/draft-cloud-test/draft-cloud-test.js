// pages/draft-cloud-test/draft-cloud-test.js - 草稿云存储测试页面
const draftCloudService = require('../../utils/draftCloudService')
const apiService = require('../../utils/apiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    syncStatus: null,
    testDraft: {
      title: '测试草稿',
      content: '这是一个测试草稿的内容',
      category: 'knowledge',
      tags: ['测试', '草稿']
    }
  },

  onLoad() {
    console.log('草稿云存储测试页面加载')
    this.loadSyncStatus()
  },

  // 加载同步状态
  loadSyncStatus() {
    const status = draftCloudService.getSyncStatus()
    this.setData({ syncStatus: status })
    console.log('同步状态:', status)
  },

  // 测试上传草稿
  async testUploadDraft() {
    this.setData({ isLoading: true, testResult: '正在测试上传草稿...' })
    
    try {
      const result = await draftCloudService.uploadDraft(this.data.testDraft)
      
      console.log('上传草稿结果:', result)
      
      let resultText = `✅ 上传草稿测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.error || '无'}\n`
      
      if (result.success) {
        resultText += `云端ID: ${result.cloudId || '无'}\n`
        resultText += `草稿标题: ${result.draft?.title || '无'}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
      this.loadSyncStatus()
      
    } catch (error) {
      console.error('上传草稿测试失败:', error)
      
      this.setData({
        testResult: `❌ 上传草稿测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试下载草稿
  async testDownloadDrafts() {
    this.setData({ isLoading: true, testResult: '正在测试下载草稿...' })
    
    try {
      const result = await draftCloudService.downloadDrafts()
      
      console.log('下载草稿结果:', result)
      
      let resultText = `✅ 下载草稿测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.error || '无'}\n`
      
      if (result.success) {
        resultText += `草稿数量: ${result.count || 0}\n`
        if (result.drafts && result.drafts.length > 0) {
          resultText += `第一个草稿: ${result.drafts[0].title || '无标题'}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('下载草稿测试失败:', error)
      
      this.setData({
        testResult: `❌ 下载草稿测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试同步到云端
  async testSyncToCloud() {
    this.setData({ isLoading: true, testResult: '正在测试同步到云端...' })
    
    try {
      const result = await draftCloudService.syncDraftsToCloud()
      
      console.log('同步到云端结果:', result)
      
      let resultText = `✅ 同步到云端测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || result.error || '无'}\n`
      
      if (result.success) {
        resultText += `成功数量: ${result.successCount || 0}\n`
        resultText += `失败数量: ${result.failCount || 0}\n`
        resultText += `总数量: ${result.totalCount || 0}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
      this.loadSyncStatus()
      
    } catch (error) {
      console.error('同步到云端测试失败:', error)
      
      this.setData({
        testResult: `❌ 同步到云端测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试从云端同步
  async testSyncFromCloud() {
    this.setData({ isLoading: true, testResult: '正在测试从云端同步...' })
    
    try {
      const result = await draftCloudService.syncDraftsFromCloud()
      
      console.log('从云端同步结果:', result)
      
      let resultText = `✅ 从云端同步测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || result.error || '无'}\n`
      
      if (result.success) {
        resultText += `草稿数量: ${result.draftCount || 0}\n`
        resultText += `新增数量: ${result.newDrafts || 0}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
      this.loadSyncStatus()
      
    } catch (error) {
      console.error('从云端同步测试失败:', error)
      
      this.setData({
        testResult: `❌ 从云端同步测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试API连接
  async testAPIConnection() {
    this.setData({ isLoading: true, testResult: '正在测试API连接...' })
    
    try {
      const result = await apiService.getDrafts()
      
      console.log('API连接测试结果:', result)
      
      let resultText = `✅ API连接测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      
      if (result.success) {
        resultText += `数据: ${JSON.stringify(result.data, null, 2)}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('API连接测试失败:', error)
      
      let errorText = `❌ API连接测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      if (error.code === 'NETWORK_ERROR') {
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
