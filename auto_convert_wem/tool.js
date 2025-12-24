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

const isXmlFile = (filePath) => {
    const extname = path.extname(filePath)  // 获取文件的扩展名
    return extname === '.xml'
}

const checkFileOrDirExists = async (path) => {
    try {
        await fs.access(path)
        return true
    } catch (err) {
        return false
    }
}

module.exports = {
    checkArgs,
    isXmlFile,
    getFileName,
    checkFileOrDirExists,
}