const path = require('path')
const fs = require('fs')
const dbHelper = require('./utils/db_helper')
const config = require('./config')
const utils = require('./utils/utils')

let logFilePath = ''

/**
 * 使用Localization数据库内文本
 * 自动替换Gameplay数据库内LOC_字段
 * 内存优化版本，可以设置每次批量操作的行数，可控制数据库操作内存占用
 * 防止内存爆炸
 * @param { 文明6 DebugGamePlay.sqlite数据库地址 } gameplayDBPath 
 * @param { 文明6 DebugLocalization.sqlite数据库地址 } localizationDBPath 
 * @param { 需要把GamePlay里面内容替换成的目标语言 } language 
 */
const workWithTransaction = async (gameplayDBPath, localizationDBPath, language) => {
    // 连接DebugGameplay数据库
    const db = dbHelper.connectDatabase(gameplayDBPath)

    // 加速设置（对批量更新很重要）
    await run(db, `PRAGMA journal_mode = WAL;`)
    await run(db, `PRAGMA synchronous = NORMAL;`)
    await run(db, `PRAGMA temp_store = MEMORY;`)
    await run(db, `PRAGMA cache_size = -500000;`) // 约 500MB cache（可按机器调小/调大）
    await run(db, `PRAGMA foreign_keys = OFF;`)

    // 把本地化库 attach 进来，用 SQL 直接查
    await run(db, `ATTACH DATABASE ? AS loc;`, [localizationDBPath])
    
    // 建一个临时索引化映射表（只存中文那一份），避免每次都扫 loc.LocalizedText
    await run(db, `DROP TABLE IF EXISTS temp.loc_map;`)
    await run(db, `
        CREATE TEMP TABLE loc_map(
        Tag  TEXT PRIMARY KEY,
        Text TEXT
        );
    `)

    await run(db, `
        INSERT INTO loc_map(Tag, Text)
        SELECT Tag, Text
        FROM loc.LocalizedText
        WHERE Language = ?;
    `, [language])

    await run(db, `CREATE INDEX IF NOT EXISTS idx_loc_map_tag ON loc_map(Tag);`)
    
    // 拿所有表
    const tables = await all(db, `
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%';
    `)

    console.log(`一共有Tables: ${tables.length} 张表`);

    for (const t of tables) {
        const tableName = t.name
        const qTable = quoteIdent(tableName)

        // 获取列信息，只处理“看起来像文本”的列
        const cols = await all(db, `PRAGMA table_info(${qTable});`)
        const textCols = cols
        .map(c => ({ name: c.name, type: (c.type || "").toUpperCase() }))
        .filter(c => c.type.includes("TEXT") || c.type === "") /* 有些表 type 为空也可能存文本 */

        if (textCols.length === 0) continue

        console.log(`\n== ${tableName} == TEXT cols: ${textCols.length}`)

        for (const c of textCols) { 
            const col = c.name
            const qCol = quoteIdent(col)

            // 快速判断：这一列有没有 LOC_ 开头的数据，没有就跳过
            const probe = await get(db, `
                SELECT 1 AS hit
                FROM ${qTable}
                WHERE ${qCol} LIKE 'LOC_%'
                LIMIT 1;
            `)

            if (!probe) continue

            console.log(`  -> processing column: ${col}`)

            let lastRowId = 0
            let totalChanges = 0

            while (true) {
                // 先取这一批要处理的 rowid（只取 rowid，不取整行）
                const batchRowIds = await all(db, `
                    SELECT rowid AS rid
                    FROM ${qTable}
                    WHERE rowid > ?
                        AND ${qCol} LIKE 'LOC_%'
                    ORDER BY rowid
                    LIMIT ?;
                    `, [lastRowId, config.DB_TRANSLATOR.BATCH_SIZE]
                )

                if (batchRowIds.length === 0) {
                    console.log(`没有更多数据，退出循环`)
                    break // 如果没有数据，退出循环
                }

                // 更新游标
                lastRowId = batchRowIds[batchRowIds.length - 1].rid

                // 事务包住一批
                await run(db, `BEGIN;`)

                // 用 rowid IN (...) 做批量更新，并且只在 loc_map 里存在的 Tag 才替换
                const placeholders = batchRowIds.map(() => "?").join(",")
                const ridParams = batchRowIds.map(r => r.rid)

                const updateSql = `
                    UPDATE ${qTable}
                    SET ${qCol} = (
                        SELECT Text FROM loc_map WHERE Tag = ${qTable}.${qCol}
                    )
                    WHERE rowid IN (${placeholders})
                        AND ${qCol} IN (SELECT Tag FROM loc_map);
                `

                const res = await run(db, updateSql, ridParams)

                await run(db, `COMMIT;`)

                totalChanges += res.changes || 0;
                // 打印进度
                // console.log(`     batch updated: ${res.changes || 0}, lastRowId=${lastRowId}`)
            }

            if (totalChanges > 0) {
                console.log(`     updated ${totalChanges} rows in ${tableName}.${col}`)
            }
        }
    }

    await run(db, `DETACH DATABASE loc;`);

    // 关闭数据库
    await closeDatabase(db)
}

const workWithInefficientMethod = async (gameplayDBPath, localizationDBPath, language) => {
    // 连接数据库
    const gameplayDB = dbHelper.connectDatabase(gameplayDBPath)
    const localicationDB = dbHelper.connectDatabase(localizationDBPath)

    const fetchAllTablesSQL = "SELECT name FROM sqlite_master WHERE type='table';"
    const tables = await dbHelper.all(gameplayDB, fetchAllTablesSQL, [])
    for (const t of tables) {
        const tName = t.name
        const fetchAllColumnsInfoSQL = `PRAGMA table_info(${tName});`
        const columns = await dbHelper.all(gameplayDB, fetchAllColumnsInfoSQL, [])
        for (const c of columns) {
            const cName = c.name
            const fetchAllLOCValuesInColumnSQL = `SELECT DISTINCT ${cName} FROM ${tName} WHERE ${cName} LIKE 'LOC_%';`
            const locValues = await dbHelper.all(gameplayDB, fetchAllLOCValuesInColumnSQL, [])
            for (const locValue of locValues) {
                const locTag = locValue[cName]

                const queryTargetLocalizedTextSQL = `SELECT Text FROM LocalizedText WHERE Language = '${language}' AND Tag = '${locTag}'`
                const localizedText = await dbHelper.get(localicationDB, queryTargetLocalizedTextSQL, [])
                if (!localizedText || !localizedText.Text || localizedText.Text.trim() === '') {
                    const message = `‼️表: ${tName} - 列: ${cName} - 值: ${locTag} 在 Localization 表内找不到对应的翻译文本，或者翻译文本为空，跳过替换!‼️`
                    console.log(message)
                    utils.logToFile(logFilePath, message)
                    continue
                }
                const targetLanguageText = localizedText.Text
                // 更新之前先查询键值对，防止UNIQUE约束冲突
                const cleanText = utils.cleanText(targetLanguageText) // 删除Localization文本可能存在动态占位符和格式化字符串，三元表达式等
                const exists = await dbHelper.get(gameplayDB,  `SELECT * FROM ${tName} WHERE ${cName} = ? LIMIT 1`, [cleanText])
                if (exists) {
                    // 存在主键约束冲突，则日志输出该行数据
                    const message = `‼️出现主键冲突，表：${tName}, 已有数据: ${JSON.stringify(exists)}\n待替换的LOC_值：${locTag}, 该值替换自动跳过，请手动修改！‼️`
                    console.log(message)
                    utils.logToFile(logFilePath, message)
                    continue
                } else {
                    await dbHelper.run(gameplayDB, `UPDATE ${tName} SET ${cName} = ? WHERE ${cName} = ?`, [targetLanguageText, locTag])
                }
            }
        }
    }

    // 关闭数据库
    await dbHelper.closeDatabase(gameplayDB, gameplayDBPath)
    await dbHelper.closeDatabase(localicationDB, localizationDBPath)
}

const translateToLanguage = async (gameplayDBPath, localizationDBPath, language) => {
    try {
        gameplayDBPath = path.resolve(gameplayDBPath)
        localizationDBPath = path.resolve(localizationDBPath)

        // 先生成一个DebugGameplay_targetLanguage.sqlite文件，以防写坏原文件
        const gameplayDBOutputPath = await createOutGameplayDBFile(gameplayDBPath, language)
        // 在DebugGameplay_targetLanguage.sqlite同级生成一个日志文件，记录替换中出现的异常情况
        logFilePath = path.join(path.dirname(gameplayDBOutputPath), 'auto_translate.log')
        // 开始自动文本替换
        await workWithInefficientMethod(gameplayDBOutputPath, localizationDBPath, language)
    } catch (err) {
        console.error('翻译GamePlay数据库失败: ', err)
    }
}

const createOutGameplayDBFile = async (source, translateToLanguage) => {
    const destination = destinationForOutGameplayDBFile(source, translateToLanguage)
    try {
        // 如果目标文件存在则先删除再拷贝
        try {
            await fs.promises.access(destination)
            await fs.promises.unlink(destination)
        } catch (err) {
            if (err.code != 'ENOENT') { throw err }
        }
        await fs.promises.copyFile(source, destination)
        console.log(`创建目标文件 ${destination} 成功。`)
        return destination
    } catch (err) {
        console.error(`创建目标文件 ${destination} 失败：${err}`)
        return null
    }
}

const destinationForOutGameplayDBFile = (source, targetLanguage) => {
    if (!source || !targetLanguage) return ''
    const dirPath = path.dirname(source)
    const extname = path.extname(source)
    const filenameWithoutExt = path.basename(source, extname) 
    const destination = path.join(dirPath, `${filenameWithoutExt}_${targetLanguage}${extname}`)
    
    return destination
}

module.exports = {
    translateToLanguage,
}