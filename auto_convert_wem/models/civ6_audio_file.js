const path = require('path')
const audio = require('../utils/audio')
const utils = require('../utils/utils')
const CONSTS = require('../utils/consts')

class Civ6AudioFile {
    constructor(id, name, loadType, referencedBySoundBank, inputDir, outputDir, language = "SFX") {
        if (!id || !name || !loadType || !referencedBySoundBank || !inputDir || !outputDir) {
            throw new Error("Both id, name, loadType, referencedBySoundBank, inputDir, outputDir are required");
        }       
        this.id = id
        this.name = name
        this.language = language
        this.loadType = loadType
        this.referencedBySoundBank = referencedBySoundBank 
        this.inputDir = inputDir
        this.outputDir = outputDir
        this._audioLength = undefined
        this._isWemFileMissing = undefined
    }

    getInfo = () => {
        return `Civ6 Audio File Id: ${this.id}, name: ${this.name}, language: ${this.language}`
    }

    getWemName = () => {
        return `${this.id}.wem`
    }

    getLoadType = () => {
        return this.loadType
    }

    getWavName = () => {
        return this.name
    }

    getReferencedBySoundBank = () => {
        return this.referencedBySoundBank
    }

    getInputDir = () => {
        return this.inputDir
    }

    getOutPutDir = () => {
        return this.outputDir
    }

    getWemFullPath = () => {
        return path.join(this.inputDir, this.getWemName())
    }
    
    getWavFullPath = () => {
        return path.join(this.outputDir, this.language, this.referencedBySoundBank, this.getWavName())
    }

    getIsWemFileMissing = () => {
        if (this._isWemFileMissing === undefined) {
            this._isWemFileMissing = !utils.checkFileOrDirExistsSync(this.getWemFullPath())
        }
        return this._isWemFileMissing
    }

    getLanguage = () => {
        return this.language
    }

    setId = (id) => {
        this.id = id
    }

    setName = (name) => {
        this.name = name
    }

    setLoadType = (loadType) => {
        this.loadType = loadType
    }

    setReferencedBySoundBank = (referencedBySoundBank) => {
        this.referencedBySoundBank = referencedBySoundBank
    }

    setInputDir = (inputDir) => {
        this.inputDir = inputDir
    }

    setOutputDir = (outputDir) => {
        this.outputDir = outputDir
    }

    setLanguage = (language) => {
        this.language = language
    }

    getAudioLengthFormatted = async () => {
        const durationInSeconds = await this.getAudioLength()
        const minutes = Math.floor(durationInSeconds / 60)
        const seconds = Math.floor(durationInSeconds % 60)

        // 格式化时长为 mm:ss
        const durationFormmatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        return durationFormmatted
    }

    getAudioLength = async () => {
        if (this._audioLength === undefined) {
            if (this.getIsWemFileMissing()) {
                this._audioLength = 0
                return
            }
            this._audioLength = await audio.getAudioLength(this.getWemFullPath())
        } 
        return this._audioLength
    }

    setAudioLength = (audioLength) => {
        if (this._audioLength === undefined) {
            this._audioLength = audioLength
        } else {
            console.error('Audio Length can only be set once!')
        }
    }

    setIsWemFileMissing = (isMissing) => {
        if (this._isWemFileMissing === undefined) {
            this._isWemFileMissing = isMissing
        } else {
            console.error('Is wem file missing can only be set once!')
        }
    }

    // 把xxxx.wem音频文件转换成xxx.wav音频方法
    convertWem2Wav = async () => {
        try {
            if (!await audio.canLoadWemFile(this.getWemFullPath())) {
                console.log(`生成 ${this.getWavFullPath()} 失败，原因：原音频 ${this.getWemFullPath()} 文件不存在！`)
                this.setIsWemFileMissing(true)
                return CONSTS.CONVERT_WEM_FILE_RESULT.MISSING_WEM_FILE_FAILURE
            } 
            await audio.convertWem2Wav(this.getWemFullPath(), this.getWavFullPath())
            return CONSTS.CONVERT_WEM_FILE_RESULT.SUCCESS
        } catch (err) {
            console.log(`生成音频文件: ${this.getWavFullPath()} 失败，原因：${err}`)
            return CONSTS.CONVERT_WEM_FILE_RESULT.OTHER_FAILURE
        }
    }
}

module.exports = Civ6AudioFile