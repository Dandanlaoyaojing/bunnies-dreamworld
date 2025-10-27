// pages/change-password/change-password.js - 修改密码页面
const apiService = require('../../utils/apiService')

Page({
  data: {
    // 表单数据
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    
    // 输入框焦点状态
    oldPasswordFocused: false,
    newPasswordFocused: false,
    confirmPasswordFocused: false,
    
    // 密码显示状态
    showOldPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    
    // 表单验证错误
    oldPasswordError: '',
    newPasswordError: '',
    confirmPasswordError: '',
    
    // 其他状态
    isLoading: false,
    canSubmit: false
  },

  onLoad() {
    console.log('修改密码页面加载')
  },

  // 旧密码输入
  onOldPasswordInput(e) {
    const oldPassword = e.detail.value
    this.setData({ 
      oldPassword: oldPassword,
      oldPasswordError: ''
    })
    this.updateSubmitButton()
  },

  // 新密码输入
  onNewPasswordInput(e) {
    const newPassword = e.detail.value
    this.setData({ 
      newPassword: newPassword,
      newPasswordError: ''
    })
    this.updateSubmitButton()
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    const confirmPassword = e.detail.value
    this.setData({ 
      confirmPassword: confirmPassword,
      confirmPasswordError: ''
    })
    this.updateSubmitButton()
  },

  // 焦点事件
  onOldPasswordFocus() { this.setData({ oldPasswordFocused: true }) },
  onOldPasswordBlur() { 
    this.setData({ oldPasswordFocused: false })
    this.validateOldPassword()
  },

  onNewPasswordFocus() { this.setData({ newPasswordFocused: true }) },
  onNewPasswordBlur() { 
    this.setData({ newPasswordFocused: false })
    this.validateNewPassword()
  },

  onConfirmPasswordFocus() { this.setData({ confirmPasswordFocused: true }) },
  onConfirmPasswordBlur() { 
    this.setData({ confirmPasswordFocused: false })
    this.validateConfirmPassword()
  },

  // 切换密码显示
  toggleOldPassword() {
    this.setData({ showOldPassword: !this.data.showOldPassword })
  },

  toggleNewPassword() {
    this.setData({ showNewPassword: !this.data.showNewPassword })
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword })
  },

  // 表单验证
  validateOldPassword() {
    const oldPassword = this.data.oldPassword
    if (!oldPassword) {
      this.setData({ oldPasswordError: '请输入当前密码' })
      return false
    }
    return true
  },

  validateNewPassword() {
    const newPassword = this.data.newPassword
    if (!newPassword) {
      this.setData({ newPasswordError: '请输入新密码' })
      return false
    }
    if (newPassword.length < 6) {
      this.setData({ newPasswordError: '密码至少6个字符' })
      return false
    }
    if (newPassword === this.data.oldPassword) {
      this.setData({ newPasswordError: '新密码不能与当前密码相同' })
      return false
    }
    return true
  },

  validateConfirmPassword() {
    const confirmPassword = this.data.confirmPassword
    const newPassword = this.data.newPassword
    if (!confirmPassword) {
      this.setData({ confirmPasswordError: '请确认新密码' })
      return false
    }
    if (confirmPassword !== newPassword) {
      this.setData({ confirmPasswordError: '两次输入的密码不一致' })
      return false
    }
    return true
  },

  // 更新提交按钮状态
  updateSubmitButton() {
    const canSubmit = this.data.oldPassword && 
                     this.data.newPassword && 
                     this.data.confirmPassword
    this.setData({ canSubmit })
  },

  // 修改密码
  async changePassword() {
    if (!this.validateOldPassword() || 
        !this.validateNewPassword() || 
        !this.validateConfirmPassword()) {
      return
    }

    this.setData({ isLoading: true })

    try {
      const result = await apiService.changePassword(
        this.data.oldPassword,
        this.data.newPassword
      )

      console.log('修改密码结果:', result)

      if (result.success) {
        wx.showModal({
          title: '修改成功',
          content: '密码修改成功，请重新登录',
          showCancel: false,
          success: () => {
            // 清除本地登录信息
            apiService.clearToken()
            wx.removeStorageSync('userInfo')
            
            // 返回登录页面
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }
        })
      } else {
        wx.showToast({
          title: result.message || '修改失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('修改密码失败:', error)
      
      let errorMessage = '修改失败'
      if (error.code === 'UNAUTHORIZED') {
        errorMessage = '当前密码错误'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 提交表单
  onSubmit() {
    if (!this.data.canSubmit || this.data.isLoading) {
      return
    }
    this.changePassword()
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})
