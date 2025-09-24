// pages/login/login.js
Page({
  data: {
    // 模式控制
    isLoginMode: true,
    
    // 表单数据
    username: '',
    password: '',
    confirmPassword: '',
    
    // 输入框焦点状态
    usernameFocused: false,
    passwordFocused: false,
    confirmPasswordFocused: false,
    
    // 密码显示状态
    showPassword: false,
    showConfirmPassword: false,
    
    // 表单验证错误
    usernameError: '',
    passwordError: '',
    confirmPasswordError: '',
    
    // 其他状态
    rememberMe: false,
    agreedToTerms: false,
    canSubmit: false
  },

  onLoad(options) {
    console.log('登录页面加载')
    // 检查是否有跳转参数
    if (options.mode === 'register') {
      this.setData({ isLoginMode: false })
    }
    this.updateSubmitButton()
  },

  onShow() {
    console.log('登录页面显示')
  },

  // 切换到登录模式
  switchToLogin() {
    this.setData({
      isLoginMode: true,
      usernameError: '',
      passwordError: '',
      confirmPasswordError: ''
    })
    this.updateSubmitButton()
  },

  // 切换到注册模式
  switchToRegister() {
    this.setData({
      isLoginMode: false,
      usernameError: '',
      passwordError: '',
      confirmPasswordError: ''
    })
    this.updateSubmitButton()
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

  // 密码输入
  onPasswordInput(e) {
    const password = e.detail.value
    this.setData({ 
      password: password,
      passwordError: ''
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

  // 用户名焦点事件
  onUsernameFocus() {
    this.setData({ usernameFocused: true })
  },

  onUsernameBlur() {
    this.setData({ usernameFocused: false })
    this.validateUsername()
  },

  // 密码焦点事件
  onPasswordFocus() {
    this.setData({ passwordFocused: true })
  },

  onPasswordBlur() {
    this.setData({ passwordFocused: false })
    this.validatePassword()
  },

  // 确认密码焦点事件
  onConfirmPasswordFocus() {
    this.setData({ confirmPasswordFocused: true })
  },

  onConfirmPasswordBlur() {
    this.setData({ confirmPasswordFocused: false })
    this.validateConfirmPassword()
  },

  // 切换密码显示
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  // 切换确认密码显示
  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword })
  },

  // 切换记住我
  toggleRememberMe() {
    this.setData({ rememberMe: !this.data.rememberMe })
  },

  // 切换服务条款同意
  toggleAgreement() {
    this.setData({ agreedToTerms: !this.data.agreedToTerms })
    this.updateSubmitButton()
  },

  // 验证用户名
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
    if (username.length > 20) {
      this.setData({ usernameError: '用户名不能超过20个字符' })
      return false
    }
    this.setData({ usernameError: '' })
    return true
  },

  // 验证密码
  validatePassword() {
    const password = this.data.password
    if (!password) {
      this.setData({ passwordError: '请输入密码' })
      return false
    }
    if (password.length < 6) {
      this.setData({ passwordError: '密码至少6个字符' })
      return false
    }
    this.setData({ passwordError: '' })
    return true
  },

  // 验证确认密码
  validateConfirmPassword() {
    const password = this.data.password
    const confirmPassword = this.data.confirmPassword
    if (!confirmPassword) {
      this.setData({ confirmPasswordError: '请确认密码' })
      return false
    }
    if (password !== confirmPassword) {
      this.setData({ confirmPasswordError: '两次输入的密码不一致' })
      return false
    }
    this.setData({ confirmPasswordError: '' })
    return true
  },

  // 更新提交按钮状态
  updateSubmitButton() {
    const { username, password, confirmPassword, isLoginMode, agreedToTerms } = this.data
    
    let canSubmit = false
    
    if (isLoginMode) {
      // 登录模式：需要用户名和密码
      canSubmit = username.trim() && password.trim()
    } else {
      // 注册模式：需要用户名、密码、确认密码和同意条款
      canSubmit = username.trim() && password.trim() && confirmPassword.trim() && agreedToTerms
    }
    
    this.setData({ canSubmit })
  },

  // 登录
  onLogin() {
    console.log('开始登录')
    
    // 验证表单
    if (!this.validateUsername() || !this.validatePassword()) {
      return
    }
    
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '登录中...' })
    
    // 模拟登录请求
    setTimeout(() => {
      wx.hideLoading()
      
      // 模拟登录成功
      const loginData = {
        username: this.data.username,
        rememberMe: this.data.rememberMe
      }
      
      // 保存登录状态
      wx.setStorageSync('userInfo', loginData)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/1/1'
        })
      }, 1500)
      
    }, 2000)
  },

  // 注册
  onRegister() {
    console.log('开始注册')
    
    // 验证表单
    if (!this.validateUsername() || !this.validatePassword() || !this.validateConfirmPassword()) {
      return
    }
    
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息并同意条款',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '注册中...' })
    
    // 模拟注册请求
    setTimeout(() => {
      wx.hideLoading()
      
      // 模拟注册成功
      const registerData = {
        username: this.data.username,
        password: this.data.password,
        createTime: new Date().toISOString()
      }
      
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })
      
      // 自动切换到登录模式
      setTimeout(() => {
        this.setData({
          isLoginMode: true,
          password: '',
          confirmPassword: '',
          agreedToTerms: false
        })
        this.updateSubmitButton()
      }, 1500)
      
    }, 2000)
  },

  // 微信登录
  onWechatLogin() {
    wx.showToast({
      title: '微信登录功能开发中',
      icon: 'none'
    })
  },

  // QQ登录
  onQQLogin() {
    wx.showToast({
      title: 'QQ登录功能开发中',
      icon: 'none'
    })
  },

  // 忘记密码
  onForgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系客服重置密码，或使用其他登录方式',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 查看服务条款
  onViewTerms() {
    wx.showModal({
      title: '服务条款',
      content: '这里是服务条款的内容...',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})