const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const utils = require('./utils/utils')
const Civ6SoundBank = require('./models/civ6_sound_bank')
const Civ6Event = require('./models/civ6_event')
const Civ6AudioFile = require('./models/civ6_audio_file')
const excelHelper = require('./utils/excel_helper')
const CONSTS = require('./utils/consts')

// 是否已经创建特定语言文件夹容器
var isLanguageDirCreatedMap = new Map()
// 无法找到的wem文件列表
var missingWemFileList = []
// event-sound bank name映射存储容器
var eventsMap = new Map()

const createCiv6EventFromXmlObject = (eventInXml, soundBankName) => {
    try {
        const id = eventInXml.$.Id.toString()
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

const createCiv6AudioFileFromXmlObject = (fileInXml, soundBankName, loadType, inputDir, outputDir) => {
    try {
        const id = fileInXml.$.Id.toString()
        const name = fileInXml.ShortName[0]
        const language = fileInXml.$.Language
        const civ6AudioFile = new Civ6AudioFile(id, name, loadType, soundBankName, inputDir, outputDir, language)
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
        const id = soundBankInXml.$.Id.toString()
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
                const civ6Audio = createCiv6AudioFileFromXmlObject(streamedFileInXml, 
                    soundBankName, CONSTS.AUDIO_FILE_LOAD_TYPE.STREAMED_FILE, 
                    inputDir, outputDir)
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
                const civ6Audio = createCiv6AudioFileFromXmlObject(memoryFileInXml,
                     soundBankName, CONSTS.AUDIO_FILE_LOAD_TYPE.MEMORY_FILE,
                     inputDir, outputDir)
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


// 创建目标语言文件夹
const createLanguageDirOnce = async (soundBank, outputDir) => {
    if (!soundBank || !soundBank.name) {
        console.error(`创建语言文件夹失败，SoundBankName不能为空！`)
        return
    }
    if (!outputDir) {
        console.error(`创建语言文件夹失败，outputDir均不能为空！`)
        return
    }
    const language = soundBank.language;
    if (isLanguageDirCreatedMap.has(language) && isLanguageDirCreatedMap.get(language)) return
    const languageDirPath = path.join(outputDir, language)
    try {
        if (!await utils.checkFileOrDirExists(languageDirPath)) {
            await fs.promises.mkdir(languageDirPath, { recursive: true })
        }
        isLanguageDirCreatedMap.set(language, true)
    } catch (err) {
        console.error('创建语言文件夹失败:', err)
    } 
}

const createSoundBankNameDirBeforeBatchConvert = async (soundBank, outputDir) => {
    try {
        if (!soundBank || !outputDir) {
            console.error('创建SoundBankName文件夹失败： soundBank 和 outputDir均不能为空！')
            return
        }
        const targetDirPath = path.join(outputDir, soundBank.language, soundBank.name)
        await fs.promises.mkdir(targetDirPath, { recursive: true })
    } catch (err) {
        console.error('创建SoundBankName文件夹失败：', err)
    }
}

const prepareTargetOutputDir = async (soundBank, outputDir) => {
    // 先创建该soundBank对应的语言文件夹，如有则跳过
    await createLanguageDirOnce(soundBank, outputDir)
    // 在创建该soundBank shortName对应的文件夹
    await createSoundBankNameDirBeforeBatchConvert(soundBank, outputDir)
}

const recordEventsMap = (eventsInput) => {
    eventsInput.forEach(item => {
        let itemId = item.id
        let eventInMap = eventsMap.get(itemId)
        if (eventInMap) { 
            eventInMap.mergeSoundBankNames(item)
        } else {
            eventsMap.set(itemId, item) 
        }
        
    })
}

/**
 * 核心逻辑如下：
 * 1.递归遍历输入路径，找到目录下的SoundBank.xml文件
 * 2.将SoundBank.xml文件内容转成Civ6SoundBank对象
 * 3.在目标输出路径创建SoundBank.xml对应的语言文件夹，比如默认是FSX文件夹，即通用语言
 *  本地化语言文件夹类似Chinese(RPC)
 * 4.在语言文件夹下再创建SoundBankName对应的文件夹
 * 5.批量处理wem文件，转成wav文件，输出到目标路径-语言文件夹子-SoundBankName文件夹下面
 * 6.转换过程中如果出现missing的wem文件，记录到全局变量xxx中
 * 7.单个SoundBankName文件夹内的音频处理完成，在文件夹内生成<SoundBankName>_mapping.xlsx文件
 * 8.所有xml文件都处理完成后，在语言文件夹同级目录输出missing_wem.xlsx文件
 * 9.最后在语言文件夹同级输出sound_bank_events.xlsx文件
 * 
 * @param {待批量处理wem文件夹} inputDir 
 * @param {目标输出文件夹} outputDir 
 */
const autoConvertWemFiles = async (inputDir, outputDir) => {
    const start = process.hrtime()
    try {
        const files = await fs.promises.readdir(inputDir)
        console.log(`>>> ★★★ 开始处理目录: ${inputDir} ★★★ <<<`)
        for (const file of files) {
            const fullPath = path.join(inputDir, file)
            const stats = await fs.promises.stat(fullPath)

            if (stats.isDirectory()) { // 如果是文件夹
                // 递归处理子目录
                await autoConvertWemFiles(fullPath, outputDir)
            } else {
                if (!utils.isXmlFile(fullPath)) continue
                const xmlFileFullPath = fullPath
                // console.log(`[文件] ${xmlFileFullPath}`); // 如果是xml文件

                // 开始解析xml文件
                const soundBank = await processSoundBankFile(xmlFileFullPath, inputDir, outputDir)
                // 准备输出目录结构
                await prepareTargetOutputDir(soundBank, outputDir)
                // 开始批量转音频
                const result = await soundBank.batchConvertWem2Wav()
                // 更新全局missing wem文件数组
                if (result.missingWemFiles.length > 0) {
                    missingWemFileList.push(...result.missingWemFiles)
                }
                // 更新eventsMap
                recordEventsMap(soundBank.getEvents())
                // 输出 <SoundBankName>_mapping.xlsx文件
                await excelHelper.write2SoundBankFilesMappingXlsx(soundBank)
            }
        }
        console.log(`本次处理耗时: ${utils.timeEslapedFormatted(start)}`)
        console.log(`>>> ✅✅✅ 完成处理目录: ${inputDir} ✅✅✅ <<<\n`)
    } catch (err) {
        console.log('自动转化wem文件失败:', err)
        console.log(`本次处理耗时: ${utils.timeEslapedFormatted(start)}`)
        console.log(`>>> ❌❌❌ 目录处理失败: ${inputDir} ❌❌❌ <<<\n`)
        
    }
}

const startProcess = async (inputDir, outputDir) => {
    const start = process.hrtime()
    await autoConvertWemFiles(inputDir, outputDir)
    
    // 输出missing_wem.xlsx文件
    let writeStart = process.hrtime()
    console.log(`>>> ★★★ 开始写入 missing_wem.xlsx 文件 ★★★ <<<`)
    await excelHelper.write2MissingWemXlsx(missingWemFileList, outputDir)
    console.log(`>>> ✅✅✅ 完成 missing_wem.xlsx 文件写入 ✅✅✅ <<<\n`)
    console.log(`本次处理耗时: ${utils.timeEslapedFormatted(writeStart)}`)

    // 输出sound_bank_events.xlsx文件
    writeStart = process.hrtime()
    console.log(`>>> ★★★ 开始写入 sound_bank_events.xlsx 文件 ★★★ <<<`)
    await excelHelper.write2SoundBankEventsXlsx(eventsMap, outputDir)
    console.log(`本次处理耗时: ${utils.timeEslapedFormatted(writeStart)}`)
    console.log(`>>> ✅✅✅ 完成 sound_bank_events.xlsx 文件写入 ✅✅✅ <<<\n`)

    console.log(`\n>>> 🎉🎉🎉 所有任务处理完成，合计耗时:${utils.timeEslapedFormatted(start)}  🎉🎉🎉 <<<`)
}

module.exports = {
    startProcess,
}