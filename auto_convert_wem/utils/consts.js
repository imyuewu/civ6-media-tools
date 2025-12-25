const SFX = "SFX"
const ChinesePRC = "Chinese(PRC)"
const ChineseTaiwan = "Chinese(Taiwan)"
const English = "English(US)"
const French = "English(US)"
const German = "German"
const Italian = "Italian"
const Japanese = "Japanese"
const Korean = "Korean"
const Polish = "Polish"
const Russian = "Russian"
const Spanish = "Spanish(Spain)"

const CONVERT_WEM_FILE_RESULT = Object.freeze({
    SUCCESS: 0, // 成功
    MISSING_WEM_FILE_FAILURE: -1, // 缺少wem文件导致转wav失败
    OTHER_FAILURE: -2,  // 其他原因导致转wav失败
})

const AUDIO_FILE_LOAD_TYPE = Object.freeze({
    STREAMED_FILE: 'ReferencedStreamedFiles',
    MEMORY_FILE: 'IncludedMemoryFiles',
})

module.exports = {
    CONVERT_WEM_FILE_RESULT,
    AUDIO_FILE_LOAD_TYPE,
}