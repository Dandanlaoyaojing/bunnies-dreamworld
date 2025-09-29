// utils/aliyunService.js - 阿里云云存储服务模块
// 基于阿里云服务器和域名的完整云存储解决方案

class AliyunService {
  constructor() {
    // 阿里云服务配置
    this.config = {
      // 服务器配置 - 从本地存储加载或使用默认值
      serverUrl: this.loadServerUrl(),
      apiVersion: 'v1',
      timeout: 10000
    }
    
    // 同步状态
    this.syncStatus = {
      isSyncing: false,
      lastSyncTime: null,
      pendingCount: 0,
      isOnline: false
    }
    
    // 缓存配置
    this.cache = {
      maxSize: 50, // 最大缓存笔记数
      ttl: 24 * 60 * 60 * 1000 // 24小时过期
    }
    
    this.init()
  }

  /**
   * 初始化服务
   */
  init() {
    // 检查网络状态
    this.checkNetworkStatus()
    
    // 设置定时同步
    this.setupAutoSync()
    
    console.log('✅ 阿里云服务初始化完成')
    console.log('🔗 服务器地址:', this.config.serverUrl)
  }

  /**
   * 加载服务器URL配置
   */
  loadServerUrl() {
    try {
      const savedUrl = wx.getStorageSync('serverUrl')
      if (savedUrl && savedUrl.trim()) {
        return savedUrl.trim()
      }
    } catch (error) {
      console.warn('读取服务器URL配置失败:', error)
    }
    
    // 返回默认值
    return 'https://your-domain.com' // 需要替换为你的实际域名
  }

  /**
   * 检查网络状态
   */
  async checkNetworkStatus() {
    try {
      const networkInfo = await this.getNetworkType()
      this.syncStatus.isOnline = networkInfo.networkType !== 'none'
      console.log('📱 网络状态:', networkInfo.networkType, this.syncStatus.isOnline ? '在线' : '离线')
    } catch (error) {
      console.error('网络状态检查失败:', error)
      this.syncStatus.isOnline = false
    }
  }

  /**
   * 获取网络类型
   */
  getNetworkType() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: (res) => resolve(res),
        fail: (error) => reject(error)
      })
    })
  }

  /**
   * 设置自动同步
   */
  setupAutoSync() {
    // 每5分钟检查一次同步状态
    setInterval(() => {
      this.checkSyncStatus()
    }, 5 * 60 * 1000)
    
    // 应用启动时同步
    wx.onAppShow(() => {
      setTimeout(() => {
        this.autoSync()
      }, 2000)
    })
  }

  /**
   * 检查同步状态
   */
  checkSyncStatus() {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) {
      return
    }

    // 检查是否有待同步的数据
    const localNotes = wx.getStorageSync('notes') || []
    const pendingNotes = localNotes.filter(note => 
      note.isModified || !note.lastSyncTime || (note.lastSyncTime && 
      new Date() - new Date(note.lastSyncTime) > this.cache.ttl)
    )

    if (pendingNotes.length > 0) {
      console.log(`🔄 发现 ${pendingNotes.length} 条待同步笔记`)
      this.autoSync()
    }
  }

  /**
   * 自动同步
   */
  async autoSync() {
    if (!this.syncStatus.isOnline) {
      console.log('📱 离线状态，跳过自动同步')
      return
    }

    try {
      // 先从云端拉取最新数据
      await this.syncFromServer()
      
      // 再推送本地修改
      await this.syncToServer()
    } catch (error) {
      console.error('自动同步失败:', error)
    }
  }

  /**
   * 上传笔记到服务器
   */
  async uploadNote(note) {
    try {
      const requestData = {
        method: 'POST',
        url: `${this.config.serverUrl}/api/${this.config.apiVersion}/notes`,
        data: {
          ...note,
          userId: this.getCurrentUserId(),
          timestamp: Date.now(),
          deviceInfo: await this.getDeviceInfo()
        },
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthToken()
        },
        timeout: this.config.timeout
      }

      const result = await this.request(requestData)
      
      if (result.success) {
        console.log('✅ 笔记上传成功:', result.data.noteId)
        return {
          success: true,
          serverId: result.data.noteId,
          note: result.data.note
        }
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (error) {
      console.error('❌ 笔记上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 批量上传笔记
   */
  async uploadNotes(notes) {
    if (!this.syncStatus.isOnline) {
      return { success: false, error: '网络未连接' }
    }

    this.syncStatus.isSyncing = true
    this.syncStatus.pendingCount = notes.length

    try {
      wx.showLoading({ title: `正在上传 ${notes.length} 条笔记...` })

      const uploadPromises = notes.map(note => this.uploadNote(note))
      const results = await Promise.allSettled(uploadPromises)
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failCount = results.length - successCount

      // 更新本地笔记的同步状态
      const localNotes = wx.getStorageSync('notes') || []
      const updatedNotes = localNotes.map(localNote => {
        const result = results.find(r => 
          r.status === 'fulfilled' && 
          r.value.success && 
          r.value.note && 
          r.value.note.id === localNote.id
        )
        
        if (result) {
          return {
            ...localNote,
            serverId: result.value.serverId,
            isModified: false,
            lastSyncTime: new Date().toISOString()
          }
        }
        return localNote
      })

      wx.setStorageSync('notes', updatedNotes)

      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.pendingCount = 0
      this.syncStatus.lastSyncTime = new Date().toISOString()

      console.log(`📤 批量上传完成: 成功 ${successCount} 条，失败 ${failCount} 条`)
      
      return {
        success: true,
        totalCount: results.length,
        successCount,
        failCount
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.pendingCount = 0
      console.error('❌ 批量上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从服务器下载笔记
   */
  async downloadNotes(userId = null) {
    if (!this.syncStatus.isOnline) {
      return { success: false, error: '网络未连接' }
    }

    try {
      const requestData = {
        method: 'GET',
        url: `${this.config.serverUrl}/api/${this.config.apiVersion}/notes`,
        data: {
          userId: userId || this.getCurrentUserId(),
          lastSyncTime: this.syncStatus.lastSyncTime
        },
        header: {
          'Authorization': this.getAuthToken()
        },
        timeout: this.config.timeout
      }

      const result = await this.request(requestData)
      
      if (result.success) {
        console.log(`📥 下载笔记成功: ${result.data.notes.length} 条`)
        return {
          success: true,
          notes: result.data.notes,
          count: result.data.notes.length,
          lastSyncTime: result.data.lastSyncTime
        }
      } else {
        throw new Error(result.message || '下载失败')
      }
    } catch (error) {
      console.error('❌ 下载笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新服务器上的笔记
   */
  async updateNote(serverId, noteData) {
    try {
      const requestData = {
        method: 'PUT',
        url: `${this.config.serverUrl}/api/${this.config.apiVersion}/notes/${serverId}`,
        data: {
          ...noteData,
          timestamp: Date.now()
        },
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthToken()
        },
        timeout: this.config.timeout
      }

      const result = await this.request(requestData)
      
      if (result.success) {
        console.log('✅ 笔记更新成功:', serverId)
        return {
          success: true,
          serverId: serverId,
          note: result.data.note
        }
      } else {
        throw new Error(result.message || '更新失败')
      }
    } catch (error) {
      console.error('❌ 笔记更新失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除服务器上的笔记
   */
  async deleteNote(serverId) {
    try {
      const requestData = {
        method: 'DELETE',
        url: `${this.config.serverUrl}/api/${this.config.apiVersion}/notes/${serverId}`,
        header: {
          'Authorization': this.getAuthToken()
        },
        timeout: this.config.timeout
      }

      const result = await this.request(requestData)
      
      if (result.success) {
        console.log('✅ 笔记删除成功:', serverId)
        return { success: true, serverId: serverId }
      } else {
        throw new Error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('❌ 笔记删除失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 上传文件到服务器
   */
  async uploadFile(filePath, fileName = null) {
    try {
      // 先上传到微信临时文件
      const uploadResult = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${this.config.serverUrl}/api/${this.config.apiVersion}/files`,
          filePath: filePath,
          name: 'file',
          header: {
            'Authorization': this.getAuthToken()
          },
          formData: {
            fileName: fileName || `file_${Date.now()}`,
            userId: this.getCurrentUserId()
          },
          success: resolve,
          fail: reject
        })
      })

      if (uploadResult.statusCode === 200) {
        const result = JSON.parse(uploadResult.data)
        console.log('✅ 文件上传成功:', result.fileId)
        return {
          success: true,
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: result.fileName
        }
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      console.error('❌ 文件上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从服务器下载文件
   */
  async downloadFile(fileId, fileName) {
    try {
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: `${this.config.serverUrl}/api/${this.config.apiVersion}/files/${fileId}`,
          header: {
            'Authorization': this.getAuthToken()
          },
          success: resolve,
          fail: reject
        })
      })

      if (downloadResult.statusCode === 200) {
        console.log('✅ 文件下载成功:', fileId)
        return {
          success: true,
          tempFilePath: downloadResult.tempFilePath,
          fileId: fileId
        }
      } else {
        throw new Error('下载失败')
      }
    } catch (error) {
      console.error('❌ 文件下载失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 同步本地数据到服务器
   */
  async syncToServer() {
    if (!this.syncStatus.isOnline) {
      return { success: false, error: '网络未连接' }
    }

    if (this.syncStatus.isSyncing) {
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true

    try {
      // 获取需要同步的笔记
      const localNotes = wx.getStorageSync('notes') || []
      const notesToSync = localNotes.filter(note => 
        note.isModified || !note.lastSyncTime || 
        (note.lastSyncTime && new Date() - new Date(note.lastSyncTime) > this.cache.ttl)
      )

      if (notesToSync.length === 0) {
        this.syncStatus.isSyncing = false
        return { success: true, message: '所有数据已是最新' }
      }

      console.log(`📤 准备同步 ${notesToSync.length} 条笔记到服务器`)
      return await this.uploadNotes(notesToSync)
    } catch (error) {
      this.syncStatus.isSyncing = false
      console.error('❌ 同步到服务器失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从服务器同步到本地
   */
  async syncFromServer() {
    if (!this.syncStatus.isOnline) {
      return { success: false, error: '网络未连接' }
    }

    if (this.syncStatus.isSyncing) {
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true

    try {
      wx.showLoading({ title: '正在从服务器同步...' })

      // 下载服务器笔记
      const downloadResult = await this.downloadNotes()

      if (!downloadResult.success) {
        throw new Error(downloadResult.error)
      }

      // 获取本地笔记
      const localNotes = wx.getStorageSync('notes') || []
      const localNotesMap = new Map(localNotes.map(note => [note.id, note]))

      // 合并数据
      const mergedNotes = []
      const serverNotesMap = new Map(downloadResult.notes.map(note => [note.id, note]))

      // 处理服务器笔记
      downloadResult.notes.forEach(serverNote => {
        const localNote = localNotesMap.get(serverNote.id)
        
        if (!localNote) {
          // 服务器有但本地没有，直接添加
          mergedNotes.push({
            ...serverNote,
            serverId: serverNote.serverId || serverNote.id,
            isFromServer: true,
            lastSyncTime: new Date().toISOString()
          })
        } else {
          // 都存在，比较时间戳
          const serverTime = new Date(serverNote.updateTime || serverNote.createTime)
          const localTime = new Date(localNote.updateTime || localNote.createTime)
          
          if (serverTime > localTime && !localNote.isModified) {
            // 服务器更新，使用服务器版本
            mergedNotes.push({
              ...serverNote,
              serverId: serverNote.serverId || serverNote.id,
              isFromServer: true,
              lastSyncTime: new Date().toISOString()
            })
          } else {
            // 本地更新，使用本地版本
            mergedNotes.push({
              ...localNote,
              needsUpload: true
            })
          }
        }
      })

      // 处理仅本地存在的笔记
      localNotes.forEach(localNote => {
        if (!serverNotesMap.has(localNote.id)) {
          mergedNotes.push({
            ...localNote,
            needsUpload: true
          })
        }
      })

      // 保存合并后的数据
      wx.setStorageSync('notes', mergedNotes)

      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.lastSyncTime = downloadResult.lastSyncTime || new Date().toISOString()

      console.log(`✅ 服务器同步完成，共 ${mergedNotes.length} 条笔记`)
      return {
        success: true,
        message: `同步完成，共 ${mergedNotes.length} 条笔记`,
        noteCount: mergedNotes.length,
        newNotes: mergedNotes.filter(note => note.isFromServer).length,
        updatedNotes: mergedNotes.filter(note => note.needsUpload).length
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      console.error('❌ 服务器同步失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 完整同步（双向）
   */
  async fullSync() {
    console.log('🔄 执行完整同步')
    
    // 先从服务器拉取
    const fromServer = await this.syncFromServer()
    if (!fromServer.success) {
      return fromServer
    }
    
    // 再推送到服务器
    return await this.syncToServer()
  }

  /**
   * 网络请求封装
   */
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }

  /**
   * 获取当前用户ID
   */
  getCurrentUserId() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo ? userInfo.username : 'anonymous'
    } catch (error) {
      return 'anonymous'
    }
  }

  /**
   * 获取认证令牌
   */
  getAuthToken() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo ? `Bearer ${userInfo.token || userInfo.username}` : ''
    } catch (error) {
      return ''
    }
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    return new Promise((resolve) => {
      wx.getSystemInfo({
        success: (res) => {
          resolve({
            platform: res.platform,
            system: res.system,
            version: res.version,
            model: res.model,
            screenWidth: res.screenWidth,
            screenHeight: res.screenHeight
          })
        },
        fail: () => {
          resolve({})
        }
      })
    })
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      ...this.syncStatus,
      isServerAvailable: this.syncStatus.isOnline,
      serverUrl: this.config.serverUrl
    }
  }

  /**
   * 设置服务器URL
   */
  setServerUrl(url) {
    this.config.serverUrl = url
    console.log('✅ 服务器URL设置成功:', url)
  }

  /**
   * 测试服务器连接
   */
  async testConnection() {
    try {
      const requestData = {
        method: 'GET',
        url: `${this.config.serverUrl}/api/${this.config.apiVersion}/health`,
        timeout: 10000,
        header: {
          'Content-Type': 'application/json'
        }
      }

      console.log('🔍 测试服务器连接:', requestData.url)
      
      const result = await this.requestWithDetails(requestData)
      
      console.log('📡 服务器响应:', result)
      
      if (result.success && result.data && result.data.success) {
        console.log('✅ 服务器连接测试成功')
        return { 
          success: true, 
          message: '服务器连接正常',
          serverInfo: result.data
        }
      } else {
        const errorMsg = result.data ? result.data.message : '服务器响应异常'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('❌ 服务器连接测试失败:', error)
      return { 
        success: false, 
        error: error.message,
        serverUrl: this.config.serverUrl
      }
    }
  }

  /**
   * 带详细信息的网络请求
   */
  requestWithDetails(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: (res) => {
          console.log('📡 请求成功:', {
            statusCode: res.statusCode,
            data: res.data,
            header: res.header
          })
          
          if (res.statusCode === 200) {
            resolve({
              success: true,
              statusCode: res.statusCode,
              data: res.data,
              header: res.header
            })
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              data: res.data,
              error: `HTTP ${res.statusCode}`
            })
          }
        },
        fail: (error) => {
          console.error('📡 请求失败:', error)
          reject(new Error(`网络请求失败: ${error.errMsg || error.message}`))
        }
      })
    })
  }
}

// 创建单例实例
const aliyunService = new AliyunService()

module.exports = aliyunService
