// pages/draft-delete-debug/draft-delete-debug.js - 草稿批量删除调试工具
const noteManager = require('../../utils/noteManager.js')
const draftCloudService = require('../../utils/draftCloudService.js')

Page({
  data: {
    drafts: [],
    selectedDrafts: [],
    isBatchMode: false,
    totalDrafts: 0,
    logs: []
  },

  onLoad() {
    this.addLog('调试工具加载')
    this.loadDrafts()
  },

  // 添加日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    this.setData({
      logs: [...this.data.logs, logMessage]
    })
    console.log(logMessage)
  },

  // 加载草稿
  async loadDrafts() {
    this.addLog('开始加载草稿...')
    
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      this.addLog(`加载到 ${drafts.length} 个草稿`)
      
      const processedDrafts = drafts.map(draft => ({
        ...draft,
        id: draft.id || Date.now().toString(),
        title: draft.title || '无标题',
        cloudId: draft.cloudId || null
      }))
      
      this.setData({
        drafts: processedDrafts,
        totalDrafts: processedDrafts.length
      })
      
      this.addLog(`处理完成，显示 ${processedDrafts.length} 个草稿`)
    } catch (error) {
      this.addLog(`加载草稿失败: ${error.message}`)
    }
  },

  // 切换草稿选择
  toggleDraft(e) {
    const draftId = e.currentTarget.dataset.id
    const selectedDrafts = [...this.data.selectedDrafts]
    const index = selectedDrafts.indexOf(draftId)
    
    if (index > -1) {
      selectedDrafts.splice(index, 1)
      this.addLog(`取消选择草稿: ${draftId}`)
    } else {
      selectedDrafts.push(draftId)
      this.addLog(`选择草稿: ${draftId}`)
    }
    
    this.setData({ selectedDrafts })
    this.addLog(`当前选中: ${selectedDrafts.length} 个草稿`)
  },

  // 切换批量模式
  toggleBatchMode() {
    const newMode = !this.data.isBatchMode
    this.setData({
      isBatchMode: newMode,
      selectedDrafts: []
    })
    this.addLog(`批量模式: ${newMode ? '开启' : '关闭'}`)
  },

  // 全选草稿
  selectAll() {
    const allIds = this.data.drafts.map(draft => draft.id)
    this.setData({ selectedDrafts: allIds })
    this.addLog(`全选 ${allIds.length} 个草稿`)
  },

  // 清空选择
  clearSelection() {
    this.setData({ selectedDrafts: [] })
    this.addLog('清空选择')
  },

  // 测试批量删除
  async testBatchDelete() {
    if (this.data.selectedDrafts.length === 0) {
      this.addLog('❌ 没有选中任何草稿')
      wx.showToast({
        title: '请先选择草稿',
        icon: 'none'
      })
      return
    }

    this.addLog(`开始测试批量删除 ${this.data.selectedDrafts.length} 个草稿`)
    
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      const selectedDrafts = drafts.filter(draft => 
        this.data.selectedDrafts.includes(draft.id)
      )
      
      this.addLog(`找到 ${selectedDrafts.length} 个要删除的草稿`)
      
      // 检查云端ID
      const cloudDrafts = selectedDrafts.filter(draft => draft.cloudId)
      this.addLog(`${cloudDrafts.length} 个草稿有云端ID`)
      
      // 先尝试从云端删除
      let cloudDeleteCount = 0
      for (const draft of cloudDrafts) {
        try {
          this.addLog(`尝试从云端删除: ${draft.cloudId}`)
          await draftCloudService.deleteDraft(draft.cloudId)
          cloudDeleteCount++
          this.addLog(`✅ 云端删除成功: ${draft.cloudId}`)
        } catch (error) {
          this.addLog(`❌ 云端删除失败: ${draft.cloudId} - ${error.message}`)
        }
      }
      
      // 删除本地草稿
      const updatedDrafts = drafts.filter(draft => 
        !this.data.selectedDrafts.includes(draft.id)
      )
      
      this.addLog(`删除前: ${drafts.length} 个草稿`)
      this.addLog(`删除后: ${updatedDrafts.length} 个草稿`)
      
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      this.addLog(`✅ 批量删除完成: 删除了 ${this.data.selectedDrafts.length} 个草稿`)
      if (cloudDeleteCount > 0) {
        this.addLog(`其中 ${cloudDeleteCount} 个已从云端删除`)
      }
      
      wx.showToast({
        title: `删除成功 ${this.data.selectedDrafts.length} 个`,
        icon: 'success'
      })
      
      // 清空选择并重新加载
      this.setData({
        selectedDrafts: [],
        isBatchMode: false
      })
      
      this.loadDrafts()
      
    } catch (error) {
      this.addLog(`❌ 批量删除失败: ${error.message}`)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  }
})
