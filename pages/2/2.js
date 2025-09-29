// pages/2/2.js
Page({
  data: {
    userInfo: {
      username: '小兔用户',
      avatar: '',
      desc: '记录生活的美好瞬间',
      isLoggedIn: false,
      noteCount: 0,
      dayCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      draftCount: 0,
      trashCount: 0
    },
    appInfo: {
      version: '1.0.0'
    }
  },

  onLoad(options) {
    console.log('我的页面加载')
    this.loadUserInfo()
  },

  onShow() {
    console.log('我的页面显示')
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        // 加载真实的统计数据
        this.loadRealStatistics(userInfo.username)
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userInfo,
            isLoggedIn: true
          }
        })
      } else {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            isLoggedIn: false
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载真实统计数据
  loadRealStatistics(username) {
    try {
      const noteManager = require('../../utils/noteManager')
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(username)
      
      if (accountResult.success) {
        const notes = accountResult.notes || []
        
        // 计算真实统计数据
        const noteCount = notes.length
        const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
        
        // 计算使用天数（基于笔记创建时间）
        const createDates = new Set()
        notes.forEach(note => {
          if (note.createTime) {
            const date = new Date(note.createTime)
            const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
            createDates.add(dateStr)
          }
        })
        const dayCount = createDates.size
        
        // 计算获赞数（如果有likeCount字段）
        const likeCount = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0)
        
        // 计算收藏数（如果有favoriteCount字段）
        const favoriteCount = notes.reduce((sum, note) => sum + (note.favoriteCount || 0), 0)
        
        // 计算草稿数（基于状态）
        const draftCount = notes.filter(note => note.status === 'draft').length
        
        // 计算回收站数量（基于状态）
        const trashCount = notes.filter(note => note.status === 'deleted').length
        
        // 更新用户信息
        this.setData({
          'userInfo.noteCount': noteCount,
          'userInfo.dayCount': dayCount,
          'userInfo.likeCount': likeCount,
          'userInfo.favoriteCount': favoriteCount,
          'userInfo.draftCount': draftCount,
          'userInfo.trashCount': trashCount
        })
        
        console.log('真实统计数据加载完成:', {
          noteCount,
          dayCount,
          likeCount,
          favoriteCount,
          draftCount,
          trashCount
        })
      } else {
        console.log('没有找到账户数据，使用默认值')
      }
    } catch (error) {
      console.error('加载真实统计数据失败:', error)
    }
  },

  // 跳转到账户管理
  goToAccount() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.navigateTo({
      url: '/pages/account/account'
    })
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 跳转到我的笔记
  goToMyNotes() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.navigateTo({
      url: '/pages/my-notes/my-notes'
    })
  },

  // 跳转到知识星图
  goToKnowledgeMap() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.navigateTo({
      url: '/pages/knowledge-map/knowledge-map'
    })
  },

  // 跳转到我的收藏
  goToFavorites() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到草稿箱
  goToDrafts() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到回收站
  goToTrash() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到应用设置
  goToSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到数据备份
  goToBackup() {
    if (!this.data.userInfo.isLoggedIn) {
      this.goToLogin()
      return
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到主题设置
  goToTheme() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 跳转到帮助中心
  goToHelp() {
    wx.showModal({
      title: '帮助中心',
      content: '如有问题，请通过以下方式联系我们：\n\n1. 查看应用内帮助文档\n2. 发送邮件至 support@rabbitnotes.com\n3. 在应用内提交反馈',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 跳转到意见反馈
  goToFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '我们非常重视您的意见和建议！\n\n请通过以下方式联系我们：\n\n邮箱：feedback@rabbitnotes.com\n微信：RabbitNotes2024',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '检查中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '检查更新',
        content: '当前已是最新版本',
        showCancel: false,
        confirmText: '知道了'
      })
    }, 1500)
  },

  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: `小兔的梦幻世界笔记本\n版本：${this.data.appInfo.version}\n\n一个充满想象力的笔记应用，让您的创意自由飞翔。\n\n开发者：小兔团队\n更新时间：2024年1月`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            
            // 清除用户信息
            wx.removeStorageSync('userInfo')
            
            // 更新页面数据
            this.setData({
              userInfo: {
                ...this.data.userInfo,
                isLoggedIn: false,
                username: '未登录',
                avatar: '',
                desc: '记录生活的美好瞬间'
              }
            })
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }, 1000)
        }
      }
    })
  }
})