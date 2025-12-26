const sqlite3 = require('sqlite3').verbose()

const connectDatabase = (dbPath) => {
    try {
        return new sqlite3.Database(dbPath)
    } catch (err) {
        console.error('连接数据库失败：', err)
        return null
    }
}

const closeDatabase = (db, dbPath) => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error(`数据库 ${dbPath} 关闭失败`, err)
                reject(err)
            } else {
                console.log(`数据库 ${dbPath} 已关闭`)
                resolve()
            }
        })
    })
}

const run = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
     // 这里必须使用 `function` 保证 `this` 指向 db.run 的上下文
    db.run(sql, params, function (err) { 
        if (err) {
            console.error('RUN SQL 错误:', sql, params, err)
            reject(err)
        } else {
            resolve(this)  // 返回 `this`，也就是 `db.run` 的上下文，包含 `changes` 和 `lastID`
        }
    })
  })
}


const all = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('ALL SQL 错误：', sql, params, err)
                reject(err)
            } else {
                resolve(rows)
            }
        })
    })
}

const get = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('GET SQL 错误: ', sql, params, err)
                reject(err)
            } else {
                resolve(row)
            } 
        })
    })
}

const quoteIdent = (name) => {
    // SQLite 标识符安全引用
  return `"${String(name).replace(/"/g, '""')}"`;
}

module.exports = {
    connectDatabase,
    closeDatabase,
    run,
    all,
    get,
    quoteIdent,
}