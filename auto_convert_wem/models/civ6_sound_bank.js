const Civ6Event = require('./civ6_event')
const Civ6AudioFile = require('./civ6_audio_file')
const CONSTS = require('../utils/consts')

class Civ6SoundBank {
    constructor(id, name, language = "SFX", events = [], streamedFiles = [], memoryFiles = []) {
        
        this.id = id
        this.name = name
        this.language = language

        if (!Array.isArray(events)) {
            throw new Error('events 参数必须是一个数组')
        }
        if (!events.every(event => event instanceof Civ6Event)) {
            throw new Error('events 数组中的每个元素必须是 Civ6Event 类型的实例')
        }

        this.events = events

        if (!Array.isArray(streamedFiles)) {
            throw new Error('streamedFiles 参数必须是一个数组')
        }
        if (!streamedFiles.every(streamedFile => streamedFile instanceof Civ6AudioFile)) {
            throw new Error('streamedFiles 数组中的每个元素必须是 Civ6AudioFile 类型的实例')
        }

        this.streamedFiles = streamedFiles

        if (!Array.isArray(memoryFiles)) {
            throw new Error('memoryFiles 参数必须是一个数组')
        }
        if (!memoryFiles.every(memoryFile => memoryFile instanceof Civ6AudioFile)) {
            throw new Error('memoryFiles 数组中的每个元素必须是 Civ6AudioFile 类型的实例')
        }

        this.memoryFiles = memoryFiles
    }

    getInfo = () => {
        return `Sound Bank Id: ${this.id}, name: ${this.name}, language: ${this.language}`
    }

    setId = (id) => {
        this.id = id
    }

    setName = (name) => {
        this.name = name
    }

    setLanguage = (language) => {
        this.language = language
    }

    setEvents = (events) => {
        this.events = events
    }

    setStreamedFiles = (streamedFiles) => {
        this.streamedFiles = streamedFiles
    }

    setMemoryFiles = (memoryFiles) => {
        this.memoryFiles = memoryFiles
    }

    getId = () =>{
        return this.id
    }

    getName = () => {
        return this.name
    }

    getLanguage = () => {
        return this.language
    }

    getEvents = () => {
        return this.events
    }

    getStreamedFiles = () => {
        return this.streamedFiles
    }

    getMemoryFiles = () => {
        return this.memoryFiles
    }

    batchConvertWem2Wav = async () => {
        const files = this.getStreamedFiles()
        const missingWemFiles = []
        let isAllSuccess = true
        for (const file of files) {
            const result = await file.convertWem2Wav()
            if (result === CONSTS.CONVERT_WEM_FILE_RESULT.SUCCESS) continue
            isAllSuccess = false
            if (result === CONSTS.CONVERT_WEM_FILE_RESULT.MISSING_WEM_FILE_FAILURE) {
                missingWemFiles.push(file)
            }
        }
        return {
            isAllSuccess: isAllSuccess,
            missingWemFiles: missingWemFiles
        }
    }
}

module.exports = Civ6SoundBank