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
    suggestions
} = require("./lib");

const space = regexParserFactory(/^\s*/, "space");

const spaceOne = regexParserFactory(/^\s+/, "spaceOne");

const brackets = between(str("("), str(")"));

const identifier = regexParserFactory(/^[a-zA-Z_][a-zA-Z_0-9]*/, "identifier");

const ifNotExists = regexParserFactory(/^(if\s+not\s+exists)|/i, "if not exists").map(res =>
    res ? true : false
);

const dataType = regexParserFactory(/^(int)|^(char)/i, "dataType");

const typeName = dataType.chain(result => {
    if (/int/i.test(result)) {
        return succeed(result);
    }
    if (/char/i.test(result)) {
        return brackets(sequenceOf([space, digits, space]).map(args => ({ args: args[1] })));
    }
});

const columnDef = sequenceOf([space, identifier, spaceOne, typeName, space]).map(res => ({
    name: res[1],
    dataType: res[3]
}));

// 注意当sequenceSepBy序列里有可选的parser时，也会占用一个sep，可能会造成sep解析失败
const sequenceSepByComma = sequenceSepBy(sequenceOf([space, str(","), space]));

const sequenceSepBySpace = sequenceSepBy(space);

const sqlStmtListParser = lazy(() =>
    manyOne(sequenceOf([space, sqlStmtParser, space, str(";")])).map(results => {
        const newResults = results.map(v => v[1]);
        return { type: "statement", variant: "list", statement: newResults };
    })
);

const sqlStmtParser = lazy(() => choice([createDBStmtParser, createTbStmtParser, useTbStmtParser]));

const createDBStmtParser = sequenceSepBySpace([
    caseStr("create"),
    caseStr("database"),
    identifier
]).map(result => ({ type: "statement", variant: "create", format: "database", name: result[2] }));

const createTbStmtParser = sequenceSepBySpace([
    caseStr("create"),
    caseStr("table"),
    ifNotExists,
    identifier,
    brackets(sepByOne(sequenceOf([space, str(","), space]))(columnDef))
]).map(result => ({
    type: "statement",
    variant: "create",
    format: "table",
    ifNotExists: result[2],
    name: result[3],
    defination: result[4]
}));

const useTbStmtParser = sequenceSepBySpace([
    caseStr("use"),
    caseStr("database"),
    identifier
]).map(result => ({ type: "statement", variant: "use", format: "database", name: result[2] }));

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
//             "CREATE TABLE i not exists Persons ( PersonID int, LastName char(255), FirstName char(255), Address char(255), City char(255) );"
//         ),
//         null,
//         "\t"
//     )
// );
const lastMatchedToken = sqlStmtListParser.run("use database").lastMatchedToken;

console.log(lastMatchedToken);

for (val of suggestions[lastMatchedToken].values()) {
    console.log(val);
}
