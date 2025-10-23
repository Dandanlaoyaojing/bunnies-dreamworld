// 通知服务
// 处理通知的获取、显示、管理等功能

const apiService = require('./apiService.js')

class NotificationService {
  constructor() {
    this.notifications = []
    this.unreadCount = 0
    this.isLoading = false
    this.lastUpdateTime = null
    this.loadLocalNotifications()
  }

  /**
   * 加载本地通知数据
   */
  loadLocalNotifications() {
    try {
      const localData = wx.getStorageSync('notifications')
      if (localData) {
        this.notifications = localData.notifications || []
        this.unreadCount = localData.unreadCount || 0
        this.lastUpdateTime = localData.lastUpdateTime
      }
    } catch (err) {
      console.error('加载本地通知失败:', err)
    }
  }

  /**
   * 保存本地通知数据
   */
  saveLocalNotifications() {
    try {
      const localData = {
        notifications: this.notifications,
        unreadCount: this.unreadCount,
        lastUpdateTime: this.lastUpdateTime
      }
      wx.setStorageSync('notifications', localData)
    } catch (err) {
      console.error('保存本地通知失败:', err)
    }
  }

  /**
   * 获取通知列表
   */
  async getNotifications(params = {}) {
    try {
      if (this.isLoading) {
        return { success: false, message: '正在加载中...' }
      }

      this.isLoading = true
      console.log('📬 获取通知列表...')

      const result = await apiService.getNotifications(params)
      
      if (result.success) {
        this.notifications = result.data.notifications || []
        this.unreadCount = result.data.unreadCount || 0
        this.lastUpdateTime = new Date().toISOString()
        this.saveLocalNotifications()
        
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取通知失败')
      }
    } catch (err) {
      console.error('❌ 获取通知失败:', err)
      return {
        success: false,
        message: err.message || '获取通知失败',
        error: err
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId) {
    try {
      console.log(`📖 标记通知 ${notificationId} 为已读...`)
      
      const result = await apiService.markNotificationRead(notificationId)
      
      if (result.success) {
        // 更新本地数据
        const notification = this.notifications.find(n => n.id === notificationId)
        if (notification) {
          notification.is_read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
          this.saveLocalNotifications()
        }
        
        return {
          success: true,
          message: '标记已读成功'
        }
      } else {
        throw new Error(result.message || '标记已读失败')
      }
    } catch (err) {
      console.error('❌ 标记已读失败:', err)
      return {
        success: false,
        message: err.message || '标记已读失败',
        error: err
      }
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId) {
    try {
      console.log(`🗑️ 删除通知 ${notificationId}...`)
      
      const result = await apiService.deleteNotification(notificationId)
      
      if (result.success) {
        // 更新本地数据
        const notification = this.notifications.find(n => n.id === notificationId)
        if (notification) {
          if (!notification.is_read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1)
          }
          this.notifications = this.notifications.filter(n => n.id !== notificationId)
          this.saveLocalNotifications()
        }
        
        return {
          success: true,
          message: '删除成功'
        }
      } else {
        throw new Error(result.message || '删除失败')
      }
    } catch (err) {
      console.error('❌ 删除通知失败:', err)
      return {
        success: false,
        message: err.message || '删除失败',
        error: err
      }
    }
  }

  /**
   * 批量标记为已读
   */
  async batchMarkAsRead(notificationIds = [], markAll = false) {
    try {
      console.log(`📖 批量标记为已读...`)
      
      const result = await apiService.batchMarkRead(notificationIds, markAll)
      
      if (result.success) {
        // 更新本地数据
        if (markAll) {
          this.notifications.forEach(notification => {
            notification.is_read = true
          })
          this.unreadCount = 0
        } else {
          notificationIds.forEach(id => {
            const notification = this.notifications.find(n => n.id === id)
            if (notification && !notification.is_read) {
              notification.is_read = true
              this.unreadCount = Math.max(0, this.unreadCount - 1)
            }
          })
        }
        this.saveLocalNotifications()
        
        return {
          success: true,
          message: '批量标记成功',
          data: result.data
        }
      } else {
        throw new Error(result.message || '批量标记失败')
      }
    } catch (err) {
      console.error('❌ 批量标记失败:', err)
      return {
        success: false,
        message: err.message || '批量标记失败',
        error: err
      }
    }
  }

  /**
   * 批量删除通知
   */
  async batchDeleteNotifications(notificationIds = [], deleteAll = false) {
    try {
      console.log(`🗑️ 批量删除通知...`)
      
      const result = await apiService.batchDeleteNotifications(notificationIds, deleteAll)
      
      if (result.success) {
        // 更新本地数据
        if (deleteAll) {
          this.notifications = []
          this.unreadCount = 0
        } else {
          notificationIds.forEach(id => {
            const notification = this.notifications.find(n => n.id === id)
            if (notification) {
              if (!notification.is_read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1)
              }
            }
          })
          this.notifications = this.notifications.filter(n => !notificationIds.includes(n.id))
        }
        this.saveLocalNotifications()
        
        return {
          success: true,
          message: '批量删除成功',
          data: result.data
        }
      } else {
        throw new Error(result.message || '批量删除失败')
      }
    } catch (err) {
      console.error('❌ 批量删除失败:', err)
      return {
        success: false,
        message: err.message || '批量删除失败',
        error: err
      }
    }
  }

  /**
   * 获取通知统计
   */
  async getNotificationStats() {
    try {
      console.log('📊 获取通知统计...')
      
      const result = await apiService.getNotificationStats()
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取统计失败')
      }
    } catch (err) {
      console.error('❌ 获取通知统计失败:', err)
      return {
        success: false,
        message: err.message || '获取统计失败',
        error: err
      }
    }
  }

  /**
   * 获取通知详情
   */
  async getNotificationDetail(notificationId) {
    try {
      console.log(`📄 获取通知详情 ${notificationId}...`)
      
      const result = await apiService.getNotificationDetail(notificationId)
      
      if (result.success) {
        // 自动标记为已读
        await this.markAsRead(notificationId)
        
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取详情失败')
      }
    } catch (err) {
      console.error('❌ 获取通知详情失败:', err)
      return {
        success: false,
        message: err.message || '获取详情失败',
        error: err
      }
    }
  }

  /**
   * 显示通知
   */
  showNotification(notification) {
    try {
      if (!notification) return

      // 显示系统通知
      wx.showToast({
        title: notification.title,
        icon: 'none',
        duration: 3000
      })

      // 如果是重要通知，显示模态框
      if (notification.type === 'important' || notification.type === 'system') {
        wx.showModal({
          title: notification.title,
          content: notification.content,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (err) {
      console.error('显示通知失败:', err)
    }
  }

  /**
   * 创建本地通知
   */
  createLocalNotification(type, title, content, data = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      content,
      data,
      is_read: false,
      created_at: new Date().toISOString()
    }

    this.notifications.unshift(notification)
    this.unreadCount++
    this.saveLocalNotifications()

    // 显示通知
    this.showNotification(notification)

    return notification
  }

  /**
   * 获取未读数量
   */
  getUnreadCount() {
    return this.unreadCount
  }

  /**
   * 获取本地通知列表
   */
  getLocalNotifications() {
    return this.notifications
  }

  /**
   * 获取未读通知
   */
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.is_read)
  }

  /**
   * 按类型获取通知
   */
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type)
  }

  /**
   * 刷新通知数据
   */
  async refresh() {
    try {
      console.log('🔄 刷新通知数据...')
      return await this.getNotifications({ page: 1, limit: 50 })
    } catch (err) {
      console.error('❌ 刷新通知失败:', err)
      return {
        success: false,
        message: err.message || '刷新失败',
        error: err
      }
    }
  }

  /**
   * 清除所有通知
   */
  async clearAll() {
    try {
      const result = await this.batchDeleteNotifications([], true)
      if (result.success) {
        console.log('✅ 所有通知已清除')
      }
      return result
    } catch (err) {
      console.error('❌ 清除所有通知失败:', err)
      return {
        success: false,
        message: err.message || '清除失败',
        error: err
      }
    }
  }

  /**
   * 标记所有为已读
   */
  async markAllAsRead() {
    try {
      const result = await this.batchMarkAsRead([], true)
      if (result.success) {
        console.log('✅ 所有通知已标记为已读')
      }
      return result
    } catch (err) {
      console.error('❌ 标记所有为已读失败:', err)
      return {
        success: false,
        message: err.message || '标记失败',
        error: err
      }
    }
  }
}

// 创建单例实例
const notificationService = new NotificationService()

module.exports = notificationService

