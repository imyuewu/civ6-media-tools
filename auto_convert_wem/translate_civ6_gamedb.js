const config = require('./config')
const translate = require('./translate')

let targetLanguage = config.DB_TRANSLATOR.DEFAULT_TARGET_LANGUAGE
let gameplayDBPath = config.DB_TRANSLATOR.DEFAULT_GAMEPLAY_DB_PATH
let localizationDBPath = config.DB_TRANSLATOR.DEFAULT_LOCALIZATION_DB_PATH

const checkArgv = (argv) => {
  if (!argv[0]) return // 如果没有传参，则直接使用默认值
  if (config.DB_TRANSLATOR.SUPPORT_LANGUAGES.includes(argv[0])) {
    targetLanguage = argv[0]
    if (argv[1]) {
      gameplayDBPath = argv[1]
    }
    if (argv[2]) {
      localizationDBPath = argv[2]
    }
  } else {
    console.log('错误: 请输入正确目标语言！支持语言如下：')
    console.log(config.DB_TRANSLATOR.SUPPORT_LANGUAGES.join(', '))
    console.log('用法: node translate_civ6_gamedb.js <目标语言> <DebugGameplay.sqlite文件路径> <DebugLocalization.sqlite文件路径>')
    process.exit(1) // 退出程序
  }
}

const main = (argv) => {
  checkArgv(argv)
  translate.translateToLanguage(gameplayDBPath, localizationDBPath, targetLanguage)
}

main(process.argv.slice(2))