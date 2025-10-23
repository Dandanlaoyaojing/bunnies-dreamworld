// AI服务配置模板文件
// 复制此文件为 aiConfig.js 并填入你的真实API密钥

module.exports = {
  // DeepSeek API 配置
  deepseek: {
    apiKey: 'your-deepseek-api-key-here', // 替换为你的DeepSeek API密钥
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    timeout: 15000
  },
  
  // 其他AI服务配置（可选）
  openai: {
    apiKey: 'your-openai-api-key-here', // 如果需要使用OpenAI
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  },
  
  // 百度云OCR配置
  baidu: {
    apiKey: 'your-baidu-api-key-here',
    secretKey: 'your-baidu-secret-key-here',
    baseUrl: 'https://aip.baidubce.com'
  }
}
