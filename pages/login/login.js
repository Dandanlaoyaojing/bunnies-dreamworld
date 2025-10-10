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

  // 统一提交方法
  onSubmit() {
    if (this.data.isLoginMode) {
      this.onLogin()
    } else {
      this.onRegister()
    }
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
    
    // 验证用户账号和密码
    setTimeout(() => {
      wx.hideLoading()
      
      const username = this.data.username.trim()
      const password = this.data.password
      
      // 验证账户是否存在
      const userAccounts = wx.getStorageSync('userLoginAccounts') || {}
      
      if (!userAccounts[username]) {
        wx.showToast({
          title: '账户不存在',
          icon: 'none',
          duration: 2000
        })
        console.log('登录失败：账户不存在')
        return
      }
      
      // 验证密码是否正确
      const storedPassword = userAccounts[username].password
      const inputPassword = this.encryptPassword(password)
      
      if (storedPassword !== inputPassword) {
        wx.showToast({
          title: '密码错误',
          icon: 'none',
          duration: 2000
        })
        console.log('登录失败：密码错误')
        return
      }
      
      // 登录成功
      const loginData = {
        username: username,
        rememberMe: this.data.rememberMe
      }
      
      // 保存登录状态
      wx.setStorageSync('userInfo', loginData)
      
      // 确保账户数据存储空间存在
      const noteManager = require('../../utils/noteManager')
      const initResult = noteManager.initializeAccount(username)
      console.log('检查账户数据存储空间:', initResult)
      
      // 登录成功后加载账户数据
      this.loadAccountDataAfterLogin(loginData.username)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      console.log('登录成功:', username)
      
      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/1/1'
        })
      }, 1500)
      
    }, 1000)
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
    
    // 注册账户
    setTimeout(() => {
      wx.hideLoading()
      
      const username = this.data.username.trim()
      const password = this.data.password
      
      // 检查账户是否已存在
      const userAccounts = wx.getStorageSync('userLoginAccounts') || {}
      
      if (userAccounts[username]) {
        wx.showToast({
          title: '账户已存在',
          icon: 'none',
          duration: 2000
        })
        console.log('注册失败：账户已存在')
        return
      }
      
      // 加密密码
      const encryptedPassword = this.encryptPassword(password)
      
      // 保存账户信息
      userAccounts[username] = {
        username: username,
        password: encryptedPassword,
        createTime: new Date().toISOString()
      }
      
      wx.setStorageSync('userLoginAccounts', userAccounts)
      
      // 同时在 userAccounts 中创建笔记数据存储空间
      const noteManager = require('../../utils/noteManager')
      const initResult = noteManager.initializeAccount(username)
      
      if (initResult.success) {
        console.log('账户笔记数据存储空间创建成功')
      } else {
        console.warn('账户笔记数据存储空间创建失败:', initResult.error)
      }
      
      console.log('注册成功:', username)
      
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
        
        wx.showModal({
          title: '注册成功',
          content: '账户已创建，请使用刚才的用户名和密码登录',
          showCancel: false,
          confirmText: '确定'
        })
      }, 1500)
      
    }, 1000)
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
  },

  // 登录后加载账户数据
  loadAccountDataAfterLogin(username) {
    try {
      console.log('开始加载账户数据:', username)
      
      // 动态导入noteManager
      const noteManager = require('../../utils/noteManager')
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(username)
      
      if (accountResult.success && accountResult.notes.length > 0) {
        console.log(`找到账户数据: ${accountResult.notes.length} 条笔记`)
        
        // 清空全局存储，然后加载当前账户的数据
        wx.setStorageSync('notes', accountResult.notes)
        
        // 同步标签数据
        if (accountResult.tags && accountResult.tags.length > 0) {
          const tagStats = accountResult.tags.map(tag => ({ name: tag, count: 1 }))
          wx.setStorageSync('noteTags', tagStats)
        } else {
          // 清空标签数据
          wx.setStorageSync('noteTags', [])
        }
        
        console.log('账户数据已同步到全局存储')
        
        // 数据加载完成（不显示提示，避免打扰用户）
      } else {
        console.log('账户中没有笔记数据，这是一个新账户')
        
        // 清空全局存储，新账户从空白开始
        wx.setStorageSync('notes', [])
        wx.setStorageSync('noteTags', [])
        
        console.log('已清空全局存储，新账户从空白开始')
        
        wx.showToast({
          title: '这是一个新账户',
          icon: 'success',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('加载账户数据失败:', error)
    }
  },

  // 密码加密函数（简单的Base64加密 + 盐值）
  encryptPassword(password) {
    try {
      // 添加固定盐值增加安全性
      const salt = 'bunny_notebook_salt_2025'
      const saltedPassword = password + salt
      
      // 使用Base64编码
      // 注意：微信小程序不支持btoa，需要手动实现Base64编码
      const base64 = this.base64Encode(saltedPassword)
      
      // 再次编码增加复杂度
      const doubleEncoded = this.base64Encode(base64)
      
      return doubleEncoded
    } catch (error) {
      console.error('密码加密失败:', error)
      return password // 如果加密失败，返回原始密码
    }
  },

  // Base64编码函数（兼容微信小程序）
  base64Encode(str) {
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    while (i < str.length) {
      const a = str.charCodeAt(i++)
      const b = i < str.length ? str.charCodeAt(i++) : 0
      const c = i < str.length ? str.charCodeAt(i++) : 0
      
      const bitmap = (a << 16) | (b << 8) | c
      
      result += base64chars.charAt((bitmap >> 18) & 63)
      result += base64chars.charAt((bitmap >> 12) & 63)
      result += i > str.length + 1 ? '=' : base64chars.charAt((bitmap >> 6) & 63)
      result += i > str.length ? '=' : base64chars.charAt(bitmap & 63)
    }
    
    return result
  }
})