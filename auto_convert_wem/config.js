// 数据库路径
const DEFAULT_GAMEPLAY_DB_PATH = './civ6_db/DebugGameplay.sqlite'
const DEFAULT_LOCALIZATION_DB_PATH = './civ6_db/DebugLocalization.sqlite'
const DEFAULT_TARGET_LANGUAGE = 'zh_Hans_CN'
const SUPPORT_LANGUAGES = ['en_US', 'fr_FR', 'de_DE', 'it_IT', 'es_ES', 'ja_JP', 'ru_RU', 'pl_PL', 'ko_KR', 'zh_Hant_HK', 'zh_Hans_CN', 'pt_BR']
const BATCH_SIZE = 5000 // 每批处理多少行，越大越快，但单词事务更重，一般 2000~20000 都行

module.exports = {
    DB_TRANSLATOR: {
        DEFAULT_TARGET_LANGUAGE: DEFAULT_TARGET_LANGUAGE,
        DEFAULT_GAMEPLAY_DB_PATH: DEFAULT_GAMEPLAY_DB_PATH,
        DEFAULT_LOCALIZATION_DB_PATH: DEFAULT_LOCALIZATION_DB_PATH,
        SUPPORT_LANGUAGES: SUPPORT_LANGUAGES,
        BATCH_SIZE: BATCH_SIZE,
    },
}