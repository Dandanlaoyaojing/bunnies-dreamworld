// pages/draft-delete-test/draft-delete-test.js - 草稿删除功能测试
const noteManager = require('../../utils/noteManager.js')

Page({
  data: {
    drafts: [],
    logs: []
  },

  onLoad() {
    this.addLog('测试页面加载')
    this.loadDrafts()
  },

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    this.setData({
      logs: [...this.data.logs, logMessage]
    })
    console.log(logMessage)
  },

  loadDrafts() {
    this.addLog('开始加载草稿...')
    
    try {
      const drafts = noteManager.getAccountStorage('drafts', [])
      this.addLog(`加载到 ${drafts.length} 个草稿`)
      
      this.setData({ drafts })
      
      if (drafts.length > 0) {
        this.addLog('草稿详情:')
        drafts.forEach((draft, index) => {
          this.addLog(`  ${index + 1}. ${draft.title} (ID: ${draft.id})`)
        })
      } else {
        this.addLog('没有找到任何草稿')
      }
    } catch (error) {
      this.addLog(`加载草稿失败: ${error.message}`)
    }
  },

  deleteSingleDraft(e) {
    const draftId = e.currentTarget.dataset.id
    const draft = this.data.drafts.find(d => d.id === draftId)
    
    if (!draft) {
      this.addLog(`❌ 找不到ID为 ${draftId} 的草稿`)
      return
    }

    this.addLog(`开始删除草稿: ${draft.title} (ID: ${draftId})`)
    
    try {
      // 获取当前草稿列表
      const currentDrafts = noteManager.getAccountStorage('drafts', [])
      this.addLog(`删除前草稿数量: ${currentDrafts.length}`)
      
      // 过滤掉要删除的草稿
      const updatedDrafts = currentDrafts.filter(d => d.id !== draftId)
      this.addLog(`删除后草稿数量: ${updatedDrafts.length}`)
      
      // 保存更新后的草稿列表
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      this.addLog(`✅ 草稿删除成功: ${draft.title}`)
      
      // 更新界面
      this.loadDrafts()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
    } catch (error) {
      this.addLog(`❌ 删除草稿失败: ${error.message}`)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  testBatchDelete() {
    this.addLog('开始测试批量删除...')
    
    if (this.data.drafts.length === 0) {
      this.addLog('❌ 没有草稿可以删除')
      wx.showToast({
        title: '没有草稿',
        icon: 'none'
      })
      return
    }

    // 选择前2个草稿进行批量删除测试
    const draftsToDelete = this.data.drafts.slice(0, Math.min(2, this.data.drafts.length))
    const draftIds = draftsToDelete.map(d => d.id)
    
    this.addLog(`准备删除 ${draftIds.length} 个草稿: ${draftIds.join(', ')}`)
    
    try {
      const currentDrafts = noteManager.getAccountStorage('drafts', [])
      this.addLog(`删除前草稿数量: ${currentDrafts.length}`)
      
      const updatedDrafts = currentDrafts.filter(draft => !draftIds.includes(draft.id))
      this.addLog(`删除后草稿数量: ${updatedDrafts.length}`)
      
      noteManager.setAccountStorage('drafts', updatedDrafts)
      
      this.addLog(`✅ 批量删除成功: 删除了 ${draftIds.length} 个草稿`)
      
      this.loadDrafts()
      
      wx.showToast({
        title: `删除成功 ${draftIds.length} 个`,
        icon: 'success'
      })
      
    } catch (error) {
      this.addLog(`❌ 批量删除失败: ${error.message}`)
      wx.showToast({
        title: '批量删除失败',
        icon: 'none'
      })
    }
  },

  testClearAll() {
    this.addLog('开始测试清空所有草稿...')
    
    if (this.data.drafts.length === 0) {
      this.addLog('❌ 没有草稿可以清空')
      wx.showToast({
        title: '没有草稿',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认清空',
      content: `确定要清空所有 ${this.data.drafts.length} 个草稿吗？`,
      success: (res) => {
        if (res.confirm) {
          try {
            noteManager.setAccountStorage('drafts', [])
            this.addLog(`✅ 清空成功: 删除了 ${this.data.drafts.length} 个草稿`)
            
            this.loadDrafts()
            
            wx.showToast({
              title: '清空成功',
              icon: 'success'
            })
          } catch (error) {
            this.addLog(`❌ 清空失败: ${error.message}`)
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            })
          }
        } else {
          this.addLog('用户取消了清空操作')
        }
      }
    })
  }
})
