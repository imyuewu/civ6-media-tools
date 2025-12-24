const fs = require('fs')
const { spawn } = require('child_process')


const VGMSTREAM_CLI = 'vgmstream-cli'

const convertWem2Wav = async (inputFile, outputFile) => {
    return new Promise((resolve, reject) => {
        const command = spawn(VGMSTREAM_CLI, ['-o', outputFile, inputFile])
        let stdoutData = ''
        let stderrData = ''

        command.stdout.on('data', (data) => {
            stdoutData += data.toString()
        })

        command.stderr.on('data', (data) => {
            stderrData += data.toString()
        })

        command.on('close', (code) => {
            if (code === 0) {
                // console.log(stdoutData)
                // console.log(`${inputFile} => ${outputFile} 成功`)
                resolve(stdoutData)
            } else {
                console.error(`${inputFile} => ${outputFile} 失败`)
                console.error(stderrData)
                reject(new Error(`命令执行失败，退出码: ${code}`))
            }
        })
    })
}

const canLoadFile = async (filepath) => {
    try {
        const stats = await fs.promises.stat(filepath)
        if (stats.isFile()) {
            return true
        } else {
            // console.log(`Load ${this.filepath} fail： It's not a file!`)
            return false
        }
    } catch (err) {
        // console.log(`Load ${filepath} fail： ${err}`)
        return false
    }
}

const getAudioLength = async (inputFile) => {
    return new Promise((resolve, reject) => {
        const command = spawn(VGMSTREAM_CLI, ['-I', inputFile])

        let stdoutData = '';
        let stderrData = '';

        // 捕获标准输出
        command.stdout.on('data', (data) => {
            stdoutData += data.toString()
        });

        // 捕获标准错误输出
        command.stderr.on('data', (data) => {
            stderrData += data.toString()
        });

        // 监听命令执行结束
        command.on('close', (code) => {
            if (code === 0) {
                try {
                    // 解析输出的 JSON 数据
                    const data = JSON.parse(stdoutData)
                    const numberOfSamples = data.numberOfSamples
                    const sampleRate = data.sampleRate

                    // 计算时长(秒)
                    const durationInSeconds = Math.trunc(numberOfSamples / sampleRate)
                    
                    resolve(durationInSeconds)
                } catch (err) {
                    reject(new Error('无法解析音频信息'))
                }
            } else {
                console.error('命令执行失败')
                console.error(stderrData)
                reject(new Error(`命令执行失败，退出码: ${code}`))
            }
        })
    })
}


module.exports = {
    convertWem2Wav,
    canLoadFile,
    getAudioLength
}