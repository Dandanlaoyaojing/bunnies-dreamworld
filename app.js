// app.js
const noteManager = require('./utils/noteManager')

App({
  onLaunch() {
    console.log('应用启动')
    
    // 执行回收站自动清理（30天）
    this.autoCleanTrashOnLaunch()
  },

  onShow() {
    console.log('应用显示')
  },

  onHide() {
    console.log('应用隐藏')
  },

  /**
   * 应用启动时自动清理回收站
   */
  autoCleanTrashOnLaunch() {
    try {
      // 获取当前登录用户
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.username) {
        console.log('执行回收站自动清理:', userInfo.username)
        
        // 执行自动清理
        const result = noteManager.autoCleanTrash(userInfo.username)
        
        if (result.success && result.cleanedCount > 0) {
          console.log(`✅ 自动清理完成，删除了 ${result.cleanedCount} 条超过30天的笔记`)
          
          // 可选：显示清理通知（仅在清理了笔记时显示）
          if (result.cleanedCount > 0) {
            wx.showToast({
              title: `已清理 ${result.cleanedCount} 条过期笔记`,
              icon: 'success',
              duration: 2000
            })
          }
        } else {
          console.log('回收站无需清理')
        }
      } else {
        console.log('用户未登录，跳过回收站清理')
      }
    } catch (error) {
      console.error('自动清理回收站失败:', error)
    }
  }
})
