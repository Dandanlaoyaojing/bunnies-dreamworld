// utils/cloudService.js - 云存储服务模块
// 支持微信云开发、阿里云OSS、腾讯云COS等多种云存储方案

class CloudService {
  constructor() {
    this.cloudType = 'wechat' // 默认使用微信云开发
    this.isInitialized = false
    this.syncStatus = {
      isSyncing: false,
      lastSyncTime: null,
      pendingCount: 0
    }
    
    // 初始化云服务
    this.init()
  }

  /**
   * 初始化云服务
   */
  init() {
    try {
      // 检查是否支持云开发
      if (typeof wx !== 'undefined' && wx.cloud) {
        wx.cloud.init({
          env: 'your-cloud-env-id', // 替换为你的云环境ID
          traceUser: true
        })
        this.db = wx.cloud.database()
        this.storage = wx.cloud.storage()
        this.isInitialized = true
        console.log('✅ 微信云开发初始化成功')
      } else {
        console.warn('⚠️ 微信云开发不可用，将使用本地存储')
        this.cloudType = 'local'
      }
    } catch (error) {
      console.error('❌ 云服务初始化失败:', error)
      this.cloudType = 'local'
    }
  }

  /**
   * 上传笔记到云端
   */
  async uploadNote(note) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const noteData = {
        ...note,
        userId: this.getCurrentUserId(),
        uploadTime: new Date(),
        version: 1
      }

      // 上传到云数据库
      const result = await this.db.collection('notes').add({
        data: noteData
      })

      console.log('✅ 笔记上传成功:', result._id)
      return {
        success: true,
        cloudId: result._id,
        note: noteData
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
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const uploadPromises = notes.map(note => this.uploadNote(note))
      const results = await Promise.allSettled(uploadPromises)
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failCount = results.length - successCount

      console.log(`📤 批量上传完成: 成功 ${successCount} 条，失败 ${failCount} 条`)
      
      return {
        success: true,
        totalCount: results.length,
        successCount,
        failCount,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
      }
    } catch (error) {
      console.error('❌ 批量上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从云端下载笔记
   */
  async downloadNotes(userId = null) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const query = this.db.collection('notes')
      if (userId) {
        query.where({ userId: userId })
      } else {
        query.where({ userId: this.getCurrentUserId() })
      }

      const result = await query.get()
      
      console.log(`📥 下载笔记成功: ${result.data.length} 条`)
      return {
        success: true,
        notes: result.data,
        count: result.data.length
      }
    } catch (error) {
      console.error('❌ 下载笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新云端笔记
   */
  async updateNote(cloudId, noteData) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const updateData = {
        ...noteData,
        updateTime: new Date(),
        version: noteData.version ? noteData.version + 1 : 2
      }

      const result = await this.db.collection('notes').doc(cloudId).update({
        data: updateData
      })

      console.log('✅ 笔记更新成功:', cloudId)
      return {
        success: true,
        cloudId: cloudId,
        note: updateData
      }
    } catch (error) {
      console.error('❌ 笔记更新失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除云端笔记
   */
  async deleteNote(cloudId) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      await this.db.collection('notes').doc(cloudId).remove()
      console.log('✅ 笔记删除成功:', cloudId)
      return { success: true, cloudId: cloudId }
    } catch (error) {
      console.error('❌ 笔记删除失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 上传文件到云存储
   */
  async uploadFile(filePath, cloudPath = null) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      if (!cloudPath) {
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 1000)
        const ext = filePath.split('.').pop()
        cloudPath = `notes/${timestamp}-${random}.${ext}`
      }

      const result = await this.storage.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      console.log('✅ 文件上传成功:', result.fileID)
      return {
        success: true,
        fileID: result.fileID,
        cloudPath: cloudPath
      }
    } catch (error) {
      console.error('❌ 文件上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 下载文件从云存储
   */
  async downloadFile(fileID) {
    if (!this.isInitialized || this.cloudType === 'local') {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const result = await this.storage.downloadFile({
        fileID: fileID
      })

      console.log('✅ 文件下载成功:', fileID)
      return {
        success: true,
        tempFilePath: result.tempFilePath,
        fileID: fileID
      }
    } catch (error) {
      console.error('❌ 文件下载失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 同步本地数据到云端
   */
  async syncToCloud() {
    if (this.syncStatus.isSyncing) {
      console.log('⏳ 同步正在进行中，跳过')
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true
    this.syncStatus.pendingCount = 0

    try {
      wx.showLoading({ title: '正在同步到云端...' })

      // 获取本地笔记
      const localNotes = wx.getStorageSync('notes') || []
      console.log(`📤 准备同步 ${localNotes.length} 条笔记到云端`)

      // 检查哪些笔记需要同步
      const notesToSync = localNotes.filter(note => {
        return !note.cloudId || note.isModified || !note.lastSyncTime
      })

      this.syncStatus.pendingCount = notesToSync.length

      if (notesToSync.length === 0) {
        wx.hideLoading()
        this.syncStatus.isSyncing = false
        return { success: true, message: '所有数据已是最新' }
      }

      // 批量上传
      const uploadResult = await this.uploadNotes(notesToSync)

      // 更新本地笔记的云同步状态
      const updatedNotes = localNotes.map(note => {
        if (notesToSync.some(syncNote => syncNote.id === note.id)) {
          return {
            ...note,
            isModified: false,
            lastSyncTime: new Date().toISOString(),
            cloudId: note.cloudId || 'pending'
          }
        }
        return note
      })

      wx.setStorageSync('notes', updatedNotes)

      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.lastSyncTime = new Date().toISOString()
      this.syncStatus.pendingCount = 0

      console.log('✅ 云端同步完成')
      return {
        success: true,
        message: `同步完成，成功 ${uploadResult.successCount} 条`,
        ...uploadResult
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      console.error('❌ 云端同步失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从云端同步到本地
   */
  async syncFromCloud() {
    if (this.syncStatus.isSyncing) {
      console.log('⏳ 同步正在进行中，跳过')
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true

    try {
      wx.showLoading({ title: '正在从云端同步...' })

      // 下载云端笔记
      const downloadResult = await this.downloadNotes()

      if (!downloadResult.success) {
        throw new Error(downloadResult.error)
      }

      // 获取本地笔记
      const localNotes = wx.getStorageSync('notes') || []
      const localNotesMap = new Map(localNotes.map(note => [note.id, note]))

      // 合并云端和本地数据
      const mergedNotes = []
      const cloudNotesMap = new Map(downloadResult.notes.map(note => [note.id, note]))

      // 处理云端笔记
      downloadResult.notes.forEach(cloudNote => {
        const localNote = localNotesMap.get(cloudNote.id)
        
        if (!localNote) {
          // 云端有但本地没有，直接添加
          mergedNotes.push({
            ...cloudNote,
            cloudId: cloudNote._id,
            isFromCloud: true
          })
        } else {
          // 都存在，比较时间戳决定使用哪个版本
          const cloudTime = new Date(cloudNote.updateTime || cloudNote.uploadTime)
          const localTime = new Date(localNote.updateTime || localNote.createTime)
          
          if (cloudTime > localTime && !localNote.isModified) {
            // 云端更新，使用云端版本
            mergedNotes.push({
              ...cloudNote,
              cloudId: cloudNote._id,
              isFromCloud: true
            })
          } else {
            // 本地更新或本地有修改，使用本地版本
            mergedNotes.push({
              ...localNote,
              cloudId: cloudNote._id,
              needsUpload: true
            })
          }
        }
      })

      // 处理仅本地存在的笔记
      localNotes.forEach(localNote => {
        if (!cloudNotesMap.has(localNote.id)) {
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
      this.syncStatus.lastSyncTime = new Date().toISOString()

      console.log(`✅ 云端同步完成，共 ${mergedNotes.length} 条笔记`)
      return {
        success: true,
        message: `同步完成，共 ${mergedNotes.length} 条笔记`,
        noteCount: mergedNotes.length,
        newNotes: mergedNotes.filter(note => note.isFromCloud).length,
        updatedNotes: mergedNotes.filter(note => note.needsUpload).length
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      console.error('❌ 云端同步失败:', error)
      return { success: false, error: error.message }
    }
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
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      ...this.syncStatus,
      isCloudAvailable: this.isInitialized && this.cloudType !== 'local',
      cloudType: this.cloudType
    }
  }

  /**
   * 检查网络连接
   */
  async checkNetworkConnection() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none'
          resolve({
            isConnected,
            networkType: res.networkType
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown'
          })
        }
      })
    })
  }

  /**
   * 智能同步（根据网络状态和用户行为）
   */
  async smartSync() {
    const networkStatus = await this.checkNetworkConnection()
    
    if (!networkStatus.isConnected) {
      console.log('📱 网络未连接，跳过同步')
      return { success: false, error: '网络未连接' }
    }

    if (networkStatus.networkType === 'wifi') {
      // WiFi环境，执行完整同步
      return await this.fullSync()
    } else {
      // 移动网络，只同步重要数据
      return await this.quickSync()
    }
  }

  /**
   * 完整同步
   */
  async fullSync() {
    console.log('🔄 执行完整同步')
    const fromCloud = await this.syncFromCloud()
    if (fromCloud.success) {
      return await this.syncToCloud()
    }
    return fromCloud
  }

  /**
   * 快速同步（仅同步修改的数据）
   */
  async quickSync() {
    console.log('⚡ 执行快速同步')
    return await this.syncToCloud()
  }

  /**
   * 设置云环境ID
   */
  setCloudEnvId(envId) {
    if (typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({
        env: envId,
        traceUser: true
      })
      this.db = wx.cloud.database()
      this.storage = wx.cloud.storage()
      this.isInitialized = true
      console.log('✅ 云环境设置成功:', envId)
    }
  }
}

// 创建单例实例
const cloudService = new CloudService()

module.exports = cloudService
