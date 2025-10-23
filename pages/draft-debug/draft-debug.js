// 草稿调试页面
const noteManager = require('../../utils/noteManager.js')

Page({
  data: {
    drafts: [],
    currentAccount: null,
    storageKeys: []
  },

  onLoad() {
    console.log('草稿调试页面加载')
    this.loadDebugInfo()
  },

  /**
   * 加载调试信息
   */
  loadDebugInfo() {
    try {
      // 获取当前账户
      const currentAccount = noteManager.getCurrentAccountName()
      console.log('当前账户:', currentAccount)
      
      // 获取草稿数据
      const drafts = noteManager.getAccountStorage('drafts', [])
      console.log('草稿数据:', drafts)
      
      // 获取所有存储键
      const storageKeys = this.getAllStorageKeys()
      console.log('所有存储键:', storageKeys)
      
      this.setData({
        currentAccount,
        drafts,
        storageKeys
      })
    } catch (error) {
      console.error('加载调试信息失败:', error)
    }
  },

  /**
   * 获取所有存储键
   */
  getAllStorageKeys() {
    try {
      const info = wx.getStorageInfoSync()
      return info.keys || []
    } catch (error) {
      console.error('获取存储键失败:', error)
      return []
    }
  },

  /**
   * 创建测试草稿
   */
  createTestDraft() {
    try {
      const testDraft = {
        id: Date.now().toString(),
        title: '测试草稿 - 编辑测试',
        content: '这是一个测试草稿的内容，用于测试编辑功能。包含一些中文内容，用来验证草稿加载是否正常工作。',
        category: 'thinking',
        tags: ['测试', '草稿', '编辑'],
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        wordCount: 35
      }
      
      const drafts = noteManager.getAccountStorage('drafts', [])
      drafts.push(testDraft)
      noteManager.setAccountStorage('drafts', drafts)
      
      wx.showToast({
        title: '测试草稿已创建',
        icon: 'success'
      })
      
      this.loadDebugInfo()
    } catch (error) {
      console.error('创建测试草稿失败:', error)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    }
  },

  /**
   * 测试跳转到笔记编辑器
   */
  testNavigateToEditor() {
    const drafts = this.data.drafts
    if (drafts.length === 0) {
      wx.showToast({
        title: '没有草稿可测试',
        icon: 'none'
      })
      return
    }
    
    const firstDraft = drafts[0]
    console.log('测试跳转草稿ID:', firstDraft.id)
    console.log('草稿完整数据:', firstDraft)
    
    try {
      // 将草稿数据保存到本地存储，供note-editor页面读取
      wx.setStorageSync('editDraftData', {
        draftId: firstDraft.id,
        mode: 'draft',
        timestamp: Date.now()
      })
      
      console.log('草稿数据已保存到本地存储，准备跳转到tabBar页面')
      
      // 使用switchTab跳转到tabBar页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: () => {
          console.log('跳转成功')
          wx.showToast({
            title: '跳转成功',
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      console.error('保存草稿数据失败:', error)
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      })
    }
  },

  /**
   * 详细检查草稿数据
   */
  checkDraftData() {
    try {
      console.log('=== 详细检查草稿数据 ===')
      
      // 1. 检查当前账户
      const currentAccount = noteManager.getCurrentAccountName()
      console.log('当前账户:', currentAccount)
      
      // 2. 检查存储键
      const storageKey = noteManager.getAccountStorageKey('drafts')
      console.log('草稿存储键:', storageKey)
      
      // 3. 直接读取存储数据
      const rawData = wx.getStorageSync(storageKey)
      console.log('原始存储数据:', rawData)
      
      // 4. 通过noteManager读取
      const drafts = noteManager.getAccountStorage('drafts', [])
      console.log('通过noteManager读取的草稿:', drafts)
      
      // 5. 检查每个草稿的详细信息
      drafts.forEach((draft, index) => {
        console.log(`草稿 ${index + 1}:`, {
          id: draft.id,
          title: draft.title,
          content: draft.content,
          category: draft.category,
          hasContent: !!draft.content,
          contentLength: draft.content ? draft.content.length : 0
        })
      })
      
      wx.showModal({
        title: '草稿数据检查',
        content: `找到 ${drafts.length} 个草稿\n当前账户: ${currentAccount}\n存储键: ${storageKey}`,
        showCancel: false
      })
      
    } catch (error) {
      console.error('检查草稿数据失败:', error)
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
  },

  /**
   * 清除所有草稿
   */
  clearAllDrafts() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有草稿吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            noteManager.setAccountStorage('drafts', [])
            wx.showToast({
              title: '草稿已清除',
              icon: 'success'
            })
            this.loadDebugInfo()
          } catch (error) {
            console.error('清除草稿失败:', error)
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  /**
   * 刷新数据
   */
  refreshData() {
    this.loadDebugInfo()
  }
})
