const fs = require('fs')
const path = require('path')

const checkArgs = (args) => {
    if (args.length < 2) {
        console.log('错误: 请提供输入文件夹和输出文件夹路径')
        console.log('用法: node index.js <输入文件夹路径> <输出文件夹路径>')
        process.exit(1) // 退出程序，表示出错
    }
    let inputFolder = args[0]
    let outputFolder = args[1]

    // 检查输入文件夹路径和输出文件夹路径是否为空
    if (!inputFolder || !outputFolder) {
        console.log('错误: 输入文件夹路径或输出文件夹路径不能为空')
        process.exit(1) // 退出程序，表示出错
    }

    // 进一步处理逻辑，例如检查文件夹是否存在
    if (!fs.existsSync(inputFolder)) {
        console.log(`错误: 输入文件夹 "${inputFolder}" 不存在`)
        process.exit(1)
    }

    // if (!fs.existsSync(outputFolder)) {
    //     console.log(`错误: 输出文件夹 "${outputFolder}" 不存在`)
    //     process.exit(1)
    // }

    console.log(`输入文件夹: ${inputFolder}`)
    console.log(`输出文件夹: ${outputFolder}`)
}

const getFileName = (filePath) => {
    return path.basename(filePath, path.extname(filePath))
}

const isBnkFile = (filePath) => {
    const extname = path.extname(filePath)
    return extname === '.bnk'
}

const isXmlFile = (filePath) => {
    const extname = path.extname(filePath)  // 获取文件的扩展名
    return extname === '.xml'
}

const checkFileOrDirExists = async (path) => {
    try {
        await fs.promises.access(path)
        return true
    } catch (err) {
        return false
    }
}

const checkFileOrDirExistsSync = (path) => {
    try {
        // 使用 fs.accessSync 来检查文件是否存在
        fs.accessSync(path, fs.constants.F_OK)  // 默认检查文件是否存在
        return true  // 如果文件存在，返回 true
    } catch (err) {
        return false  // 如果捕获到错误，返回 false
    }
}

const isNonEmptyString = (value) => {
    return typeof value === 'string' && value.trim !== ''
}

const timeEslaped = (start) => {
    const end = process.hrtime(start)
    
    let minutes = Math.floor(end[0] / 60)
    const hours = Math.floor(minutes / 60)
    minutes = Math.floor(minutes % 60)
    const seconds = Math.floor(end[0] % 60)

    return {
        hours: hours,
        minutes: minutes,
        seconds: seconds
    }
}

const timeEslapedFormatted = (start) => {
    const result = timeEslaped(start)
    const formatTwoDigits = (num) => num.toString().padStart(2, '0');

    return `${formatTwoDigits(result.hours)}小时 ${formatTwoDigits(result.minutes)}分 ${formatTwoDigits(result.seconds)}秒`
}

// 使用正则表达式去掉占位符和格式化部分
const cleanText = (text) => {
    if (!text) return null
    return text.replace(/\+?\{[^}]*\}/g, "").replace(/\[.*?\]/g, "").trim();
}

const logToFile = async (logFilePath, message) => {
    try {
        await fs.promises.appendFile(logFilePath, message + '\n')
    } catch (err) {
        console.error(`向 ${logFilePath} 日志文件写入日志失败: `, err)
    }
}


module.exports = {
    checkArgs,
    isBnkFile,
    isXmlFile,
    getFileName,
    checkFileOrDirExists,
    checkFileOrDirExistsSync,
    isNonEmptyString,
    timeEslaped,
    timeEslapedFormatted,
    cleanText,
    logToFile,
}