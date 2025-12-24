const core = require('./core')
const tool = require('./tool')

// 用户配置项
const vgmstreamToolPath = "D:\\MediaTools\\vgmstream\\vgmstream-cli.exe"
// const inputDir = "F:\\Civ6_Assets\\Audio\\Expansion1\\input"
// const outputDir = "F:\\Civ6_Assets\\Audio\\Expansion1\\output"

const args = process.argv.slice(2)
tool.checkArgs(args)
core.autoConvertWemFiles(args[0], args[1])