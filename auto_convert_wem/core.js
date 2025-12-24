const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const tool = require('./tool')

const analyzeSoundBankFile = async (filepath) => {
    try {
        let fileContent = await fs.promises.readFile(filepath, 'utf8')
        let result = await xml2js.parseStringPromise(fileContent)
        let soundBanks = result.SoundBanksInfo.SoundBanks
        if (!soundBanks || !soundBanks.length) {
            console.log('SoundBanksInfo.SoundBanks 为空，直接跳过')
            return
        }
        console.log(soundBanks)
    } catch (err) {
        console.log(`解析xml文件=> ${filepath} <=失败: ${err}`)
    }
}

const autoConvertWemFiles = async (inputDir, outputDir) => {
    try {
        let files = await fs.promises.readdir(inputDir)
        for (let file of files) {
            let fullPath = path.join(inputDir, file)
            let stats = await fs.promises.stat(fullPath)
            if (stats.isDirectory()) {
                // console.log(`[目录] ${fullPath}`); // 如果是文件夹
                let outFullPath = path.join(outputDir, file)
                // 先在目标目录创建对应文件夹
                if (!await tool.checkFileOrDirExists(outFullPath)) {
                    await fs.promises.mkdir(outFullPath, { recursive: true })
                }
                // 再递归处理子目录
                await autoConvertWemFiles(fullPath, outFullPath)
            } else {
                if (!tool.isXmlFile(fullPath)) continue
                    console.log(`[文件] ${fullPath}`); // 如果是xml文件
                    // 以xml文件名建立目录
                    let soundName = tool.getFileName(fullPath)
                    let soundNameDir = path.join(outputDir, soundName)
                    await fs.promises.mkdir(soundNameDir, { recursive: true })
                    // 开始解析xml文件
                    await analyzeSoundBankFile(fullPath)
            }
        }
    } catch (err) {
        console.log('自动转化wem文件失败:', err)
    }
}

module.exports = {
    autoConvertWemFiles,
    analyzeSoundBankFile,
}