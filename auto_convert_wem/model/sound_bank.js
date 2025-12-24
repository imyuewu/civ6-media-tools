const Event = require('./event')
const File = require('./file')

class SoundBank {
    constructor(id, name, language = "SFX", events = [], streamedFiles = [], memoryFiles = []) {
        
        this.id = id
        this.name = name
        this.language = language

        if (!Array.isArray(events)) {
            throw new Error('events 参数必须是一个数组')
        }
        if (!events.every(event => event instanceof Event)) {
            throw new Error('events 数组中的每个元素必须是 Event 类型的实例')
        }

        this.events = events

        if (!Array.isArray(streamedFiles)) {
            throw new Error('streamedFiles 参数必须是一个数组')
        }
        if (!streamedFiles.every(streamedFile => streamedFile instanceof File)) {
            throw new Error('streamedFiles 数组中的每个元素必须是 File 类型的实例')
        }

        this.streamedFiles = streamedFiles

        if (!Array.isArray(memoryFiles)) {
            throw new Error('memoryFiles 参数必须是一个数组')
        }
        if (!memoryFiles.every(memoryFile => memoryFile instanceof File)) {
            throw new Error('memoryFiles 数组中的每个元素必须是 File 类型的实例')
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
}

module.exports = SoundBank