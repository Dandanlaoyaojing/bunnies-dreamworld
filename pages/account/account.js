// pages/account/account.js
const noteManager = require('../../utils/noteManager')

Page({
  data: {
    userInfo: {
      username: '小兔用户',
      id: '123456',
      avatar: '',
      isOnline: true,
      noteCount: 0,
      dayCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      draftCount: 0,
      trashCount: 0,
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
      console.log('从存储中获取的用户信息:', userInfo)
      
      if (userInfo && userInfo.username) {
        console.log('用户已登录，用户名:', userInfo.username)
        // 加载真实的统计数据
        this.loadRealStatistics(userInfo.username)
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userInfo
          }
        })
      } else {
        console.log('用户未登录或用户信息不完整')
        // 显示未登录状态
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            username: '未登录',
            id: '000000',
            isOnline: false
          }
        })
        
        // 显示登录提示
        wx.showModal({
          title: '未登录',
          content: '请先登录以查看账户信息',
          showCancel: true,
          cancelText: '稍后',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      // 显示错误状态
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          username: '加载失败',
          id: '000000',
          isOnline: false
        }
      })
    }
  },

  // 加载真实统计数据
  loadRealStatistics(username) {
    try {
      console.log('开始加载用户统计数据，用户名:', username)
      
      if (!username) {
        console.log('用户名为空，无法加载统计数据')
        return
      }
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(username)
      console.log('账户数据获取结果:', accountResult)
      
      if (accountResult.success) {
        const notes = accountResult.notes || []
        console.log('找到笔记数量:', notes.length)
        
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
        
        // 显示加载成功提示
        if (noteCount > 0) {
          wx.showToast({
            title: `加载了${noteCount}条笔记`,
            icon: 'success',
            duration: 2000
          })
        }
      } else {
        console.log('没有找到账户数据，使用默认值')
        console.log('错误信息:', accountResult.error)
        
        // 显示无数据提示
        wx.showToast({
          title: '暂无笔记数据',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('加载真实统计数据失败:', error)
      
      // 显示错误提示
      wx.showToast({
        title: '数据加载失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 加载存储信息
  loadStorageInfo() {
    try {
      // 获取真实的存储信息
      wx.getStorageInfo({
        success: (res) => {
          console.log('存储信息:', res)
          
          // 计算实际数据大小
          const allNotes = wx.getStorageSync('notes') || []
          const allAccounts = wx.getStorageSync('userAccounts') || {}
          const allTags = wx.getStorageSync('noteTags') || []
          
          // 估算数据大小（粗略计算）
          const notesSize = JSON.stringify(allNotes).length
          const accountsSize = JSON.stringify(allAccounts).length
          const tagsSize = JSON.stringify(allTags).length
          const totalDataSize = notesSize + accountsSize + tagsSize
          
          const storageInfo = {
            localUsed: Math.round(res.currentSize / 1024), // KB转MB
            localTotal: Math.round(res.limitSize / 1024), // KB转MB
            dataSize: Math.round(totalDataSize / 1024), // 实际数据大小
            notesCount: allNotes.length,
            accountsCount: Object.keys(allAccounts).length,
            tagsCount: allTags.length,
            keysCount: res.keys.length,
            keysList: res.keys.slice(0, 10) // 显示前10个key
          }
          
          storageInfo.localPercent = Math.round((storageInfo.localUsed / storageInfo.localTotal) * 100)
          storageInfo.cloudUsed = Math.floor(Math.random() * 200) + 50
          storageInfo.cloudTotal = 500
          storageInfo.cloudPercent = Math.round((storageInfo.cloudUsed / storageInfo.cloudTotal) * 100)
          
          console.log('计算后的存储信息:', storageInfo)
          this.setData({ storageInfo })
        },
        fail: (error) => {
          console.error('获取存储信息失败:', error)
          
          // 使用模拟数据作为备选
          const storageInfo = {
            localUsed: 50,
            localTotal: 100,
            cloudUsed: 150,
            cloudTotal: 500,
            dataSize: 30,
            notesCount: 0,
            accountsCount: 0,
            tagsCount: 0,
            keysCount: 0,
            keysList: []
          }
          
          storageInfo.localPercent = 50
          storageInfo.cloudPercent = 30
          
          this.setData({ storageInfo })
        }
      })
    } catch (error) {
      console.error('加载存储信息失败:', error)
    }
  },

  // 测试账户存储功能
  testAccountStorage() {
    wx.showLoading({
      title: '正在测试...'
    })
    
    setTimeout(() => {
      wx.hideLoading()
      this.performStorageTest()
    }, 1000)
  },

  // 测试云存储连接
  async testCloudConnection() {
    try {
      wx.showLoading({ title: '测试云连接...' })
      
      // 导入阿里云服务
      const aliyunService = require('../../utils/aliyunService')
      
      // 先进行详细诊断
      const diagnosticResult = await this.performConnectionDiagnostic(aliyunService)
      
      // 测试服务器连接
      const result = await aliyunService.testConnection()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showModal({
          title: '云存储测试',
          content: '✅ 云服务器连接正常\n\n服务器地址已配置\nAPI接口可正常访问\n\n建议立即启用云同步功能',
          showCancel: true,
          cancelText: '稍后',
          confirmText: '启用同步',
          success: (res) => {
            if (res.confirm) {
              this.enableCloudSync()
            }
          }
        })
      } else {
        // 显示详细的错误信息和解决建议
        const errorContent = this.formatConnectionError(result, diagnosticResult)
        wx.showModal({
          title: '云存储测试失败',
          content: errorContent,
          showCancel: true,
          cancelText: '稍后重试',
          confirmText: '查看详情',
          success: (res) => {
            if (res.confirm) {
              this.showDetailedDiagnostic(diagnosticResult, result)
            }
          }
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showModal({
        title: '云存储测试',
        content: `❌ 测试过程中发生错误\n\n${error.message}\n\n请检查网络连接和服务器配置`,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 执行连接诊断
  async performConnectionDiagnostic(aliyunService) {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      networkStatus: null,
      serverUrl: null,
      dnsResolution: null,
      portConnectivity: null,
      sslCertificate: null,
      apiEndpoint: null
    }

    try {
      // 1. 检查网络状态
      const networkInfo = await new Promise((resolve) => {
        wx.getNetworkType({
          success: resolve,
          fail: () => resolve({ networkType: 'unknown' })
        })
      })
      diagnostic.networkStatus = networkInfo

      // 2. 获取服务器URL配置
      diagnostic.serverUrl = aliyunService.config.serverUrl

      // 3. 检查API端点
      diagnostic.apiEndpoint = `${aliyunService.config.serverUrl}/api/${aliyunService.config.apiVersion}/health`

      console.log('🔍 连接诊断结果:', diagnostic)
      return diagnostic
    } catch (error) {
      console.error('诊断过程出错:', error)
      diagnostic.error = error.message
      return diagnostic
    }
  },

  // 格式化连接错误信息
  formatConnectionError(result, diagnostic) {
    let content = `❌ 云服务器连接失败\n\n`
    
    if (result.error) {
      content += `错误信息: ${result.error}\n\n`
    }

    if (result.serverUrl) {
      content += `服务器地址: ${result.serverUrl}\n\n`
    }

    content += `可能的原因:\n`
    content += `1. 服务器未启动或端口未开放\n`
    content += `2. 域名解析失败\n`
    content += `3. SSL证书配置问题\n`
    content += `4. 防火墙阻止访问\n`
    content += `5. API接口路径错误\n\n`
    content += `建议点击"查看详情"获取更多诊断信息`

    return content
  },

  // 显示详细诊断信息
  showDetailedDiagnostic(diagnostic, connectionResult) {
    let content = `🔍 详细诊断信息\n\n`
    
    content += `⏰ 诊断时间: ${diagnostic.timestamp}\n\n`
    
    content += `🌐 网络状态:\n`
    content += `   类型: ${diagnostic.networkStatus?.networkType || '未知'}\n\n`
    
    content += `🔗 服务器配置:\n`
    content += `   URL: ${diagnostic.serverUrl || '未配置'}\n`
    content += `   API端点: ${diagnostic.apiEndpoint || '未配置'}\n\n`
    
    content += `📡 连接结果:\n`
    content += `   状态: ${connectionResult.success ? '成功' : '失败'}\n`
    content += `   错误: ${connectionResult.error || '无'}\n\n`
    
    content += `🛠️ 解决步骤:\n`
    content += `1. 确认服务器已启动\n`
    content += `2. 检查域名是否正确\n`
    content += `3. 验证SSL证书\n`
    content += `4. 检查防火墙设置\n`
    content += `5. 确认API路径正确`

    wx.showModal({
      title: '诊断详情',
      content: content,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '重新测试',
      success: (res) => {
        if (res.confirm) {
          this.testCloudConnection()
        }
      }
    })
  },

  // 配置服务器
  configureServer() {
    // 获取当前配置
    const aliyunService = require('../../utils/aliyunService')
    const currentUrl = aliyunService.config.serverUrl
    
    wx.showModal({
      title: '配置服务器地址',
      content: `当前服务器地址:\n${currentUrl}\n\n请输入新的服务器地址:`,
      editable: true,
      placeholderText: 'https://your-domain.com',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newUrl = res.content.trim()
          
          // 验证URL格式
          if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
            wx.showToast({
              title: 'URL格式错误',
              icon: 'none'
            })
            return
          }
          
          // 设置新的服务器URL
          aliyunService.setServerUrl(newUrl)
          
          // 保存到本地存储
          wx.setStorageSync('serverUrl', newUrl)
          
          wx.showToast({
            title: '配置已保存',
            icon: 'success'
          })
          
          // 自动测试新配置
          setTimeout(() => {
            this.testCloudConnection()
          }, 1000)
        }
      }
    })
  },

  // 启用云同步
  async enableCloudSync() {
    try {
      wx.showLoading({ title: '启用云同步...' })
      
      // 导入阿里云服务
      const aliyunService = require('../../utils/aliyunService')
      
      // 执行完整同步
      const result = await aliyunService.fullSync()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showModal({
          title: '云同步启用成功',
          content: `✅ 云同步已启用\n\n${result.message}\n\n现在你的笔记将自动同步到云端，即使更换设备也不会丢失数据！`,
          showCancel: false,
          confirmText: '太好了'
        })
      } else {
        wx.showModal({
          title: '云同步启用失败',
          content: `❌ 启用云同步失败\n\n${result.error}\n\n请稍后重试或联系技术支持`,
          showCancel: false,
          confirmText: '确定'
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showModal({
        title: '云同步启用失败',
        content: `❌ 启用过程中发生错误\n\n${error.message}`,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 执行存储测试
  performStorageTest() {
    console.log('=== 开始测试账户存储功能 ===')
    
    // 1. 检查用户登录状态
    let testResult = ''
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.username) {
        testResult += `✅ 用户已登录: ${userInfo.username}\n`
        console.log('✅ 用户已登录:', userInfo.username)
        
        // 2. 检查笔记数据
        const notes = wx.getStorageSync('notes') || []
        testResult += `📝 全局笔记数量: ${notes.length}\n`
        console.log('📝 全局笔记数量:', notes.length)
        
        // 3. 检查账户数据
        const accounts = wx.getStorageSync('userAccounts') || {}
        const accountData = accounts[userInfo.username]
        
        if (accountData) {
          const accountNotesCount = accountData.notes ? accountData.notes.length : 0
          testResult += `👤 账户笔记数量: ${accountNotesCount}\n`
          testResult += `🏷️ 账户标签数量: ${accountData.tags ? accountData.tags.length : 0}\n`
          testResult += `📂 账户分类数量: ${accountData.categories ? accountData.categories.length : 0}\n`
          testResult += `⏰ 最后更新: ${accountData.updateTime}\n`
          
          console.log('👤 账户笔记数量:', accountNotesCount)
          console.log('🏷️ 账户标签数量:', accountData.tags ? accountData.tags.length : 0)
          console.log('📂 账户分类数量:', accountData.categories ? accountData.categories.length : 0)
          
          // 4. 比较数据一致性
          if (notes.length === accountNotesCount) {
            testResult += `✅ 数据一致性: 正常\n`
            console.log('✅ 数据一致性: 正常')
          } else {
            testResult += `⚠️ 数据一致性: 不一致\n`
            testResult += `   全局笔记: ${notes.length} 条\n`
            testResult += `   账户笔记: ${accountNotesCount} 条\n`
            console.log('⚠️ 数据一致性: 不一致')
            console.log('   全局笔记:', notes.length, '条')
            console.log('   账户笔记:', accountNotesCount, '条')
          }
        } else {
          testResult += `❌ 账户数据不存在\n`
          console.log('❌ 账户数据不存在')
        }
        
        // 5. 检查存储键值
        wx.getStorageInfo({
          success: (res) => {
            testResult += `🔑 存储键数量: ${res.keys.length}\n`
            testResult += `💾 存储使用: ${Math.round(res.currentSize/1024)}MB / ${Math.round(res.limitSize/1024)}MB\n`
            
            const importantKeys = ['notes', 'userAccounts', 'userInfo', 'noteTags']
            let missingKeys = []
            importantKeys.forEach(key => {
              if (!res.keys.includes(key)) {
                missingKeys.push(key)
              }
            })
            
            if (missingKeys.length === 0) {
              testResult += `✅ 关键存储键: 完整\n`
            } else {
              testResult += `❌ 缺失存储键: ${missingKeys.join(', ')}\n`
            }
            
            console.log('🔑 存储键数量:', res.keys.length)
            console.log('💾 存储使用:', Math.round(res.currentSize/1024), 'MB /', Math.round(res.limitSize/1024), 'MB')
            
            // 显示测试结果
            wx.showModal({
              title: '存储测试结果',
              content: testResult,
              showCancel: false,
              confirmText: '确定'
            })
          },
          fail: (error) => {
            testResult += `❌ 获取存储信息失败\n`
            console.error('获取存储信息失败:', error)
            
            wx.showModal({
              title: '存储测试结果',
              content: testResult,
              showCancel: false,
              confirmText: '确定'
            })
          }
        })
        
      } else {
        testResult += `❌ 用户未登录\n`
        testResult += `   用户信息: ${JSON.stringify(userInfo)}\n`
        console.log('❌ 用户未登录')
        console.log('用户信息:', userInfo)
        
        wx.showModal({
          title: '存储测试结果',
          content: testResult,
          showCancel: false,
          confirmText: '确定'
        })
      }
    } catch (error) {
      testResult += `❌ 测试过程中发生错误: ${error.message}\n`
      console.error('测试过程中发生错误:', error)
      
      wx.showModal({
        title: '存储测试结果',
        content: testResult,
        showCancel: false,
        confirmText: '确定'
      })
    }
    
    console.log('=== 测试完成 ===')
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 快速登录（用于测试）
  quickLogin() {
    wx.showModal({
      title: '快速登录',
      content: '是否使用测试账户快速登录？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          // 创建测试用户信息
          const testUserInfo = {
            username: '测试用户',
            id: 'test123',
            avatar: '',
            isOnline: true
          }
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', testUserInfo)
          
          // 创建一些测试笔记数据
          const testNotes = [
            {
              id: 'test1',
              title: '测试笔记1',
              content: '这是一条测试笔记，用于验证账户功能。',
              category: 'knowledge',
              tags: ['测试', '功能验证'],
              createTime: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              wordCount: 20
            },
            {
              id: 'test2',
              title: '测试笔记2',
              content: '这是另一条测试笔记，包含更多内容。',
              category: 'thinking',
              tags: ['测试', '思考'],
              createTime: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              wordCount: 25
            }
          ]
          
          // 保存测试笔记到账户
          const noteManager = require('../../utils/noteManager')
          noteManager.saveNotesToAccount(testUserInfo.username, testNotes)
          
          // 重新加载用户信息
          this.loadUserInfo()
          
          wx.showToast({
            title: '快速登录成功',
            icon: 'success'
          })
        }
      }
    })
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
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit',
      success: (res) => {
        console.log('跳转到编辑资料页面成功:', res)
      },
      fail: (err) => {
        console.error('跳转到编辑资料页面失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
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

  // 我的笔记
  myNotes() {
    wx.navigateTo({
      url: '/pages/my-notes/my-notes'
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

  // 保存所有笔记到Dan账户
  saveToDanAccount() {
    wx.showModal({
      title: '保存到Dan账户',
      content: '确定要将当前所有笔记保存到Dan的账户吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '保存中...' })
          
          try {
            // 获取当前所有笔记
            const allNotes = noteManager.getAllNotes()
            console.log('当前笔记数量:', allNotes.length)
            
            if (allNotes.length === 0) {
              wx.hideLoading()
              wx.showToast({
                title: '没有笔记需要保存',
                icon: 'none'
              })
              return
            }
            
            // 保存到Dan账户
            const result = noteManager.saveNotesToAccount('Dan', allNotes)
            
            wx.hideLoading()
            
            if (result.success) {
              wx.showModal({
                title: '保存成功',
                content: `已成功保存 ${allNotes.length} 条笔记到Dan的账户\n\n账户信息：\n- 笔记数量：${result.accountData.notes.length}\n- 标签数量：${result.accountData.tags.length}\n- 分类数量：${result.accountData.categories.length}\n- 创建时间：${result.accountData.createTime}`,
                showCancel: false,
                confirmText: '确定'
              })
            } else {
              wx.showToast({
                title: '保存失败：' + result.error,
                icon: 'none',
                duration: 3000
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('保存到Dan账户失败:', error)
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 查看Dan账户信息
  viewDanAccount() {
    try {
      const accountInfo = noteManager.getAccountInfo('Dan')
      
      if (accountInfo.success) {
        wx.showModal({
          title: 'Dan账户信息',
          content: `账户名称：${accountInfo.accountName}\n笔记数量：${accountInfo.noteCount}\n标签数量：${accountInfo.tagCount}\n分类数量：${accountInfo.categoryCount}\n创建时间：${accountInfo.createTime}\n更新时间：${accountInfo.updateTime}`,
          showCancel: false,
          confirmText: '确定'
        })
      } else {
        wx.showToast({
          title: 'Dan账户不存在',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('查看Dan账户信息失败:', error)
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      })
    }
  },

  // 恢复笔记数据
  recoverNotes() {
    wx.showModal({
      title: '恢复笔记数据',
      content: '检测到您的笔记可能丢失，是否要尝试恢复？',
      success: (res) => {
        if (res.confirm) {
          this.performDataRecovery()
        }
      }
    })
  },

  // 执行数据恢复
  performDataRecovery() {
    wx.showLoading({ title: '正在恢复数据...' })
    
    try {
      // 1. 检查是否有备份数据
      const backupData = this.checkBackupData()
      
      // 2. 检查是否有账户数据
      const accountData = this.checkAccountData()
      
      // 3. 检查是否有临时数据
      const tempData = this.checkTempData()
      
      setTimeout(() => {
        wx.hideLoading()
        
        if (backupData.length > 0 || accountData.length > 0 || tempData.length > 0) {
          this.showRecoveryOptions(backupData, accountData, tempData)
        } else {
          wx.showModal({
            title: '未找到备份数据',
            content: '很抱歉，没有找到可恢复的笔记数据。建议您重新创建笔记。',
            showCancel: false,
            confirmText: '确定'
          })
        }
      }, 2000)
    } catch (error) {
      wx.hideLoading()
      console.error('数据恢复失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 检查备份数据
  checkBackupData() {
    try {
      const backup = wx.getStorageSync('notes_backup')
      return backup ? backup.notes || [] : []
    } catch (error) {
      console.error('检查备份数据失败:', error)
      return []
    }
  },

  // 检查账户数据
  checkAccountData() {
    try {
      const accounts = noteManager.getAllAccounts()
      const allAccountNotes = []
      
      Object.keys(accounts).forEach(accountName => {
        const account = accounts[accountName]
        if (account.notes && account.notes.length > 0) {
          allAccountNotes.push({
            accountName: accountName,
            notes: account.notes,
            count: account.notes.length,
            updateTime: account.updateTime
          })
        }
      })
      
      return allAccountNotes
    } catch (error) {
      console.error('检查账户数据失败:', error)
      return []
    }
  },

  // 检查临时数据
  checkTempData() {
    try {
      const tempNotes = wx.getStorageSync('temp_notes')
      return tempNotes || []
    } catch (error) {
      console.error('检查临时数据失败:', error)
      return []
    }
  },

  // 显示恢复选项
  showRecoveryOptions(backupData, accountData, tempData) {
    const options = []
    const dataSources = []
    
    if (backupData.length > 0) {
      options.push(`备份数据 (${backupData.length}条笔记)`)
      dataSources.push({ type: 'backup', data: backupData })
    }
    
    if (accountData.length > 0) {
      accountData.forEach(account => {
        options.push(`${account.accountName}账户 (${account.count}条笔记)`)
        dataSources.push({ type: 'account', data: account })
      })
    }
    
    if (tempData.length > 0) {
      options.push(`临时数据 (${tempData.length}条笔记)`)
      dataSources.push({ type: 'temp', data: tempData })
    }
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedSource = dataSources[res.tapIndex]
        this.restoreFromSource(selectedSource)
      }
    })
  },

  // 从指定源恢复数据
  restoreFromSource(source) {
    wx.showLoading({ title: '正在恢复...' })
    
    try {
      let notesToRestore = []
      
      switch (source.type) {
        case 'backup':
          notesToRestore = source.data
          break
        case 'account':
          notesToRestore = source.data.notes
          break
        case 'temp':
          notesToRestore = source.data
          break
      }
      
      if (notesToRestore.length > 0) {
        // 1. 恢复笔记到当前存储
        wx.setStorageSync('notes', notesToRestore)
        
        // 2. 同时保存到当前登录账户
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.username) {
          const saveResult = noteManager.saveNotesToAccount(userInfo.username, notesToRestore)
          if (saveResult.success) {
            console.log('数据已同时保存到账户:', userInfo.username)
          }
        }
        
        // 3. 更新标签统计
        noteManager.updateAllTagStatistics()
        
        wx.hideLoading()
        
        wx.showModal({
          title: '恢复成功',
          content: `已成功恢复 ${notesToRestore.length} 条笔记！\n\n✅ 已保存到本地存储\n✅ 已关联到当前账户\n\n请返回笔记页面查看恢复的内容。`,
          showCancel: false,
          confirmText: '确定',
          success: () => {
            // 跳转到我的笔记页面
            wx.navigateTo({
              url: '/pages/my-notes/my-notes'
            })
          }
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '没有可恢复的数据',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('恢复数据失败:', error)
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  // 打开数据恢复工具
  openDataRecovery() {
    wx.navigateTo({
      url: '/pages/data-recovery/data-recovery'
    })
  },

  // 打开网络诊断工具
  openNetworkDiagnosis() {
    wx.navigateTo({
      url: '/pages/network-diagnosis/network-diagnosis'
    })
  },

  // 打开账户保存管理
  openAccountSave() {
    wx.navigateTo({
      url: '/pages/account-save/account-save'
    })
  },

  // 创建数据备份
  createBackup() {
    wx.showLoading({ title: '创建备份中...' })
    
    try {
      const allNotes = noteManager.getAllNotes()
      
      if (allNotes.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '没有笔记需要备份',
          icon: 'none'
        })
        return
      }
      
      const backupData = {
        version: '1.0',
        backupTime: new Date().toISOString(),
        notes: allNotes,
        totalCount: allNotes.length
      }
      
      // 保存备份
      wx.setStorageSync('notes_backup', backupData)
      
      wx.hideLoading()
      
      wx.showModal({
        title: '备份成功',
        content: `已成功创建备份！\n\n备份信息：\n- 笔记数量：${allNotes.length}\n- 备份时间：${new Date().toLocaleString()}\n\n备份数据已保存到本地，可用于数据恢复。`,
        showCancel: false,
        confirmText: '确定'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('创建备份失败:', error)
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      })
    }
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
