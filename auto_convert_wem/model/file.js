class File {
    constructor(id, name, language = "SFX") {
        if (!id || !name) {
            throw new Error("Both id and name are required");
        }       
        this.id = id
        this.name = name
        this.language = language
    }

    getInfo = () => {
        return `File Id: ${this.id}, name: ${this.name}, language: ${this.language}`
    }

    getWemName = () => {
        return `${this.id}.wem`
    }

    getWavName = () => {
        return this.name
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
}

module.exports = File