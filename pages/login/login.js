// pages/login/login.js
// 引入API服务
const apiService = require('../../utils/apiService.js')

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

  // 登录（使用API）
  async onLogin() {
    console.log('开始登录（API方式）')
    
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
    
    const username = this.data.username.trim()
    const password = this.data.password
    
    try {
      // 调用API登录
      console.log('正在调用API登录...')
      const result = await apiService.login(username, password)
      
      wx.hideLoading()
      
      if (result.success) {
        console.log('✅ API登录成功:', result.data.user)
        
        // 保存用户信息（API已经自动保存了token）
        const loginData = {
          username: result.data.user.username,
          userId: result.data.user.id,
          nickname: result.data.user.nickname,
          avatar: result.data.user.avatar,
          token: result.data.token,
          isLoggedIn: true,
          rememberMe: this.data.rememberMe
        }
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', loginData)
        
        // 加载用户的笔记数据
        await this.loadNotesFromServer()
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        console.log('登录成功，用户ID:', loginData.userId)
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/1/1'
          })
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('❌ 登录失败:', err)
      
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 注册（使用API）
  async onRegister() {
    console.log('开始注册（API方式）')
    
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
    
    const username = this.data.username.trim()
    const password = this.data.password
    const nickname = username  // 默认昵称为用户名
    
    try {
      // 调用API注册
      console.log('正在调用API注册...')
      const result = await apiService.register(username, password, nickname)
      
      wx.hideLoading()
      
      if (result.success) {
        console.log('✅ API注册成功:', result.data.user)
        
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
      }
    } catch (err) {
      wx.hideLoading()
      console.error('❌ 注册失败:', err)
      
      wx.showToast({
        title: err.message || '注册失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
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

  // 从服务器加载笔记数据
  async loadNotesFromServer() {
    try {
      console.log('开始从服务器加载笔记数据...')
      
      // 调用API获取笔记列表
      const result = await apiService.getNotes({ page: 1, limit: 100 })
      
      if (result.success && result.data.notes) {
        const notes = result.data.notes
        console.log(`✅ 从服务器加载了 ${notes.length} 条笔记`)
        
        // 保存到本地缓存
        wx.setStorageSync('notes', notes)
        
        // 提取标签统计
        const tagMap = {}
        notes.forEach(note => {
          if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => {
              tagMap[tag] = (tagMap[tag] || 0) + 1
            })
          }
        })
        
        const tagStats = Object.keys(tagMap).map(name => ({
          name,
          count: tagMap[name]
        }))
        
        wx.setStorageSync('noteTags', tagStats)
        
        console.log('笔记数据已同步到本地缓存')
      } else {
        console.log('服务器上没有笔记数据')
        wx.setStorageSync('notes', [])
        wx.setStorageSync('noteTags', [])
      }
    } catch (error) {
      console.error('❌ 从服务器加载笔记失败:', error)
      // 加载失败不影响登录，使用空数据
      wx.setStorageSync('notes', [])
      wx.setStorageSync('noteTags', [])
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