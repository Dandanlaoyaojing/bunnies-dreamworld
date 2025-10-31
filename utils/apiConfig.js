// API配置文件
// 统一管理后端API地址

// 开发环境API地址
// 真机调试使用局域网IP，开发者工具使用localhost
const DEV_API_BASE_URL = 'http://10.10.12.20:3000/api/v1'

// 生产环境API地址（部署后替换为实际服务器地址）
const PROD_API_BASE_URL = 'https://your-domain.com/api/v1'

// 当前使用的API地址（根据环境自动切换）
const API_BASE_URL = DEV_API_BASE_URL

// API端点配置
const API_ENDPOINTS = {
  // 认证相关
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  VERIFY_TOKEN: '/auth/verify-token',
  REQUEST_PASSWORD_RESET: '/auth/request-password-reset',
  RESET_PASSWORD: '/auth/reset-password',
  
  // 用户相关
  USER_PROFILE: '/user/profile',
  CHANGE_PASSWORD: '/user/change-password',
  USER_STATS: '/user/stats',
  
  // 笔记相关
  NOTES: '/notes',
  NOTE_DETAIL: (id) => `/notes/${id}`,
  NOTE_SEARCH: '/notes/search',
  NOTE_BY_CATEGORY: (category) => `/notes/by-category/${category}`,
  NOTE_BY_TAG: (tag) => `/notes/by-tag/${tag}`,
  NOTE_FAVORITE: (id) => `/notes/${id}/favorite`,
  NOTE_RESTORE: (id) => `/notes/${id}/restore`,
  NOTE_PERMANENT_DELETE: (id) => `/notes/${id}/permanent`,
  BATCH_DELETE: '/notes/batch-delete',
  
  // 收藏与回收站
  FAVORITES: '/notes/favorites/list',
  TRASH: '/notes/trash/list',
  CLEAR_TRASH: '/notes/trash/clear',
  
  // 分类与标签
  CATEGORIES: '/categories',
  TAGS: '/tags',
  
  // 草稿箱
  DRAFTS: '/drafts',
  DRAFT_PUBLISH: (id) => `/drafts/${id}/publish`,
  
  // 统计分析
  STATS_DASHBOARD: '/stats/dashboard',
  STATS_TIMELINE: '/stats/timeline',
  STATS_WORD_CLOUD: '/stats/word-cloud',
  STATS_CATEGORY_DISTRIBUTION: '/stats/category-distribution',
  STATS_WRITING_HABITS: '/stats/writing-habits',
  STATS_REPORT: '/stats/report',
  
  // 云同步
  SYNC_UPLOAD: '/sync/upload',
  SYNC_DOWNLOAD: '/sync/download',
  SYNC_STATUS: '/sync/status',
  SYNC_CHECK_UPDATES: '/sync/check-updates',
  SYNC_RESOLVE_CONFLICT: '/sync/resolve-conflict',
  
  // 文件管理
  FILE_UPLOAD: '/files',
  FILE_DOWNLOAD: (id) => `/files/${id}`,
  FILE_LIST: '/files/list',
  FILE_DELETE: (id) => `/files/${id}`,
  FILE_INFO: (id) => `/files/${id}/info`,
  FILE_BATCH_UPLOAD: '/files/batch-upload',
  IMAGE_UPLOAD: '/images/upload',
  AUDIO_UPLOAD: '/audio/upload',
  
  // AI增强功能
  AI_SUGGEST_CATEGORY: '/ai/suggest-category',
  AI_GENERATE_TAGS: '/ai/generate-tags',
  AI_APPEND_TAGS: '/ai/append-tags', // 追加标签生成接口
  AI_GENERATE_SUMMARY: '/ai/generate-summary',
  AI_WRITING_SUGGESTIONS: '/ai/writing-suggestions',
  AI_RECOMMEND_NODES: '/ai/recommend-nodes',
  AI_SMART_SEARCH: '/ai/smart-search',
  AI_ANALYZE_CONTENT: '/ai/analyze-content',
  AI_TEST_GENERATE_TAGS: '/ai/test-generate-tags', // 测试接口，不需要认证
  
  // 通知系统
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
  NOTIFICATION_DELETE: (id) => `/notifications/${id}`,
  NOTIFICATION_BATCH_READ: '/notifications/batch-read',
  NOTIFICATION_BATCH_DELETE: '/notifications/batch-delete',
  NOTIFICATION_STATS: '/notifications/stats',
  NOTIFICATION_CREATE: '/notifications/create',
  NOTIFICATION_DETAIL: (id) => `/notifications/${id}`,
  
  // 系统
  HEALTH: '/health',
  SYSTEM_CONFIG: '/system/config',
  SYSTEM_VERSION: '/system/version'
}

module.exports = {
  API_BASE_URL,
  API_ENDPOINTS
}

