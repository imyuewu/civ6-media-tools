const utils = require('../utils/utils')

class Civ6Event {
    constructor(id, name, soundBankName) {
        if (!id || !name) {
            throw new Error("Both id and name are required");
        }    
        this.id = id
        this.name = name
        this.soundBankNames = []
        if (utils.isNonEmptyString(soundBankName)) {
            this.soundBankNames.push(soundBankName)
        }
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

    mergeSoundBankNames = (otherEvent) => {
        const mergedSoundBankNames = new Set([...this.soundBankNames, ...otherEvent.soundBankNames])
        return Array.from(mergedSoundBankNames)
    }

    equals = (otherEvent) => {
        return otherEvent instanceof Event && this.id === otherEvent.id
    }

    toString = () => {
        return this.info()
    }
}

module.exports = Civ6Event