const {
    Parser,
    updateParserState,
    updateParserResult,
    updateParserError,
    regexParserFactory,
    letters,
    digits,
    str,
    sequenceOf,
    choice,
    many,
    manyOne,
    between,
    sepBy,
    sepByOne,
    succeed,
    lazy,
    contextual,
    oneOrZero,
    caseStr,
    strictCaseStr,
    strictStr,
    sequenceSepBy,
    suggestions,
    eat
} = require("../parser-combinators/index");

const {
    ListStatementNode,
    SelectStatementNode,
    CreateStatementNode,
    UseStatementNode,
    InsertStatementNode,
    UpdateStatementNode,
    DeleteStatementNode,
    Identifier,
    DefinitionNode,
    IntDataTypeNode,
    CharDataTypeNode,
    AssignmentNode,
    OpExpressNode,
    literalNodeFactory,
    dropStmtNodeFactory
} = require("./element");

const space = regexParserFactory(/^\s*/, "space");

// 注意当sequenceSepBy序列里有可选的parser时，也会占用一个sep，可能会造成sep解析失败

const sequenceSepBySpace = sequenceSepBy(space);

const spaceOne = regexParserFactory(/^\s+/, "spaceOne");

const withSpace = parser => sequenceOf([space, parser, space]).map(res => res[1]);

const comma = str(",");

const commaSpace = withSpace(comma);

const sepByComma = sepByOne(commaSpace);

const digitsSpace = withSpace(digits);

const brackets = between(str("("), str(")"));

const identifier = regexParserFactory(/^[a-zA-Z_][a-zA-Z_0-9]*/, "identifier");

const ifNotExists = regexParserFactory(/^(if\s+not\s+exists)|/i, "if not exists").map(res =>
    res ? true : false
);

const dataType = regexParserFactory(/^(int)|^(char)/i, "dataType");

const typeName = dataType.chain(state => {
    const result = state.result;
    if (/int/i.test(result)) {
        return succeed(result).map(_ => new IntDataTypeNode());
    }
    if (/char/i.test(result)) {
        return brackets(digitsSpace).map(args => new CharDataTypeNode(args[1]));
    }
});

const columnDef = withSpace(sequenceOf([identifier, spaceOne, typeName])).map(
    res => new DefinitionNode("column", res[0], res[2])
);
// column_name1 data_type(size),column_name2 data_type(size),column_name3 data_type(size), .... )
const columnDefs = brackets(sepByComma(columnDef));
// (column_name1,column_name2,...)
const columns = brackets(sepByComma(identifier));
// (value1,value2,...)
const values = brackets(sepByComma(regexParserFactory(/^[^,)]+/)));

const assignment = sequenceSepBySpace([
    identifier,
    str("="),
    regexParserFactory(/(^\d+)|(^'.*?')|(^".*?")/)
]).map(result => {
    const target = new Identifier("column", result[0]);
    const value = literalNodeFactory(result[2]);
    return new AssignmentNode(target, value);
});

const assignments = sepByComma(assignment);

const star = str("*");

const op = choice([str("="), str(">"), str("<")]);

const quote = regexParserFactory(/['"]/);

const literal = choice([digits, between(quote, quote)(regexParserFactory(/^[^'"]+/))]);

const sqlStmtListParser = lazy(() =>
    manyOne(sequenceOf([withSpace(sqlStmtParser), str(";")])).map(results => {
        const newResults = results.map(v => v[0]);
        return new ListStatementNode(newResults);
    })
);

const sqlStmtParser = lazy(() =>
    choice([
        createDBStmtParser,
        createTbStmtParser,
        useTbStmtParser,
        selectStmtParser,
        insertStmtParser,
        updateStmtParser,
        deleteStmtParser,
        dropStmtParser,
        exitParser
    ])
);

const createDBStmtParser = sequenceSepBySpace([
    caseStr("create"),
    caseStr("database"),
    identifier
]).map(result => {
    const name = new Identifier("database", result[2]);
    return new CreateStatementNode("database", name);
});

const createTbStmtParser = sequenceSepBySpace([
    caseStr("create"),
    caseStr("table"),
    ifNotExists,
    identifier,
    columnDefs
]).map(result => {
    const name = new Identifier("table", result[3]);
    return new CreateStatementNode("table", name, result[4], result[2]);
});

const useTbStmtParser = sequenceSepBySpace([caseStr("use"), caseStr("database"), identifier]).map(
    result => {
        const name = new Identifier("database", result[2]);
        return new UseStatementNode(name);
    }
);

const whereClauseParser = sequenceSepBySpace([caseStr("where"), identifier, op, literal]).map(
    result => {
        const left = new Identifier("column", result[1]);
        const op = result[2];
        const right = literalNodeFactory(result[3]);
        return new OpExpressNode(op, left, right);
    }
);

const selectStmtParser = sequenceSepBySpace([
    caseStr("select"),
    choice([star, sepByComma(identifier)]),
    caseStr("from"),
    identifier,
    oneOrZero(whereClauseParser)
]).map(result => {
    const selectResults = result[1];
    const selectFrom = result[3];
    const selectWhere = result[4];
    return new SelectStatementNode(selectResults, selectFrom, selectWhere);
});

const insertStmtParser = sequenceSepBySpace([
    caseStr("insert"),
    caseStr("into"),
    identifier,
    oneOrZero(columns),
    caseStr("values"),
    values
]).map(result => {
    const table = new Identifier("table", result[2]);
    const columns = result[3];
    let columnIdentifiers;
    if (columns) {
        columnIdentifiers = [];
        for (let column of columns) {
            columnIdentifiers.push(new Identifier("column", column));
        }
    }
    const values = result[5];
    const valueIdentifiers = [];
    for (let value of values) {
        valueIdentifiers.push(literalNodeFactory(value));
    }
    return new InsertStatementNode(table, columnIdentifiers, valueIdentifiers);
});

const updateStmtParser = sequenceSepBySpace([
    caseStr("update"),
    identifier,
    caseStr("set"),
    assignments,
    oneOrZero(whereClauseParser)
]).map(result => {
    console.log(result);
    const table = result[1];
    const assignments = result[3];
    const where = result[4];
    return new UpdateStatementNode(table, assignments, where);
});

const deleteStmtParser = sequenceSepBySpace([
    caseStr("delete"),
    caseStr("from"),
    identifier,
    oneOrZero(whereClauseParser)
]).map(result => {
    const from = result[2];
    const where = result[3];
    return new DeleteStatementNode(from, where);
});

const dropStmtParser = sequenceSepBySpace([
    caseStr("drop"),
    regexParserFactory(/^table|^database/i),
    identifier
]).map(result => dropStmtNodeFactory(result[1], result[2]));

const exitParser = caseStr("exit");

// console.log(
//     JSON.stringify(
//         sqlStmtListParser.run(
//             "CREATE database test;"
//         ),
//         null,
//         "\t"
//     )
// );

// console.log(
//     JSON.stringify(
//         sqlStmtListParser.run(
//             "CREATE TABLE if not exists Persons ( PersonID int, LastName char(255), FirstName char(255), Address char(255), City char(255) );"
//         ),
//         null,
//         "\t"
//     )
// );

// console.log(
//     JSON.stringify(sqlStmtListParser.run("select foo from Foo where foo = 11;"), null, "\t")
// );

// console.log(
//     JSON.stringify(
//         sqlStmtListParser.run(
//             "INSERT INTO Customers (CustomerName, ContactName, Address, City, PostalCode, Country) VALUES ('Cardinal',21 ,'Skagen 21','Stavanger','4006','Norway'); "
//         ),
//         null,
//         "\t"
//     )
// );

// console.log(
//     JSON.stringify(
//         sqlStmtListParser.run(
//             "UPDATE Customers SET ContactName='Alfred Schmidt', City='Hamburg' WHERE CustomerName='Alfreds Futterkiste'; "
//         ),
//         null,
//         "\t"
//     )
// );

console.log(
    JSON.stringify(
        sqlStmtListParser.run(" DELETE FROM table_name WHERE some_column='some_value';"),
        null,
        "\t"
    )
);
// const lastMatchedToken = sqlStmtListParser.run("use database").lastMatchedToken;

// console.log(lastMatchedToken);

// for (val of suggestions[lastMatchedToken].values()) {
//     console.log(val);
// }

// sqlStmtListParser.run(
//     "CREATE TABLE if not exists Persons ( PersonID int, LastName char(255), FirstName char(255), Address char(255), City char(255) );"
// )
