const path = require('path')
const audio = require('../utils/audio')

class Civ6AudioFile {
    constructor(id, name, inputDir, outputDir, language = "SFX") {
        if (!id || !name) {
            throw new Error("Both id, name, inputDir, outputDir are required");
        }       
        this.id = id
        this.name = name
        this.inputDir = inputDir
        this.outputDir = outputDir
        this.language = language
        this._audioLength = undefined
    }

    getInfo = () => {
        return `Civ6 Audio File Id: ${this.id}, name: ${this.name}, language: ${this.language}`
    }

    getWemName = () => {
        return `${this.id}.wem`
    }

    getWavName = () => {
        return this.name
    }

    getWemFullPath = () => {
        return path.join(this.inputDir, this.getWemName())
    }
    
    getWavFullPath = () => {
        return path.join(this.outputDir, this.getWavName())
    }

    setId = (id) => {
        this.id = id
    }

    setName = (name) => {
        this.name = name
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
        const durationFormmatted = `${minutes}:${seconds.toString().padStart(2, '0')}`
        return durationFormmatted
    }

    getAudioLength = async () => {
        if (this._audioLength === undefined) {
            this._audioLength = await audio.getAudioLength(this.getWemFullPath())
        } 
        return this._audioLength
    }

    setAudioLength = (audioLength) => {
        if (this._audioLength === undefined) {
            this._audioLength = audioLength
        } else {
            console.log('Audio Length can only be set once!')
        }
    }

    // 把xxxx.wem音频文件转换成xxx.wav音频方法
    convertWem2Wav = async () => {
        try {
            if (!await audio.canLoadFile(this.getWemFullPath())) {
                console.log(`生成 ${this.getWavFullPath()} 失败，原因：原音频 ${this.getWemFullPath()} 文件不存在！`)
                // TODO: 最终记录到missing.xlsx里面
                return 
            } 
            await audio.convertWem2Wav(this.getWemFullPath(), this.getWavFullPath())
        } catch (err) {
            console.log(`生成音频文件: ${this.getWavFullPath()} 失败，原因：${err}`)
        }
    }
}

module.exports = Civ6AudioFile