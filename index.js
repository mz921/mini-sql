const sqlParser = require("./ast");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { datatypeChecker, dataSelector} = require("./helper")

const testSql =
    "select LastName from Persons where PersonID = 1234;";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let currentDB = "";

const useDatabaseChecker = (variant, handler) => {
    if (variant === "use" || variant === "create" || variant === "list") {
        return handler;
    } else {
        return (...args) => {
            if (currentDB === "") {
                console.log("database has not been used yet");
                return;
            }
            handler(...args);
        };
    }
};

const listHandler = (listNode, astIterator) => {
    listNode.statements.forEach(statement => {
        astIterator(statement);
    });
};

const createHandler = (createNode, astIterator) => {
    if (createNode.format === "database") {
        const name = astIterator(createNode.name);
        createDB(name);
    } else if (createNode.format === "table") {
        const name = astIterator(createNode.name);
        const definitions = createNode.definitions.map(def => astIterator(def)).reduce((prev, curr) => {
            prev[curr.name] = {...curr}
            delete prev[curr.name]['name']
            return prev
        }, {});
        const conditions = createNode.conditions;
        createTable(name, definitions, conditions);
    }
};

const createDB = name => {
    const dbPath = path.resolve(__dirname, `${name}.json`);
    const dbMetaPath = path.resolve(__dirname, `${name}.meta.json`);
    if (fs.existsSync(dbPath) || fs.existsSync(dbMetaPath)) {
        console.log("database has existed. It will be overwrited in dev env");
    }
    fs.closeSync(fs.openSync(dbMetaPath, "w"));
    fs.closeSync(fs.openSync(dbPath, "w"));
    console.log(`database ${name} has been created successfully`);
};

const createTable = (name, definitions, conditions) => {
    if (currentDB === "") {
        console.log("database has not been used yet");
        return;
    }
    const dbPath = path.resolve(__dirname, `${currentDB}.meta.json`);
    try {
        const db = fs.readFileSync(dbPath, "utf8");
        const dbObj = (db && JSON.parse(db)) || {};
        if (conditions && db[name]) {
            console.log("table has existed");
            return;
        }
        dbObj[name] = {
            definitions
        };
        fs.writeFileSync(dbPath, JSON.stringify(dbObj));
    } catch (e) {
        console.log(e);
    }
};

const useHandler = (node, astIterator) => {
    currentDB = astIterator(node.name);
};

const selectHandler = (node, astIterator) => {
    const dbDataPath = path.resolve(__dirname, `${currentDB}.json`)
    const result = node.result
    const selectedTable = node.from
    const filter = astIterator(node.where)
    try {
        const dbData = fs.readFileSync(dbDataPath, "utf8");
        if(dbData) {
            const dbDataObj = JSON.parse(dbData)
            console.log(dataSelector(dbDataObj[selectedTable], filter, result))
        }
    } catch (e) {
        console.log(e);
    }
};

const insertHandler = (node, astIterator) => {
    const dbPath = path.resolve(__dirname, `${currentDB}.meta.json`);
    const dbDataPath = path.resolve(__dirname, `${currentDB}.json`)
    const intoTable = astIterator(node.intoTable)

    try {
        const db = fs.readFileSync(dbPath, "utf8");
        const dbObj = (db && JSON.parse(db)) || {};
        const table = dbObj[intoTable]
        if (!table){
            console.log("Table has been not created yet")
            return
        }
        const definitions = table.definitions
        // assume intoColumns length === results length
        const insertData = node.intoColumns.reduce((prev, cur, index) => {
            prev[cur.name] = node.results[index].value
            return prev
        }, {})
        
        Object.keys(insertData).forEach(dataName => {
            if(!datatypeChecker(definitions[dataName], insertData[dataName])){
                console.log(definitions[data.name], data.value)
                throw new Error('datatype does not matched')
            }
        })

        // need to be optimized: can use stream
        const dbData = fs.readFileSync(dbDataPath, "utf8")
        const dbDataObj = dbData && JSON.parse(dbData) || {}

        dbDataObj[intoTable] ? 
        dbDataObj[intoTable].push(insertData) :
        dbDataObj[intoTable] = [insertData]

        fs.writeFileSync(dbDataPath, JSON.stringify(dbDataObj));


    }catch(e) {
        console.log(e)
    }
    
};

const nodeHandlers = {
    list: listHandler,
    create: createHandler,
    use: useHandler,
    select: selectHandler,
    insert: insertHandler
};

const astIterator = node => {
    switch (node.type) {
        case "statement":
            const handler = useDatabaseChecker(node.variant, nodeHandlers[node.variant]);
            return handler(node, astIterator);
        case "identifier":
                return node.name;
        case "definitionNode":
            if (node.variant === "column") {
                return {
                    name: node.name,
                    ...astIterator(node.datatype)
                };
            }
        case "datatype":
            return {
                datatype: node.variant,
                args: node.args
            };
        case "literal": 
            return node.value
        case "express":
            if (node.variant === "operation"){
                return {
                    operation: node.operation,
                    key: astIterator(node.left),
                    value: astIterator(node.right)
                }
            }
    }
}

function main() {
    rl.on("line", sql => {
        try {
            const res = sqlParser.run(sql);
            if (!res.isError) {
                const root = res.result;
                astIterator(root);
            } else {
                console.log("parsing error");
                console.log(res);
            }
        } catch (e) {
            console.log("unknown error");
            console.log(e);
        }
    });
}

// console.log(JSON.stringify(sqlParser.run(testSql), null, "\t"));
main()
