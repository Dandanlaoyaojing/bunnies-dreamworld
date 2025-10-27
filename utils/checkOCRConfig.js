// utils/checkOCRConfig.js - OCR配置检查工具
// 检查百度云OCR配置状态

const aiService = require('./aiService.js')

/**
 * 检查OCR配置状态
 */
function checkOCRConfig() {
  console.log('🔍 检查OCR配置状态...')
  
  try {
    // 检查百度云OCR配置
    const baiduOCRConfig = require('./baiduOCRConfig.js')
    console.log('📁 百度云OCR配置文件:', baiduOCRConfig)
    
    if (baiduOCRConfig && baiduOCRConfig.baiduOCR) {
      const config = baiduOCRConfig.baiduOCR
      console.log('✅ 百度云OCR配置结构正常')
      console.log('🔑 API Key:', config.apiKey ? '已配置' : '未配置')
      console.log('🔐 Secret Key:', config.secretKey ? '已配置' : '未配置')
      console.log('🌐 Base URL:', config.baseUrl)
      
      if (config.apiKey && config.apiKey !== 'your-baidu-api-key-here') {
        console.log('✅ 百度云OCR配置完整，可以使用')
        return true
      } else {
        console.log('⚠️ 百度云OCR API Key需要配置')
        return false
      }
    } else {
      console.log('❌ 百度云OCR配置结构异常')
      return false
    }
  } catch (error) {
    console.error('❌ 检查OCR配置失败:', error)
    return false
  }
}

/**
 * 测试OCR功能
 */
async function testOCR() {
  console.log('🧪 测试OCR功能...')
  
  try {
    // 这里可以添加一个测试图片路径
    const testImagePath = 'test-image-path' // 需要替换为实际图片路径
    
    console.log('📸 测试图片路径:', testImagePath)
    console.log('⚠️ 注意：需要提供真实的图片路径进行测试')
    
    // 如果需要实际测试，取消下面的注释
    // const result = await aiService.imageToText(testImagePath)
    // console.log('🔍 OCR测试结果:', result)
    
    return true
  } catch (error) {
    console.error('❌ OCR测试失败:', error)
    return false
  }
}

/**
 * 显示配置指南
 */
function showConfigGuide() {
  console.log(`
📋 百度云OCR配置指南：

1. 获取百度云OCR API密钥：
   - 访问：https://cloud.baidu.com/product/ocr
   - 创建应用并获取API Key和Secret Key

2. 配置密钥：
   - 编辑 utils/baiduOCRConfig.js 文件
   - 替换以下内容：
     apiKey: 'your-baidu-api-key-here'     → 您的实际API Key
     secretKey: 'your-baidu-secret-key-here' → 您的实际Secret Key

3. 测试配置：
   - 在笔记编辑器中添加图片
   - 系统会自动使用百度云OCR进行识别

4. 配置示例：
   module.exports = {
     baiduOCR: {
       apiKey: 'your-actual-api-key',
       secretKey: 'your-actual-secret-key',
       baseUrl: 'https://aip.baidubce.com'
     }
   }
`)
}

// 导出函数
module.exports = {
  checkOCRConfig,
  testOCR,
  showConfigGuide
}

// 如果直接运行此文件，执行检查
if (typeof wx !== 'undefined') {
  // 在微信小程序环境中
  console.log('🔍 开始检查OCR配置...')
  const isConfigured = checkOCRConfig()
  
  if (!isConfigured) {
    showConfigGuide()
  } else {
    console.log('✅ OCR配置检查完成，配置正常')
  }
}


