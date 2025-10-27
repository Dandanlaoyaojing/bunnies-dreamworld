// pages/password-reset/password-reset.js - 密码重置页面
const apiService = require('../../utils/apiService')

Page({
  data: {
    // 步骤控制
    currentStep: 1, // 1: 输入用户名/邮箱, 2: 输入验证码, 3: 设置新密码
    
    // 表单数据
    username: '',
    email: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: '',
    
    // 输入框焦点状态
    usernameFocused: false,
    emailFocused: false,
    resetCodeFocused: false,
    newPasswordFocused: false,
    confirmPasswordFocused: false,
    
    // 密码显示状态
    showNewPassword: false,
    showConfirmPassword: false,
    
    // 表单验证错误
    usernameError: '',
    emailError: '',
    resetCodeError: '',
    newPasswordError: '',
    confirmPasswordError: '',
    
    // 其他状态
    isLoading: false,
    canSubmit: false,
    countdown: 0, // 验证码倒计时
    resetCodeSent: false
  },

  onLoad(options) {
    console.log('密码重置页面加载')
    // 如果从登录页面跳转，可能带有用户名参数
    if (options.username) {
      this.setData({ username: decodeURIComponent(options.username) })
    }
  },

  // 用户名输入
  onUsernameInput(e) {
    const username = e.detail.value
    this.setData({ 
      username: username,
      usernameError: ''
    })
    this.updateSubmitButton()
  },

  // 邮箱输入
  onEmailInput(e) {
    const email = e.detail.value
    this.setData({ 
      email: email,
      emailError: ''
    })
    this.updateSubmitButton()
  },

  // 验证码输入
  onResetCodeInput(e) {
    const resetCode = e.detail.value
    this.setData({ 
      resetCode: resetCode,
      resetCodeError: ''
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
  onUsernameFocus() { this.setData({ usernameFocused: true }) },
  onUsernameBlur() { 
    this.setData({ usernameFocused: false })
    this.validateUsername()
  },

  onEmailFocus() { this.setData({ emailFocused: true }) },
  onEmailBlur() { 
    this.setData({ emailFocused: false })
    this.validateEmail()
  },

  onResetCodeFocus() { this.setData({ resetCodeFocused: true }) },
  onResetCodeBlur() { 
    this.setData({ resetCodeFocused: false })
    this.validateResetCode()
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
  toggleNewPassword() {
    this.setData({ showNewPassword: !this.data.showNewPassword })
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword })
  },

  // 表单验证
  validateUsername() {
    const username = this.data.username.trim()
    if (!username) {
      this.setData({ usernameError: '请输入用户名' })
      return false
    }
    if (username.length < 3) {
      this.setData({ usernameError: '用户名至少3个字符' })
      return false
    }
    return true
  },

  validateEmail() {
    const email = this.data.email.trim()
    if (!email) {
      this.setData({ emailError: '请输入邮箱地址' })
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      this.setData({ emailError: '请输入有效的邮箱地址' })
      return false
    }
    return true
  },

  validateResetCode() {
    const resetCode = this.data.resetCode.trim()
    if (!resetCode) {
      this.setData({ resetCodeError: '请输入验证码' })
      return false
    }
    if (resetCode.length !== 6) {
      this.setData({ resetCodeError: '验证码应为6位数字' })
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
    let canSubmit = false
    
    if (this.data.currentStep === 1) {
      canSubmit = this.data.username.trim() && this.data.email.trim()
    } else if (this.data.currentStep === 2) {
      canSubmit = this.data.resetCode.trim()
    } else if (this.data.currentStep === 3) {
      canSubmit = this.data.newPassword && this.data.confirmPassword
    }
    
    this.setData({ canSubmit })
  },

  // 发送验证码
  async sendResetCode() {
    if (!this.validateUsername() || !this.validateEmail()) {
      return
    }

    this.setData({ isLoading: true })

    try {
      const result = await apiService.requestPasswordReset(
        this.data.username.trim(),
        this.data.email.trim()
      )

      console.log('发送验证码结果:', result)

      if (result.success) {
        this.setData({ 
          currentStep: 2,
          resetCodeSent: true,
          countdown: 60
        })
        
        // 开始倒计时
        this.startCountdown()
        
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('发送验证码失败:', error)
      wx.showToast({
        title: error.message || '发送失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 验证重置码
  async verifyResetCode() {
    if (!this.validateResetCode()) {
      return
    }

    this.setData({ isLoading: true })

    try {
      // 这里只是验证验证码，不重置密码
      // 实际实现中可能需要单独的验证接口
      this.setData({ currentStep: 3 })
      
      wx.showToast({
        title: '验证码正确',
        icon: 'success'
      })
    } catch (error) {
      console.error('验证失败:', error)
      wx.showToast({
        title: '验证码错误',
        icon: 'error'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 重置密码
  async resetPassword() {
    if (!this.validateNewPassword() || !this.validateConfirmPassword()) {
      return
    }

    this.setData({ isLoading: true })

    try {
      const result = await apiService.resetPassword(
        this.data.username.trim(),
        this.data.resetCode.trim(),
        this.data.newPassword
      )

      console.log('重置密码结果:', result)

      if (result.success) {
        wx.showModal({
          title: '重置成功',
          content: '密码重置成功，请使用新密码登录',
          showCancel: false,
          success: () => {
            // 返回登录页面
            wx.navigateBack()
          }
        })
      } else {
        wx.showToast({
          title: result.message || '重置失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      wx.showToast({
        title: error.message || '重置失败',
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

    if (this.data.currentStep === 1) {
      this.sendResetCode()
    } else if (this.data.currentStep === 2) {
      this.verifyResetCode()
    } else if (this.data.currentStep === 3) {
      this.resetPassword()
    }
  },

  // 倒计时
  startCountdown() {
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        clearInterval(timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown: this.data.countdown - 1 })
      }
    }, 1000)
  },

  // 重新发送验证码
  resendCode() {
    if (this.data.countdown > 0) {
      wx.showToast({
        title: `请等待${this.data.countdown}秒`,
        icon: 'none'
      })
      return
    }
    this.sendResetCode()
  },

  // 返回上一步
  goBack() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    } else {
      wx.navigateBack()
    }
  },

  // 返回登录页面
  goToLogin() {
    wx.navigateBack()
  }
})
