export async function insert(db: D1Database, sql: string, bind: unknown[]): Promise<Boolean | null> {
  try {
    let stmt = db.prepare(sql);
    if (stmt && bind.length > 0) {
      stmt = stmt.bind(...bind);
    }
    const {success} = await stmt.run()
    if (success) {
      return success
    } else {
      throw new Error('Insert failed')
    }
  } catch (error) {
    throw error;
  }
}

export async function bulkInsert(db: D1Database, sql: string, binds: unknown[][]): Promise<Boolean | null> {
  try {
    let stmt = db.prepare(sql);
    if (!stmt || binds.length <= 0) {
      return false
    }
    const statements = binds.map(bind => stmt.bind(...bind))
    const rows = await db.batch(statements)
    console.log(rows)
    if (rows) {
      return true
    } else {
      throw new Error('Insert failed')
    }
  } catch (error) {
    throw error;
  }
}

