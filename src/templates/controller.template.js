const queryHelper = require('../utils/queryHelper');

function generateController(tableName, columns, dialect, operations) {
    const functions = [];
    
    const pk = columns.find(c => c.isPrimary) || { name: 'id' };
    const validCols = columns.filter(c => !c.isPrimary).map(c => c.name);
    
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const singular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    const resourceName = capitalize(singular); 

    if (operations.includes('create')) {
        const sql = queryHelper.generateInsert(tableName, columns, dialect);
        const params = validCols.join(', ');
        const values = validCols.join(', ');
        
        const dbCall = dialect === 'postgres' 
            ? `const { rows } = await db.query(sql, [${values}]);`
            : `const [result] = await db.execute(sql, [${values}]);`;

        const response = dialect === 'postgres'
            ? `res.status(201).json(rows[0]);`
            : `res.status(201).json({ id: result.insertId, message: 'Created successfully' });`;

        const code = `
exports.create${resourceName} = async (req, res) => {
    try {
        const { ${params} } = req.body;
        const sql = \`${sql}\`;
        
        ${dbCall}
        ${response}
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};`;
        functions.push({ name: `exports.create${resourceName}`, code });
    }

    if (operations.includes('read')) {
        const sql = queryHelper.generateSelectAll(tableName);
        
        const dbCall = dialect === 'postgres'
            ? `const { rows } = await db.query(sql);`
            : `const [rows] = await db.execute(sql);`;

        const code = `
exports.getAll${resourceName}s = async (req, res) => {
    try {
        const sql = \`${sql}\`;
        ${dbCall}
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};`;
        functions.push({ name: `exports.getAll${resourceName}s`, code });

        const sqlOne = queryHelper.generateSelectOne(tableName, columns, dialect);
        
        const dbCallOne = dialect === 'postgres'
            ? `const { rows } = await db.query(sql, [${pk.name}]);`
            : `const [rows] = await db.execute(sql, [${pk.name}]);`;

        const codeOne = `
exports.get${resourceName}ById = async (req, res) => {
    try {
        const { ${pk.name} } = req.params;
        const sql = \`${sqlOne}\`;
        
        ${dbCallOne}
        const data = rows[0];

        if (!data) return res.status(404).json({ message: 'Not found' });
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};`;
        functions.push({ name: `exports.get${resourceName}ById`, code: codeOne });
    }

    if (operations.includes('update')) {
        const sql = queryHelper.generateUpdate(tableName, columns, dialect);
        const params = validCols.join(', ');
        
        const dbCall = dialect === 'postgres'
            ? `await db.query(sql, [${params}, ${pk.name}]);`
            : `await db.execute(sql, [${params}, ${pk.name}]);`;

        const code = `
exports.update${resourceName} = async (req, res) => {
    try {
        const { ${pk.name} } = req.params;
        const { ${params} } = req.body;
        
        const sql = \`${sql}\`;
        ${dbCall}
        
        res.json({ message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};`;
        functions.push({ name: `exports.update${resourceName}`, code });
    }

    if (operations.includes('delete')) {
        const sql = queryHelper.generateDelete(tableName, columns, dialect);
        
        const dbCall = dialect === 'postgres'
            ? `await db.query(sql, [${pk.name}]);`
            : `await db.execute(sql, [${pk.name}]);`;

        const code = `
exports.delete${resourceName} = async (req, res) => {
    try {
        const { ${pk.name} } = req.params;
        const sql = \`${sql}\`;
        
        ${dbCall}
        
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};`;
        functions.push({ name: `exports.delete${resourceName}`, code });
    }

    return functions;
}

module.exports = generateController;