const soundBankParser = require('./sound_bank_parser')
const utils = require('./utils/utils')

// 用户配置项
// const vgmstreamToolPath = "D:\\MediaTools\\vgmstream\\vgmstream-cli.exe"
// const inputDir = "F:\\Civ6_Assets\\Audio\\Expansion1\\input"
// const outputDir = "F:\\Civ6_Assets\\Audio\\Expansion1\\output"

const main = (argv) => {
    utils.checkArgs(argv)
    soundBankParser.startProcess(argv[0], argv[1])
}

main(process.argv.slice(2))