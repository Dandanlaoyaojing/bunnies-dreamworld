// pages/draft-sync-debug/draft-sync-debug.js - 草稿同步调试工具
const draftCloudService = require('../../utils/draftCloudService')
const apiService = require('../../utils/apiService')
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    testResult: '',
    isLoading: false,
    debugInfo: {
      apiResponse: null,
      downloadResult: null,
      cloudDrafts: null,
      localDrafts: null,
      mergedDrafts: null
    }
  },

  onLoad() {
    console.log('草稿同步调试工具加载')
  },

  // 测试API服务获取草稿
  async testAPIGetDrafts() {
    this.setData({ isLoading: true, testResult: '正在测试API服务获取草稿...' })
    
    try {
      console.log('测试API服务获取草稿')
      
      const result = await apiService.getDrafts()
      
      console.log('API服务响应:', result)
      
      let resultText = `✅ API服务获取草稿测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      resultText += `数据类型: ${typeof result.data}\n`
      resultText += `是否为数组: ${Array.isArray(result.data)}\n`
      resultText += `数据长度: ${Array.isArray(result.data) ? result.data.length : 'N/A'}\n\n`
      
      if (result.success && result.data) {
        if (typeof result.data === 'object' && result.data.drafts) {
          // 新的数据结构：data是对象，包含drafts数组
          const drafts = result.data.drafts || []
          resultText += `草稿列表 (${drafts.length}条)：\n`
          drafts.forEach((draft, index) => {
            resultText += `${index + 1}. ${draft.title || '无标题'} (ID: ${draft.id})\n`
            resultText += `   标签: ${draft.tags || '无'}\n`
            resultText += `   字数: ${draft.word_count || 0}\n`
          })
          
          if (result.data.pagination) {
            resultText += `\n分页信息:\n`
            resultText += `当前页: ${result.data.pagination.page}\n`
            resultText += `每页数量: ${result.data.pagination.limit}\n`
            resultText += `总数量: ${result.data.pagination.total}\n`
            resultText += `总页数: ${result.data.pagination.total_pages}\n`
          }
        } else if (Array.isArray(result.data)) {
          // 旧的数据结构：data直接是数组
          resultText += `草稿列表 (${result.data.length}条)：\n`
          result.data.forEach((draft, index) => {
            resultText += `${index + 1}. ${draft.title || '无标题'} (ID: ${draft.id})\n`
          })
        } else {
          resultText += `⚠️ 注意：data字段格式不正确\n`
          resultText += `data类型: ${typeof result.data}\n`
          resultText += `data内容: ${JSON.stringify(result.data, null, 2)}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.apiResponse': result
      })
      
    } catch (error) {
      console.error('API服务测试失败:', error)
      
      let errorText = `❌ API服务测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      if (error.code === 'UNAUTHORIZED') {
        errorText += `\n🔍 分析：认证失败\n`
        errorText += `建议：检查用户是否已登录\n`
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

  // 测试草稿下载
  async testDownloadDrafts() {
    this.setData({ isLoading: true, testResult: '正在测试草稿下载...' })
    
    try {
      console.log('测试草稿下载')
      
      const result = await draftCloudService.downloadDrafts()
      
      console.log('草稿下载结果:', result)
      
      let resultText = `✅ 草稿下载测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `错误: ${result.error || '无'}\n`
      resultText += `草稿数量: ${result.count || 0}\n`
      resultText += `草稿数据类型: ${typeof result.drafts}\n`
      resultText += `草稿是否为数组: ${Array.isArray(result.drafts)}\n\n`
      
      if (result.success && result.drafts) {
        if (Array.isArray(result.drafts)) {
          resultText += `下载的草稿：\n`
          result.drafts.forEach((draft, index) => {
            resultText += `${index + 1}. ${draft.title || '无标题'} (ID: ${draft.id})\n`
          })
        } else {
          resultText += `⚠️ 注意：drafts字段不是数组\n`
          resultText += `drafts内容: ${JSON.stringify(result.drafts, null, 2)}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.downloadResult': result
      })
      
    } catch (error) {
      console.error('草稿下载测试失败:', error)
      
      this.setData({
        testResult: `❌ 草稿下载测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试草稿同步
  async testSyncDrafts() {
    this.setData({ isLoading: true, testResult: '正在测试草稿同步...' })
    
    try {
      console.log('测试草稿同步')
      
      const result = await draftCloudService.syncDraftsFromCloud()
      
      console.log('草稿同步结果:', result)
      
      let resultText = `✅ 草稿同步测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      resultText += `错误: ${result.error || '无'}\n`
      resultText += `草稿数量: ${result.draftCount || 0}\n`
      resultText += `新增草稿: ${result.newDrafts || 0}\n\n`
      
      if (result.success) {
        resultText += `同步成功！\n`
        resultText += `总草稿数: ${result.draftCount}\n`
        if (result.newDrafts > 0) {
          resultText += `新增草稿: ${result.newDrafts}\n`
        }
      } else {
        resultText += `同步失败: ${result.error}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('草稿同步测试失败:', error)
      
      this.setData({
        testResult: `❌ 草稿同步测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 检查本地草稿
  checkLocalDrafts() {
    this.setData({ isLoading: true, testResult: '正在检查本地草稿...' })
    
    try {
      const localDrafts = noteManager.getAccountStorage('drafts', [])
      
      console.log('本地草稿:', localDrafts)
      
      let resultText = `✅ 本地草稿检查结果：\n\n`
      resultText += `草稿数量: ${localDrafts.length}\n`
      resultText += `数据类型: ${typeof localDrafts}\n`
      resultText += `是否为数组: ${Array.isArray(localDrafts)}\n\n`
      
      if (Array.isArray(localDrafts) && localDrafts.length > 0) {
        resultText += `本地草稿列表：\n`
        localDrafts.forEach((draft, index) => {
          resultText += `${index + 1}. ${draft.title || '无标题'} (ID: ${draft.id})\n`
        })
      } else {
        resultText += `本地没有草稿\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.localDrafts': localDrafts
      })
      
    } catch (error) {
      console.error('本地草稿检查失败:', error)
      
      this.setData({
        testResult: `❌ 本地草稿检查失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 清空结果
  clearResult() {
    this.setData({ 
      testResult: '',
      debugInfo: {
        apiResponse: null,
        downloadResult: null,
        cloudDrafts: null,
        localDrafts: null,
        mergedDrafts: null
      }
    })
  }
})
