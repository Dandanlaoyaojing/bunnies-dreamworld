// pages/profile-edit/profile-edit.js - 编辑资料页面
Page({
  data: {
    // 用户信息
    userInfo: {
      username: '',
      nickname: '',
      avatar: '',
      gender: 0, // 0: 保密, 1: 男, 2: 女
      birthday: '',
      bio: '',
      email: '',
      phone: '',
      location: '',
      website: ''
    },
    
    // 性别选项
    genderOptions: ['保密', '男', '女'],
    
    // 头像临时路径
    tempAvatarPath: '',
    
    // 表单状态
    isModified: false,
    isSaving: false
  },

  onLoad(options) {
    console.log('编辑资料页面加载')
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        // 确保所有字段都有默认值
        this.setData({
          userInfo: {
            username: userInfo.username || '',
            nickname: userInfo.nickname || userInfo.username || '',
            avatar: userInfo.avatar || '',
            gender: userInfo.gender || 0,
            birthday: userInfo.birthday || '',
            bio: userInfo.bio || '',
            email: userInfo.email || '',
            phone: userInfo.phone || '',
            location: userInfo.location || '',
            website: userInfo.website || ''
          }
        })
        console.log('用户信息加载成功:', this.data.userInfo)
      } else {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 输入事件处理
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value,
      isModified: true
    })
  },

  onBioInput(e) {
    this.setData({
      'userInfo.bio': e.detail.value,
      isModified: true
    })
  },

  onEmailInput(e) {
    this.setData({
      'userInfo.email': e.detail.value,
      isModified: true
    })
  },

  onPhoneInput(e) {
    this.setData({
      'userInfo.phone': e.detail.value,
      isModified: true
    })
  },

  onLocationInput(e) {
    this.setData({
      'userInfo.location': e.detail.value,
      isModified: true
    })
  },

  onWebsiteInput(e) {
    this.setData({
      'userInfo.website': e.detail.value,
      isModified: true
    })
  },

  // 选择性别
  onGenderChange(e) {
    this.setData({
      'userInfo.gender': parseInt(e.detail.value),
      isModified: true
    })
  },

  // 选择生日
  onBirthdayChange(e) {
    this.setData({
      'userInfo.birthday': e.detail.value,
      isModified: true
    })
  },

  // 更换头像
  changeAvatar() {
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['album'] : ['camera']
        this.chooseImage(sourceType)
      }
    })
  },

  // 选择图片
  chooseImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: sourceType,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        console.log('选择的图片:', tempFilePath)
        
        this.setData({
          tempAvatarPath: tempFilePath,
          'userInfo.avatar': tempFilePath,
          isModified: true
        })
        
        wx.showToast({
          title: '头像已更新',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        if (err.errMsg !== 'chooseImage:fail cancel') {
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      }
    })
  },

  // 保存资料
  saveProfile() {
    if (!this.data.isModified) {
      wx.showToast({
        title: '没有修改',
        icon: 'none'
      })
      return
    }

    // 验证必填字段
    if (!this.data.userInfo.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    // 验证邮箱格式
    if (this.data.userInfo.email && !this.validateEmail(this.data.userInfo.email)) {
      wx.showToast({
        title: '邮箱格式不正确',
        icon: 'none'
      })
      return
    }

    // 验证手机号格式
    if (this.data.userInfo.phone && !this.validatePhone(this.data.userInfo.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      })
      return
    }

    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...' })

    // 模拟保存过程
    setTimeout(() => {
      try {
        // 获取当前存储的用户信息
        const storedUserInfo = wx.getStorageSync('userInfo') || {}
        
        // 合并更新
        const updatedUserInfo = {
          ...storedUserInfo,
          ...this.data.userInfo,
          updateTime: new Date().toISOString()
        }
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', updatedUserInfo)
        
        wx.hideLoading()
        this.setData({ isSaving: false, isModified: false })
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        
      } catch (error) {
        console.error('保存失败:', error)
        wx.hideLoading()
        this.setData({ isSaving: false })
        
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    }, 1500)
  },

  // 验证邮箱格式
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // 验证手机号格式
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  // 重置表单
  resetForm() {
    wx.showModal({
      title: '重置表单',
      content: '确定要重置所有修改吗？',
      success: (res) => {
        if (res.confirm) {
          this.loadUserInfo()
          this.setData({
            isModified: false,
            tempAvatarPath: ''
          })
          wx.showToast({
            title: '已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  // 返回上一页
  goBack() {
    if (this.data.isModified) {
      wx.showModal({
        title: '提示',
        content: '您有未保存的修改，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  }
})
