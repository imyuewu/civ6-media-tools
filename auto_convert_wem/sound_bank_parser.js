const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const utils = require('./utils/utils')
const Civ6SoundBank = require('./models/civ6_sound_bank')
const Civ6Event = require('./models/civ6_event')
const Civ6AudioFile = require('./models/civ6_audio_file')

const createCiv6EventFromXmlObject = (eventInXml, soundBankName) => {
    try {
        const id = eventInXml.$.Id
        const name = eventInXml.$.Name
        const civ6Event = new Civ6Event(id, name, soundBankName)
        return civ6Event
    } catch (err) {
        console.log(`
        Create civ6Event model from xml object fail.
        xml object: ${eventInXml},
        error: ${err}`)
        return null
    }
}

const createCiv6AudioFileFromXmlObject = (fileInXml, inputDir, outputDir) => {
    try {
        const id = fileInXml.$.Id
        const name = fileInXml.ShortName[0]
        const language = fileInXml.$.Language
        const civ6AudioFile = new Civ6AudioFile(id, name, inputDir, outputDir, language)
        return civ6AudioFile
    } catch (err) {
        console.log(`
        Create civ6AudioFile model from xml object fail.
        xml object: ${fileInXml},
        error: ${err}`)
        return null
    }
}

const createCiv6SoundBankFromXmlObject = (soundBankInXml, inputDir, outputDir) => {
    try {
        const id = soundBankInXml.$.id
        const soundBankName = soundBankInXml.ShortName[0]
        const language = soundBankInXml.$.Language

        const includedEvents = []
        if (soundBankInXml.IncludedEvents 
            && soundBankInXml.IncludedEvents.length 
            && soundBankInXml.IncludedEvents[0].Event 
            && soundBankInXml.IncludedEvents[0].Event.length) {
            const eventsInXml = soundBankInXml.IncludedEvents[0].Event
            for (const eventInXml of eventsInXml) {
                const civ6Event = createCiv6EventFromXmlObject(eventInXml, soundBankName)
                includedEvents.push(civ6Event)
            }
        }
        
        const streamedFiles = []
        if (soundBankInXml.ReferencedStreamedFiles 
            && soundBankInXml.ReferencedStreamedFiles.length 
            && soundBankInXml.ReferencedStreamedFiles[0].File 
            && soundBankInXml.ReferencedStreamedFiles[0].File.length) {
            const streamedFilesInXml = soundBankInXml.ReferencedStreamedFiles[0].File
            for (const streamedFileInXml of streamedFilesInXml) {
                const civ6Audio = createCiv6AudioFileFromXmlObject(streamedFileInXml, inputDir, outputDir)
                streamedFiles.push(civ6Audio)
            }
        }
        
        const memoryFiles = []
        if (soundBankInXml.IncludedMemoryFiles
            && soundBankInXml.IncludedMemoryFiles.length
            && soundBankInXml.IncludedMemoryFiles[0].File 
            && soundBankInXml.IncludedMemoryFiles[0].File.length) {
            const memoryFilesInXml = soundBankInXml.IncludedMemoryFiles[0].File
            for (const memoryFileInXml of memoryFilesInXml) {
                const civ6Audio = createCiv6AudioFileFromXmlObject(memoryFileInXml, inputDir, outputDir)
                memoryFiles.push(civ6Audio)
            }
        }

        const civ6SoundBank = new Civ6SoundBank(id, soundBankName, language, includedEvents, streamedFiles, memoryFiles)
        return civ6SoundBank
    } catch (err) {
        console.log(`
        Create sound bank model from xml object fail.
        xml object: ${soundBankInXml},
        error: ${err}`)
        return null
    }
}

const processSoundBankFile = async (xmlFileFullPath, inputDir, outputDir) => {
    try {
        const fileContent = await fs.promises.readFile(xmlFileFullPath, 'utf8')
        const result = await xml2js.parseStringPromise(fileContent)
        // 在文明6 SoundBank.xml里面，一个xml永远只有一个SoundBank，这里直接取第一个元素
        // 不再做容错处理，后面会有很多类似的逻辑
        const soundBankInXml = result.SoundBanksInfo.SoundBanks[0].SoundBank[0]
        // console.log(`Sound bank id: ${soundBankInXml.$.Id}, language: ${soundBankInXml.$.Language}`)
        const soundBank = createCiv6SoundBankFromXmlObject(soundBankInXml, inputDir, outputDir)
        return soundBank
    } catch (err) {
        console.log(`解析xml文件=> ${xmlFileFullPath} <=失败: ${err}`)
    }
}

const autoConvertWemFiles = async (inputDir, outputDir) => {
    const start = process.hrtime()
    try {
        const files = await fs.promises.readdir(inputDir)
        console.log(`>>> ★★★ 开始处理目录: ${inputDir} ★★★ <<<`)
        for (const file of files) {
            const fullPath = path.join(inputDir, file)
            const stats = await fs.promises.stat(fullPath)
            if (stats.isDirectory()) {
                // console.log(`[目录] ${fullPath}`); // 如果是文件夹
                const outFullPath = path.join(outputDir, file)
                // 先在目标目录创建对应文件夹
                if (!await utils.checkFileOrDirExists(outFullPath)) {
                    await fs.promises.mkdir(outFullPath, { recursive: true })
                }
                // 再递归处理子目录
                await autoConvertWemFiles(fullPath, outFullPath)
            } else {
                if (!utils.isXmlFile(fullPath)) continue
                const xmlFileFullPath = fullPath
                // console.log(`[文件] ${xmlFileFullPath}`); // 如果是xml文件
                // 以xml文件名建立目录
                const xmlFileName = utils.getFileName(xmlFileFullPath)
                const outputDirForXml = path.join(outputDir, xmlFileName)
                await fs.promises.mkdir(outputDirForXml, { recursive: true })
                // 开始解析xml文件
                const soundBank = await processSoundBankFile(xmlFileFullPath, inputDir, outputDirForXml)
                // 开始批量转音频
                await soundBank.batchConvertWem2Wav()
            }
        }
        console.log(`本次处理耗时: ${utils.timeEslapedFormatted(start)}`)
        console.log(`>>> ✅✅✅ 完成处理目录: ${inputDir} ✅✅✅ <<<`)
    } catch (err) {
        console.log('自动转化wem文件失败:', err)
        console.log(`本次处理耗时: ${utils.timeEslapedFormatted(start)}`)
        console.log(`>>> ❌❌❌ 目录处理失败: ${inputDir} ❌❌❌ <<<`)
    }
}

module.exports = {
    autoConvertWemFiles,
}