// pages/account/account.js
Page({
  data: {
    userInfo: {
      username: '小兔用户',
      id: '123456',
      avatar: '',
      isOnline: true,
      noteCount: 25,
      followers: 128,
      following: 89
    },
    storageInfo: {
      localUsed: 45,
      localTotal: 100,
      localPercent: 45,
      cloudUsed: 120,
      cloudTotal: 500,
      cloudPercent: 24
    },
    subscriptionInfo: {
      plan: '免费版',
      description: '基础功能，适合日常使用',
      isActive: true
    },
    appInfo: {
      version: '1.0.0'
    }
  },

  onLoad(options) {
    console.log('账户管理页面加载')
    this.loadUserInfo()
    this.loadStorageInfo()
  },

  onShow() {
    console.log('账户管理页面显示')
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userInfo
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载存储信息
  loadStorageInfo() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      console.log('系统信息:', systemInfo)
      
      // 模拟存储使用情况
      const storageInfo = {
        localUsed: Math.floor(Math.random() * 50) + 20,
        localTotal: 100,
        cloudUsed: Math.floor(Math.random() * 200) + 50,
        cloudTotal: 500
      }
      
      storageInfo.localPercent = Math.round((storageInfo.localUsed / storageInfo.localTotal) * 100)
      storageInfo.cloudPercent = Math.round((storageInfo.cloudUsed / storageInfo.cloudTotal) * 100)
      
      this.setData({ storageInfo })
    } catch (error) {
      console.error('加载存储信息失败:', error)
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 更换头像
  changeAvatar() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto()
        } else if (res.tapIndex === 1) {
          this.selectFromAlbum()
        }
      }
    })
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'front',
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.updateAvatar(res.tempFiles[0].tempFilePath)
        }
      },
      fail: (error) => {
        console.error('拍照失败:', error)
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        })
      }
    })
  },

  // 从相册选择
  selectFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.updateAvatar(res.tempFiles[0].tempFilePath)
        }
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 更新头像
  updateAvatar(avatarPath) {
    wx.showLoading({ title: '更新中...' })
    
    // 模拟上传头像
    setTimeout(() => {
      wx.hideLoading()
      
      const userInfo = {
        ...this.data.userInfo,
        avatar: avatarPath
      }
      
      this.setData({ userInfo })
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    }, 1500)
  },

  // 编辑资料
  editProfile() {
    wx.showModal({
      title: '编辑资料',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 修改密码
  changePassword() {
    wx.showModal({
      title: '修改密码',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 隐私设置
  privacySettings() {
    wx.showModal({
      title: '隐私设置',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 通知设置
  notificationSettings() {
    wx.showModal({
      title: '通知设置',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清理应用缓存吗？这将删除临时文件，但不会影响您的笔记数据。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '缓存清理完成',
              icon: 'success'
            })
            
            // 更新存储信息
            this.loadStorageInfo()
          }, 2000)
        }
      }
    })
  },

  // 备份数据
  backupData() {
    wx.showModal({
      title: '备份数据',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 升级计划
  upgradePlan() {
    wx.showModal({
      title: '升级计划',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 查看账单
  viewBilling() {
    wx.showModal({
      title: '查看账单',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '关于应用',
      content: `小兔的梦幻世界笔记本\n版本：${this.data.appInfo.version}\n\n一个充满想象力的笔记应用，让您的创意自由飞翔。`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 帮助中心
  helpCenter() {
    wx.showModal({
      title: '帮助中心',
      content: '此功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题或建议，请通过以下方式联系我们：\n\n邮箱：support@rabbitnotes.com\n微信：RabbitNotes2024',
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
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
            
            // 跳转到登录页面
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/login/login'
              })
            }, 1500)
          }, 1000)
        }
      }
    })
  }
})
