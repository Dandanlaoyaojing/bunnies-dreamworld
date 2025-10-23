// 云同步服务
// 处理本地数据与云端数据的同步逻辑

const apiService = require('./apiService.js')

class SyncService {
  constructor() {
    this.isSyncing = false
    this.lastSyncTime = null
    this.syncStatus = 'idle' // idle, syncing, success, error
    this.loadSyncConfig()
  }

  /**
   * 加载同步配置
   */
  loadSyncConfig() {
    try {
      const syncConfig = wx.getStorageSync('syncConfig')
      if (syncConfig) {
        this.lastSyncTime = syncConfig.lastSyncTime
        this.syncStatus = syncConfig.syncStatus || 'idle'
      }
    } catch (err) {
      console.error('加载同步配置失败:', err)
    }
  }

  /**
   * 保存同步配置
   */
  saveSyncConfig() {
    try {
      const syncConfig = {
        lastSyncTime: this.lastSyncTime,
        syncStatus: this.syncStatus,
        updatedAt: new Date().toISOString()
      }
      wx.setStorageSync('syncConfig', syncConfig)
    } catch (err) {
      console.error('保存同步配置失败:', err)
    }
  }

  /**
   * 获取本地数据
   */
  getLocalData() {
    try {
      const notes = wx.getStorageSync('notes') || []
      const tags = wx.getStorageSync('tags') || []
      const drafts = wx.getStorageSync('drafts') || []
      
      return {
        notes: notes.filter(note => !note.is_deleted),
        tags,
        drafts
      }
    } catch (err) {
      console.error('获取本地数据失败:', err)
      return { notes: [], tags: [], drafts: [] }
    }
  }

  /**
   * 保存本地数据
   */
  saveLocalData(data) {
    try {
      if (data.notes) {
        wx.setStorageSync('notes', data.notes)
      }
      if (data.tags) {
        wx.setStorageSync('tags', data.tags)
      }
      if (data.drafts) {
        wx.setStorageSync('drafts', data.drafts)
      }
      console.log('✅ 本地数据保存成功')
    } catch (err) {
      console.error('保存本地数据失败:', err)
    }
  }

  /**
   * 合并数据（处理冲突）
   */
  mergeData(localData, serverData) {
    const merged = {
      notes: [...localData.notes],
      tags: [...localData.tags],
      drafts: [...localData.drafts]
    }

    // 合并笔记数据
    if (serverData.notes) {
      serverData.notes.forEach(serverNote => {
        const localIndex = merged.notes.findIndex(note => note.id === serverNote.id)
        if (localIndex >= 0) {
          // 存在冲突，使用服务器版本（更新时间的）
          const localNote = merged.notes[localIndex]
          if (new Date(serverNote.updated_at) > new Date(localNote.updated_at)) {
            merged.notes[localIndex] = serverNote
            console.log(`📝 笔记 ${serverNote.id} 使用服务器版本`)
          }
        } else {
          // 新笔记，直接添加
          merged.notes.push(serverNote)
          console.log(`📝 添加新笔记 ${serverNote.id}`)
        }
      })
    }

    // 合并标签数据
    if (serverData.tags) {
      serverData.tags.forEach(serverTag => {
        const localIndex = merged.tags.findIndex(tag => tag.id === serverTag.id)
        if (localIndex >= 0) {
          // 更新使用次数
          merged.tags[localIndex].use_count = Math.max(
            merged.tags[localIndex].use_count || 0,
            serverTag.use_count || 0
          )
        } else {
          merged.tags.push(serverTag)
        }
      })
    }

    // 合并草稿数据
    if (serverData.drafts) {
      serverData.drafts.forEach(serverDraft => {
        const localIndex = merged.drafts.findIndex(draft => draft.id === serverDraft.id)
        if (localIndex >= 0) {
          // 使用最新的版本
          const localDraft = merged.drafts[localIndex]
          if (new Date(serverDraft.updated_at) > new Date(localDraft.updated_at)) {
            merged.drafts[localIndex] = serverDraft
          }
        } else {
          merged.drafts.push(serverDraft)
        }
      })
    }

    return merged
  }

  /**
   * 上传数据到云端
   */
  async uploadToCloud() {
    try {
      console.log('🔄 开始上传数据到云端...')
      this.syncStatus = 'syncing'
      this.isSyncing = true

      const localData = this.getLocalData()
      
      const uploadData = {
        notes: localData.notes,
        tags: localData.tags,
        drafts: localData.drafts,
        lastSyncTime: this.lastSyncTime
      }

      const result = await apiService.syncUpload(uploadData)
      
      if (result.success) {
        this.lastSyncTime = result.data.syncTime
        this.syncStatus = 'success'
        this.saveSyncConfig()
        
        console.log('✅ 数据上传成功:', result.data.results)
        return {
          success: true,
          message: '数据上传成功',
          data: result.data
        }
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (err) {
      console.error('❌ 数据上传失败:', err)
      this.syncStatus = 'error'
      this.saveSyncConfig()
      
      return {
        success: false,
        message: err.message || '上传失败',
        error: err
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 从云端下载数据
   */
  async downloadFromCloud() {
    try {
      console.log('🔄 开始从云端下载数据...')
      this.syncStatus = 'syncing'
      this.isSyncing = true

      const result = await apiService.syncDownload({
        lastSyncTime: this.lastSyncTime
      })

      if (result.success) {
        const serverData = result.data.data
        const localData = this.getLocalData()
        
        // 合并数据
        const mergedData = this.mergeData(localData, serverData)
        
        // 保存到本地
        this.saveLocalData(mergedData)
        
        this.lastSyncTime = result.data.syncTime
        this.syncStatus = 'success'
        this.saveSyncConfig()
        
        console.log('✅ 数据下载成功:', {
          notes: result.data.totalNotes,
          tags: result.data.totalTags,
          drafts: result.data.totalDrafts
        })
        
        return {
          success: true,
          message: '数据下载成功',
          data: {
            ...result.data,
            mergedData
          }
        }
      } else {
        throw new Error(result.message || '下载失败')
      }
    } catch (err) {
      console.error('❌ 数据下载失败:', err)
      this.syncStatus = 'error'
      this.saveSyncConfig()
      
      return {
        success: false,
        message: err.message || '下载失败',
        error: err
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 智能同步（自动判断上传或下载）
   */
  async smartSync() {
    try {
      console.log('🔄 开始智能同步...')
      
      // 检查是否有更新
      const updateResult = await this.checkUpdates()
      if (!updateResult.success) {
        return updateResult
      }

      const hasUpdates = updateResult.data.hasUpdates
      const localData = this.getLocalData()
      const hasLocalChanges = this.hasLocalChanges()

      if (hasUpdates && hasLocalChanges) {
        // 双向都有变化，需要处理冲突
        console.log('⚠️ 检测到冲突，需要手动处理')
        return {
          success: false,
          message: '检测到数据冲突，请手动处理',
          conflict: true,
          localChanges: hasLocalChanges,
          serverUpdates: hasUpdates
        }
      } else if (hasUpdates) {
        // 只有服务器有更新，下载
        console.log('📥 服务器有更新，开始下载...')
        return await this.downloadFromCloud()
      } else if (hasLocalChanges) {
        // 只有本地有变化，上传
        console.log('📤 本地有变化，开始上传...')
        return await this.uploadToCloud()
      } else {
        // 没有变化
        console.log('✅ 数据已是最新')
        return {
          success: true,
          message: '数据已是最新',
          upToDate: true
        }
      }
    } catch (err) {
      console.error('❌ 智能同步失败:', err)
      return {
        success: false,
        message: err.message || '同步失败',
        error: err
      }
    }
  }

  /**
   * 检查更新
   */
  async checkUpdates() {
    try {
      const result = await apiService.checkUpdates(this.lastSyncTime)
      return {
        success: true,
        data: result.data
      }
    } catch (err) {
      console.error('❌ 检查更新失败:', err)
      return {
        success: false,
        message: err.message || '检查更新失败',
        error: err
      }
    }
  }

  /**
   * 检查本地是否有变化
   */
  hasLocalChanges() {
    try {
      const localData = this.getLocalData()
      const lastSync = this.lastSyncTime
      
      if (!lastSync) {
        return localData.notes.length > 0 || localData.tags.length > 0 || localData.drafts.length > 0
      }

      const lastSyncTime = new Date(lastSync)
      
      // 检查笔记是否有更新
      const hasNoteChanges = localData.notes.some(note => 
        new Date(note.updated_at || note.created_at) > lastSyncTime
      )
      
      // 检查标签是否有更新
      const hasTagChanges = localData.tags.some(tag => 
        new Date(tag.created_at) > lastSyncTime
      )
      
      // 检查草稿是否有更新
      const hasDraftChanges = localData.drafts.some(draft => 
        new Date(draft.updated_at || draft.created_at) > lastSyncTime
      )

      return hasNoteChanges || hasTagChanges || hasDraftChanges
    } catch (err) {
      console.error('检查本地变化失败:', err)
      return false
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    try {
      const result = await apiService.getSyncStatus()
      return {
        success: true,
        data: {
          ...result.data,
          localStatus: {
            lastSyncTime: this.lastSyncTime,
            syncStatus: this.syncStatus,
            isSyncing: this.isSyncing,
            hasLocalChanges: this.hasLocalChanges()
          }
        }
      }
    } catch (err) {
      console.error('❌ 获取同步状态失败:', err)
      return {
        success: false,
        message: err.message || '获取状态失败',
        error: err
      }
    }
  }

  /**
   * 解决冲突
   */
  async resolveConflict(conflictType, localData, serverData, resolution) {
    try {
      const conflictData = {
        conflictType,
        localData,
        serverData,
        resolution
      }

      const result = await apiService.resolveConflict(conflictData)
      
      if (result.success) {
        // 更新本地数据
        if (conflictType === 'note') {
          const notes = wx.getStorageSync('notes') || []
          const noteIndex = notes.findIndex(note => note.id === localData.id)
          if (noteIndex >= 0) {
            notes[noteIndex] = result.data.resolvedData
            wx.setStorageSync('notes', notes)
          }
        }
        
        return {
          success: true,
          message: '冲突解决成功',
          data: result.data
        }
      } else {
        throw new Error(result.message || '冲突解决失败')
      }
    } catch (err) {
      console.error('❌ 解决冲突失败:', err)
      return {
        success: false,
        message: err.message || '解决冲突失败',
        error: err
      }
    }
  }

  /**
   * 强制同步（忽略冲突）
   */
  async forceSync() {
    try {
      console.log('🔄 开始强制同步...')
      
      // 先下载服务器数据
      const downloadResult = await this.downloadFromCloud()
      if (!downloadResult.success) {
        return downloadResult
      }

      // 再上传本地数据
      const uploadResult = await this.uploadToCloud()
      if (!uploadResult.success) {
        return uploadResult
      }

      return {
        success: true,
        message: '强制同步完成',
        data: {
          download: downloadResult.data,
          upload: uploadResult.data
        }
      }
    } catch (err) {
      console.error('❌ 强制同步失败:', err)
      return {
        success: false,
        message: err.message || '强制同步失败',
        error: err
      }
    }
  }

  /**
   * 重置同步状态
   */
  resetSyncStatus() {
    this.lastSyncTime = null
    this.syncStatus = 'idle'
    this.isSyncing = false
    this.saveSyncConfig()
    console.log('✅ 同步状态已重置')
  }
}

// 创建单例实例
const syncService = new SyncService()

module.exports = syncService

