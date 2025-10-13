// API请求服务
// 统一封装微信小程序的网络请求

const { API_BASE_URL, API_ENDPOINTS } = require('./apiConfig.js')

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.token = null
    this.loadToken()
  }

  /**
   * 构建查询字符串（替代URLSearchParams）
   */
  buildQueryString(params = {}) {
    const queryParts = []
    for (const key in params) {
      if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      }
    }
    return queryParts.join('&')
  }

  /**
   * 从本地存储加载token
   */
  loadToken() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.token) {
        this.token = userInfo.token
      }
    } catch (err) {
      console.error('加载token失败:', err)
    }
  }

  /**
   * 设置token
   */
  setToken(token) {
    this.token = token
    console.log('✅ Token已设置')
  }

  /**
   * 清除token
   */
  clearToken() {
    this.token = null
    console.log('✅ Token已清除')
  }

  /**
   * 统一请求方法
   * @param {String} endpoint - API端点
   * @param {String} method - 请求方法
   * @param {Object} data - 请求数据
   * @param {Boolean} needAuth - 是否需要认证
   */
  async request(endpoint, method = 'GET', data = null, needAuth = true) {
    return new Promise((resolve, reject) => {
      // 构建完整URL
      const url = this.baseURL + endpoint
      
      // 构建请求头
      const header = {
        'Content-Type': 'application/json'
      }
      
      // 如果需要认证，添加token
      if (needAuth && this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }
      
      // 构建请求配置
      const requestConfig = {
        url: url,
        method: method,
        header: header,
        timeout: 30000, // 30秒超时
        success: (res) => {
          console.log('API请求成功:', {
            url: url,
            statusCode: res.statusCode,
            data: res.data
          })
          
          // 检查HTTP状态码
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 检查业务状态
            if (res.data.success) {
              resolve(res.data)
            } else {
              // 业务失败
              reject({
                code: 'BUSINESS_ERROR',
                message: res.data.message || '操作失败',
                data: res.data
              })
            }
          } else if (res.statusCode === 401) {
            // 未授权，需要重新登录
            this.handleUnauthorized()
            reject({
              code: 'UNAUTHORIZED',
              message: '未授权，请重新登录',
              statusCode: 401
            })
          } else {
            // 其他HTTP错误
            reject({
              code: 'HTTP_ERROR',
              message: res.data.message || `请求失败 (${res.statusCode})`,
              statusCode: res.statusCode,
              data: res.data
            })
          }
        },
        fail: (err) => {
          console.error('API请求失败:', {
            url: url,
            error: err
          })
          
          // 判断错误类型
          let errorMessage = '网络请求失败'
          if (err.errMsg) {
            if (err.errMsg.includes('timeout')) {
              errorMessage = '请求超时，请检查网络'
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '网络连接失败，请检查网络'
            }
          }
          
          reject({
            code: 'NETWORK_ERROR',
            message: errorMessage,
            error: err
          })
        }
      }
      
      // 添加请求数据
      if (data) {
        requestConfig.data = data
      }
      
      // 发送请求
      console.log('发送API请求:', {
        url: url,
        method: method,
        needAuth: needAuth,
        hasToken: !!this.token
      })
      
      wx.request(requestConfig)
    })
  }

  /**
   * 处理未授权错误
   */
  handleUnauthorized() {
    // 清除token和用户信息
    this.clearToken()
    wx.removeStorageSync('userInfo')
    
    // 提示用户重新登录
    wx.showModal({
      title: '登录已过期',
      content: '请重新登录',
      showCancel: false,
      success: () => {
        // 跳转到登录页
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }
    })
  }

  // ========== 认证相关API ==========

  /**
   * 用户注册
   */
  async register(username, password, nickname) {
    return await this.request(API_ENDPOINTS.REGISTER, 'POST', {
      username,
      password,
      nickname
    }, false)
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    const result = await this.request(API_ENDPOINTS.LOGIN, 'POST', {
      username,
      password
    }, false)
    
    // 登录成功后保存token
    if (result.success && result.data.token) {
      this.setToken(result.data.token)
      
      // 保存用户信息
      wx.setStorageSync('userInfo', {
        ...result.data.user,
        token: result.data.token
      })
    }
    
    return result
  }

  /**
   * 用户登出
   */
  async logout() {
    const result = await this.request(API_ENDPOINTS.LOGOUT, 'POST')
    this.clearToken()
    wx.removeStorageSync('userInfo')
    return result
  }

  /**
   * 刷新Token
   */
  async refreshToken() {
    const result = await this.request(API_ENDPOINTS.REFRESH_TOKEN, 'POST')
    if (result.success && result.data.token) {
      this.setToken(result.data.token)
    }
    return result
  }

  // ========== 笔记相关API ==========

  /**
   * 获取笔记列表
   */
  async getNotes(params = {}) {
    const query = this.buildQueryString(params)
    const endpoint = API_ENDPOINTS.NOTES + (query ? `?${query}` : '')
    return await this.request(endpoint, 'GET')
  }

  /**
   * 获取笔记详情
   */
  async getNoteById(id) {
    return await this.request(API_ENDPOINTS.NOTE_DETAIL(id), 'GET')
  }

  /**
   * 创建笔记
   */
  async createNote(noteData) {
    return await this.request(API_ENDPOINTS.NOTES, 'POST', noteData)
  }

  /**
   * 更新笔记
   */
  async updateNote(id, noteData) {
    return await this.request(API_ENDPOINTS.NOTE_DETAIL(id), 'PUT', noteData)
  }

  /**
   * 删除笔记（软删除）
   */
  async deleteNote(id) {
    return await this.request(API_ENDPOINTS.NOTE_DETAIL(id), 'DELETE')
  }

  /**
   * 批量删除笔记
   */
  async batchDeleteNotes(noteIds) {
    return await this.request(API_ENDPOINTS.BATCH_DELETE, 'POST', { noteIds })
  }

  /**
   * 搜索笔记
   */
  async searchNotes(keyword, params = {}) {
    const query = this.buildQueryString({ q: keyword, ...params })
    return await this.request(`${API_ENDPOINTS.NOTE_SEARCH}?${query}`, 'GET')
  }

  /**
   * 按分类获取笔记
   */
  async getNotesByCategory(category, params = {}) {
    const query = this.buildQueryString(params)
    const endpoint = API_ENDPOINTS.NOTE_BY_CATEGORY(category) + (query ? `?${query}` : '')
    return await this.request(endpoint, 'GET')
  }

  /**
   * 收藏笔记
   */
  async favoriteNote(id) {
    return await this.request(API_ENDPOINTS.NOTE_FAVORITE(id), 'POST')
  }

  /**
   * 取消收藏
   */
  async unfavoriteNote(id) {
    return await this.request(API_ENDPOINTS.NOTE_FAVORITE(id), 'DELETE')
  }

  /**
   * 获取收藏列表
   */
  async getFavorites(params = {}) {
    const query = this.buildQueryString(params)
    return await this.request(`${API_ENDPOINTS.FAVORITES}?${query}`, 'GET')
  }

  /**
   * 获取回收站列表
   */
  async getTrash(params = {}) {
    const query = this.buildQueryString(params)
    return await this.request(`${API_ENDPOINTS.TRASH}?${query}`, 'GET')
  }

  /**
   * 恢复笔记
   */
  async restoreNote(id) {
    return await this.request(API_ENDPOINTS.NOTE_RESTORE(id), 'POST')
  }

  /**
   * 清空回收站
   */
  async clearTrash() {
    return await this.request(API_ENDPOINTS.CLEAR_TRASH, 'POST')
  }

  // ========== 用户相关API ==========

  /**
   * 获取用户资料
   */
  async getUserProfile() {
    return await this.request(API_ENDPOINTS.USER_PROFILE, 'GET')
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(profileData) {
    return await this.request(API_ENDPOINTS.USER_PROFILE, 'PUT', profileData)
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats() {
    return await this.request(API_ENDPOINTS.USER_STATS, 'GET')
  }

  // ========== 分类与标签API ==========

  /**
   * 获取分类列表
   */
  async getCategories() {
    return await this.request(API_ENDPOINTS.CATEGORIES, 'GET')
  }

  /**
   * 获取标签列表
   */
  async getTags() {
    return await this.request(API_ENDPOINTS.TAGS, 'GET')
  }

  /**
   * 创建标签
   */
  async createTag(tagData) {
    return await this.request(API_ENDPOINTS.TAGS, 'POST', tagData)
  }

  // ========== 统计分析API ==========

  /**
   * 获取仪表盘数据
   */
  async getDashboard() {
    return await this.request(API_ENDPOINTS.STATS_DASHBOARD, 'GET')
  }

  // ========== 云同步API ==========

  /**
   * 上传笔记到云端
   */
  async syncUpload(notes) {
    return await this.request(API_ENDPOINTS.SYNC_UPLOAD, 'POST', { notes })
  }

  /**
   * 从云端下载笔记
   */
  async syncDownload() {
    return await this.request(API_ENDPOINTS.SYNC_DOWNLOAD, 'GET')
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    return await this.request(API_ENDPOINTS.SYNC_STATUS, 'GET')
  }

  // ========== 草稿箱API ==========

  /**
   * 获取草稿列表
   */
  async getDrafts() {
    return await this.request(API_ENDPOINTS.DRAFTS, 'GET')
  }

  /**
   * 保存草稿
   */
  async saveDraft(draftData) {
    return await this.request(API_ENDPOINTS.DRAFTS, 'POST', draftData)
  }

  /**
   * 发布草稿
   */
  async publishDraft(id) {
    return await this.request(API_ENDPOINTS.DRAFT_PUBLISH(id), 'POST')
  }

  // ========== 系统API ==========

  /**
   * 健康检查
   */
  async healthCheck() {
    return await this.request(API_ENDPOINTS.HEALTH, 'GET', null, false)
  }

  /**
   * 获取系统配置
   */
  async getSystemConfig() {
    return await this.request(API_ENDPOINTS.SYSTEM_CONFIG, 'GET', null, false)
  }
}

// 创建单例实例
const apiService = new APIService()

module.exports = apiService

