const utils = require('../utils/utils')

class Civ6Event {
    constructor(id, name, soundBankName) {
        if (!id || !name) {
            throw new Error("Both id and name are required");
        }    
        this.id = id
        this.name = name
        this.soundBankNames = new Set()
        if (utils.isNonEmptyString(soundBankName)) {
            this.soundBankNames.add(soundBankName)
        }
    }

    getId = () => {
        return this.id
    }

    getName = () => {
        return this.name
    }

    getSoundBankNames = () => {
        return this.soundBankNames
    }

    getInfo = () => {
        return `Event Id: ${this.id}, name: ${this.name}, belongs to sound banks: ${this.soundBankNames}`
    }

    setId = (id) => {
        this.id = id
    }

    setName = (name) => {
        this.name = name
    }

    setSoundBankNames = (soundBankNames) => {
        this.soundBankNames = soundBankNames
    }

    mergeSoundBankNames = (otherEvent) => {
        otherEvent.soundBankNames.forEach(item => this.soundBankNames.add(item))
        return this.soundBankNames
    }

    equals = (otherEvent) => {
        return otherEvent instanceof Event && this.id === otherEvent.id
    }

    toString = () => {
        return this.info()
    }
}

module.exports = Civ6Event