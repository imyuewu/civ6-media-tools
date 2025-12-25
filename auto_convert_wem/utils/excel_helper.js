const ExcelJS = require('exceljs')
const path = require('path')
const CONSTS = require('./consts')

const write2SoundBankFilesMappingXlsx = async (soundBank) => {
    const files = [...soundBank.getStreamedFiles(), ...soundBank.getMemoryFiles()]
    if (files.length <= 0) return

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('音频文件列表')

    sheet.columns = [
        { header: '数字.wem', key: 'id', width: 15 },
        { header: '音频名', key: 'name', width: 30 },
        { header: '语言', key: 'language', width: 20 },
        { header: '时长', key: 'duration', width: 15 },
        { header: '类型', key: 'loadType', width: 20 },
        { header: 'SoundBank', key: 'soundBank', width: 40 },
        { header: '.wem原文件是否丢失', key: 'isMissing', width: 10 }
    ]

    for (const item of files) {
        let duration = 'UNKNOWN'
        let isMissing = 'UNKNOWN'
        // 只有流媒体读取时长，内存引用不读时长
        if (item.loadType === CONSTS.AUDIO_FILE_LOAD_TYPE.STREAMED_FILE) {
            duration = await item.getAudioLengthFormatted()
            isMissing = item.getIsWemFileMissing()
        }
        
        sheet.addRow({ 
            id: item.getWemName(), 
            name: item.getWavName(),
            language: item.getLanguage(),
            duration: duration,
            loadType: item.getLoadType(),
            soundBank: item.getReferencedBySoundBank(),
            isMissing: isMissing,
        })
    }

    // 设置第一行（表头）的样式
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'left' }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }, // 背景色黄色
    }

    // 保存文件
    const outXlsxFilePath = path.join(path.dirname(files[0].getWavFullPath()), `${soundBank.name}_mapping.xlsx`)
    await workbook.xlsx.writeFile(outXlsxFilePath)
    // console.log(`${soundBank.name}.xml 内所含的音频文件信息已导出到 ${soundBank.name}_mapping.xlsx 文件。`)
}

const write2MissingWemXlsx = async (missingWenFileList, outputDir) => {
    if (!missingWenFileList || missingWenFileList.length <= 0) return

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('丢失Wem列表')

    sheet.columns = [
        { header: '数字.wem', key: 'id', width: 15 },
        { header: '音频名', key: 'name', width: 30 },
        { header: '语言', key: 'language', width: 20 },
        { header: 'SoundBank', key: 'soundBank', width: 40 },
        { header: '所属文件夹', key: 'inputDir', width: 60 },
    ]

    missingWenFileList.forEach( item => {
        sheet.addRow({ 
            id: item.getWemName(), 
            name: item.getWavName(),
            language: item.getLanguage(),
            soundBank: item.getReferencedBySoundBank(),
            inputDir: item.getInputDir(),
        })
    })

    // 设置第一行（表头）的样式
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'left' }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }, // 背景色黄色
    }

    // 保存文件
    const outXlsxFilePath = path.join(outputDir, 'missing_wem.xlsx')
    await workbook.xlsx.writeFile(outXlsxFilePath)
    // console.log('缺失wem文件列表已保存到 missing_wem.xlsx 文件。')
}

const write2SoundBankEventsXlsx = async (eventsMap, outputDir) => {
    if (!eventsMap.keys() || eventsMap.keys().length <= 0) return

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Event映射表')

    sheet.columns = [
        { header: 'EventID', key: 'id', width: 15 },
        { header: 'EventName', key: 'name', width: 40 },
        { header: 'SoundBankName', key: 'soundBank', width: 40 },
    ]

    for (let [key, value] of eventsMap) {
        const eventId = value.getId()
        const name = value.getName()
        const belongs2SoundBanks = value.getSoundBankNames()
        for (const soundBankName of belongs2SoundBanks) {
            sheet.addRow({ 
                id: eventId, 
                name: name,
                soundBank: soundBankName,
            })
        }
        
    }

     // 设置第一行（表头）的样式
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'left' }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }, // 背景色黄色
    }

    // 保存文件
    const outXlsxFilePath = path.join(outputDir, 'sound_bank_events.xlsx')
    await workbook.xlsx.writeFile(outXlsxFilePath)
    // console.log('所有Events信息已保存到 sound_bank_events.xlsx 文件。')
}

module.exports = {
    write2SoundBankFilesMappingXlsx,
    write2MissingWemXlsx,
    write2SoundBankEventsXlsx,
}
