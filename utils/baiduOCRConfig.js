// utils/baiduOCRConfig.js - 百度云OCR配置
// 百度云OCR API密钥配置

module.exports = {
  // 百度云OCR配置
  baiduOCR: {
    // 百度云OCR API Key（已配置）
    apiKey: 'e8Hf2GgRQX9N3RRqj1uv6Ylb',
    
    // 百度云OCR Secret Key（已配置）
    secretKey: 'PQkWjyyr8OLaRSiK1ryTzh9LfjBIPn7n',
    
    // 百度云API基础URL
    baseUrl: 'https://aip.baidubce.com',
    
    // OCR接口配置
    ocrEndpoint: '/rest/2.0/ocr/v1/general_basic',
    
    // 识别参数配置
    ocrParams: {
      language_type: 'CHN_ENG', // 中英文混合识别
      detect_direction: 'true', // 检测图像朝向
      paragraph: 'true', // 输出段落信息
      probability: 'true' // 返回识别结果中每一行的置信度
    },
    
    // 超时设置
    timeout: 30000, // 30秒超时
    
    // 重试次数
    retryCount: 2
  }
}
