class Event {
    constructor(id, name) {
        if (!id || !name) {
            throw new Error("Both id and name are required");
        }    
        this.id = id
        this.name = name
    }

    getInfo = () => {
        return `Event Id: ${this.id}, name: ${this.name}`
    }

    setId = (id) => {
        this.id = id
    }

    setName = (name) => {
        this.name = name
    }
}

module.exports = Event