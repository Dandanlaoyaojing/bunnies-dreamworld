// utils/draftCloudService.js - 草稿箱云存储服务
const apiService = require('./apiService.js')
const noteManager = require('./noteManager.js')

class DraftCloudService {
  constructor() {
    this.isInitialized = false
    this.syncStatus = {
      isSyncing: false,
      lastSyncTime: null,
      pendingCount: 0
    }
    this.cloudType = 'api' // 强制使用API服务器模式，不使用微信云开发
    
    // 直接初始化为API模式，跳过微信云开发
    this.isInitialized = true
    console.log('✅ 草稿云存储服务已初始化为API服务器模式')
  }

  /**
   * 初始化云服务（已简化为API模式）
   */
  init() {
    // 已强制使用API模式，无需初始化微信云开发
    console.log('📡 使用API服务器模式，跳过微信云开发初始化')
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo || null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 解析tags字段（JSON字符串转数组）
   */
  parseTags(tagsString) {
    try {
      if (typeof tagsString === 'string') {
        // 如果是JSON字符串，解析为数组
        const parsed = JSON.parse(tagsString)
        return Array.isArray(parsed) ? parsed : []
      } else if (Array.isArray(tagsString)) {
        // 如果已经是数组，直接返回
        return tagsString
      } else {
        // 其他情况返回空数组
        return []
      }
    } catch (error) {
      console.warn('解析tags失败:', error, '原始数据:', tagsString)
      return []
    }
  }

  /**
   * 上传草稿到云端
   */
  async uploadDraft(draft) {
    if (!this.isInitialized) {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const user = this.getCurrentUser()
      if (!user) {
        return { success: false, error: '用户未登录' }
      }

      const draftData = {
        ...draft,
        userId: user.username,
        uploadTime: new Date().toISOString(),
        version: 1,
        isCloudDraft: true
      }

      if (this.cloudType === 'wechat') {
        // 使用微信云开发
        const result = await this.db.collection('drafts').add({
          data: draftData
        })

        console.log('✅ 草稿上传到微信云成功:', result._id)
        return {
          success: true,
          cloudId: result._id,
          draft: draftData
        }
      } else {
        // 使用API服务器
        const result = await apiService.createDraft(draftData)
        
        if (result.success) {
          console.log('✅ 草稿上传到API服务器成功:', result.data.id)
          return {
            success: true,
            cloudId: result.data.id,
            draft: draftData
          }
        } else {
          throw new Error(result.error || '上传失败')
        }
      }
    } catch (error) {
      console.error('❌ 草稿上传失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从云端下载草稿
   */
  async downloadDrafts() {
    if (!this.isInitialized) {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const user = this.getCurrentUser()
      if (!user) {
        return { success: false, error: '用户未登录' }
      }

      if (this.cloudType === 'wechat') {
        // 使用微信云开发
        const result = await this.db.collection('drafts')
          .where({ userId: user.username })
          .get()

        console.log(`📥 从微信云下载草稿成功: ${result.data.length} 条`)
        return {
          success: true,
          drafts: result.data,
          count: result.data.length
        }
      } else {
        // 使用API服务器
        const result = await apiService.getDrafts()
        
        console.log('API服务器响应:', result)
        
        if (result.success) {
          // 处理新的数据结构：data是对象，包含drafts数组和pagination
          const responseData = result.data || {}
          const draftsArray = responseData.drafts || []
          
          console.log('响应数据结构:', {
            hasData: !!result.data,
            dataType: typeof result.data,
            hasDrafts: !!responseData.drafts,
            draftsType: typeof responseData.drafts,
            isDraftsArray: Array.isArray(responseData.drafts),
            draftsLength: draftsArray.length,
            hasPagination: !!responseData.pagination
          })
          
          // 解析tags字段并统一字段名
          const processedDrafts = draftsArray.map(draft => ({
            ...draft,
            tags: this.parseTags(draft.tags),
            // 统一字段名映射
            createTime: draft.created_at,
            updateTime: draft.updated_at,
            userId: draft.user_id,
            wordCount: draft.word_count
          }))
          
          console.log(`📥 从API服务器下载草稿成功: ${processedDrafts.length} 条`)
          console.log('处理后的草稿数据:', processedDrafts)
          
          return {
            success: true,
            drafts: processedDrafts,
            count: processedDrafts.length,
            pagination: responseData.pagination
          }
        } else {
          throw new Error(result.error || '下载失败')
        }
      }
    } catch (error) {
      console.error('❌ 草稿下载失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新云端草稿
   */
  async updateDraft(cloudId, draftData) {
    if (!this.isInitialized) {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      const user = this.getCurrentUser()
      if (!user) {
        return { success: false, error: '用户未登录' }
      }

      const updateData = {
        ...draftData,
        updateTime: new Date().toISOString(),
        version: draftData.version ? draftData.version + 1 : 2
      }

      if (this.cloudType === 'wechat') {
        // 使用微信云开发
        await this.db.collection('drafts').doc(cloudId).update({
          data: updateData
        })

        console.log('✅ 草稿更新到微信云成功:', cloudId)
        return {
          success: true,
          cloudId: cloudId,
          draft: updateData
        }
      } else {
        // 使用API服务器
        const result = await apiService.updateDraft(cloudId, updateData)
        
        if (result.success) {
          console.log('✅ 草稿更新到API服务器成功:', cloudId)
          return {
            success: true,
            cloudId: cloudId,
            draft: updateData
          }
        } else {
          throw new Error(result.error || '更新失败')
        }
      }
    } catch (error) {
      console.error('❌ 草稿更新失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除云端草稿
   */
  async deleteDraft(cloudId) {
    if (!this.isInitialized) {
      return { success: false, error: '云服务未初始化' }
    }

    try {
      if (this.cloudType === 'wechat') {
        // 使用微信云开发
        await this.db.collection('drafts').doc(cloudId).remove()
        console.log('✅ 草稿从微信云删除成功:', cloudId)
      } else {
        // 使用API服务器
        const result = await apiService.deleteDraft(cloudId)
        
        if (!result.success) {
          throw new Error(result.error || '删除失败')
        }
        console.log('✅ 草稿从API服务器删除成功:', cloudId)
      }

      return { success: true, cloudId: cloudId }
    } catch (error) {
      console.error('❌ 草稿删除失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 同步本地草稿到云端
   */
  async syncDraftsToCloud() {
    if (this.syncStatus.isSyncing) {
      console.log('⏳ 草稿同步正在进行中，跳过')
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true

    try {
      wx.showLoading({ title: '正在同步草稿到云端...' })

      const user = this.getCurrentUser()
      if (!user) {
        wx.hideLoading()
        this.syncStatus.isSyncing = false
        return { success: false, error: '用户未登录' }
      }

      // 获取本地草稿
      const localDrafts = noteManager.getAccountStorage('drafts', [])
      console.log(`📤 准备同步 ${localDrafts.length} 条草稿到云端`)

      if (localDrafts.length === 0) {
        wx.hideLoading()
        this.syncStatus.isSyncing = false
        return { success: true, message: '没有需要同步的草稿' }
      }

      // 批量同步到云端
      let successCount = 0
      let failCount = 0

      for (const draft of localDrafts) {
        try {
          if (draft.cloudId) {
            // 更新现有草稿
            await this.updateDraft(draft.cloudId, draft)
          } else {
            // 创建新草稿
            const result = await this.uploadDraft(draft)
            if (result.success && result.cloudId) {
              draft.cloudId = result.cloudId
            }
          }
          
          draft.lastSyncTime = new Date().toISOString()
          draft.isSynced = true
          successCount++
        } catch (err) {
          console.error('同步草稿失败:', err)
          failCount++
        }
      }

      // 更新本地草稿
      noteManager.setAccountStorage('drafts', localDrafts)

      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.lastSyncTime = new Date().toISOString()
      this.syncStatus.pendingCount = 0

      console.log(`✅ 草稿云端同步完成: 成功 ${successCount} 条，失败 ${failCount} 条`)
      
      return {
        success: true,
        message: `同步完成，成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}`,
        successCount,
        failCount,
        totalCount: localDrafts.length
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      console.error('❌ 草稿云端同步失败:', error)
      return { success: false, error: error.message || '同步失败' }
    }
  }

  /**
   * 从云端同步草稿到本地
   */
  async syncDraftsFromCloud() {
    if (this.syncStatus.isSyncing) {
      console.log('⏳ 草稿同步正在进行中，跳过')
      return { success: false, error: '同步正在进行中' }
    }

    this.syncStatus.isSyncing = true

    try {
      wx.showLoading({ title: '正在从云端同步草稿...' })

      const user = this.getCurrentUser()
      if (!user) {
        wx.hideLoading()
        this.syncStatus.isSyncing = false
        return { success: false, error: '用户未登录' }
      }

      // 从云端下载草稿
      console.log('📥 开始从云端下载草稿...')
      const downloadResult = await this.downloadDrafts()

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || '下载失败')
      }

      const cloudDrafts = downloadResult.drafts || []
      console.log(`从云端下载了 ${cloudDrafts.length} 条草稿`)
      console.log('云端草稿数据类型:', typeof cloudDrafts, Array.isArray(cloudDrafts))
      console.log('云端草稿数据内容:', cloudDrafts)

      // 确保 cloudDrafts 是数组
      if (!Array.isArray(cloudDrafts)) {
        console.error('❌ 云端草稿数据不是数组:', cloudDrafts)
        throw new Error('云端草稿数据格式错误，期望数组但得到: ' + typeof cloudDrafts)
      }

      // 获取本地草稿
      const localDrafts = noteManager.getAccountStorage('drafts', [])
      console.log(`本地有 ${localDrafts.length} 条草稿`)

      // 智能合并：以云端数据为准，保留本地未同步的草稿
      const cloudDraftsMap = new Map()
      cloudDrafts.forEach(draft => {
        cloudDraftsMap.set(draft.id, {
          ...draft,
          cloudId: draft.cloudId || draft.id,
          lastSyncTime: new Date().toISOString(),
          isSynced: true
        })
      })

      // 将本地未同步的草稿也加入
      const mergedDrafts = [...cloudDrafts]
      localDrafts.forEach(localDraft => {
        // 如果本地草稿没有cloudId，说明还没上传到云端
        if (!localDraft.cloudId && !cloudDraftsMap.has(localDraft.id)) {
          mergedDrafts.push({
            ...localDraft,
            needsUpload: true
          })
        }
      })

      // 保存合并后的数据
      noteManager.setAccountStorage('drafts', mergedDrafts)

      wx.hideLoading()
      this.syncStatus.isSyncing = false
      this.syncStatus.lastSyncTime = new Date().toISOString()

      const newDrafts = mergedDrafts.length - localDrafts.length
      console.log(`✅ 从云端同步草稿完成，共 ${mergedDrafts.length} 条草稿，新增 ${Math.max(0, newDrafts)} 条`)
      
      return {
        success: true,
        message: `同步完成，共 ${mergedDrafts.length} 条草稿${newDrafts > 0 ? `，新增 ${newDrafts} 条` : ''}`,
        draftCount: mergedDrafts.length,
        newDrafts: Math.max(0, newDrafts)
      }
    } catch (error) {
      wx.hideLoading()
      this.syncStatus.isSyncing = false
      console.error('❌ 从云端同步草稿失败:', error)
      return { success: false, error: error.message || '同步失败' }
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      ...this.syncStatus,
      isCloudAvailable: this.isInitialized,
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
   * 智能同步草稿
   */
  async smartSyncDrafts() {
    const networkStatus = await this.checkNetworkConnection()
    
    if (!networkStatus.isConnected) {
      console.log('📱 网络未连接，跳过草稿同步')
      return { success: false, error: '网络未连接' }
    }

    if (networkStatus.networkType === 'wifi') {
      // WiFi环境，执行完整同步
      return await this.fullSyncDrafts()
    } else {
      // 移动网络，只同步到云端
      return await this.syncDraftsToCloud()
    }
  }

  /**
   * 完整同步草稿
   */
  async fullSyncDrafts() {
    console.log('🔄 执行草稿完整同步')
    const fromCloud = await this.syncDraftsFromCloud()
    if (fromCloud.success) {
      return await this.syncDraftsToCloud()
    }
    return fromCloud
  }
}

// 创建单例实例
const draftCloudService = new DraftCloudService()

module.exports = draftCloudService
