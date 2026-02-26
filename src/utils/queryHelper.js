const queryHelper = {
    
    // Fixed: syntax error in VALUES ({...}) -> VALUES (...)
    generateInsert: (table, columns, dialect) => {
        const cols = columns.filter(c => !c.isPrimary).map(c => c.name);

        let placeholders;
        if (dialect === 'postgres') {
            placeholders = cols.map((_, i) => `$${i + 1}`);
        } else {
            placeholders = cols.map(() => `?`);
        }

        const colString = cols.join(', ');
        const valString = placeholders.join(', ');

        // REMOVED extra curly braces around valString
        let sqlQuery = `INSERT INTO ${table} (${colString}) VALUES (${valString})`;

        if (dialect === 'postgres') sqlQuery += ' RETURNING *';

        return sqlQuery;
    },
    
    generateSelectAll: (table) => {
        return `SELECT * FROM ${table}`;
    },

    // FIXED: Order of arguments (table, columns, dialect)
    generateSelectOne: (table, columns, dialect) => {
        // Now 'columns' is actually the array, so .find() works
        const pk = columns.find(c => c.isPrimary) || { name: 'id' };
        
        const placeholder = dialect === 'postgres' ? '$1' : '?';
        return `SELECT * FROM ${table} WHERE ${pk.name} = ${placeholder}`;
    },

    generateUpdate: (table, columns, dialect) => {
        const pk = columns.find(c => c.isPrimary) || { name: 'id' };
        const dataCols = columns.filter(c => !c.isPrimary).map(c => c.name);

        let setClause;
        let whereClause;

        if (dialect === 'postgres') {
            setClause = dataCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
            const idIndex = dataCols.length + 1; 
            whereClause = `${pk.name} = $${idIndex}`;
        } else {
            setClause = dataCols.map(col => `${col} = ?`).join(', ');
            whereClause = `${pk.name} = ?`;
        }

        let sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        
        if (dialect === 'postgres') sql += ' RETURNING *';
        
        return sql;
    },

    generateDelete: (table, columns, dialect) => {
        const pk = columns.find(c => c.isPrimary) || { name: 'id' };
        
        const placeholder = dialect === 'postgres' ? '$1' : '?';
        let sql = `DELETE FROM ${table} WHERE ${pk.name} = ${placeholder}`;

        if (dialect === 'postgres') sql += ' RETURNING *';

        return sql;
    }
};

module.exports = queryHelper;