class StatementNode{
    constructor(){
        this.type = "statement"
    }
}

class ListStatementNode extends StatementNode{
    constructor(statements){
        super()
        this.variant = "list"
        this.statements = statements
    }
}

class SelectStatementNode extends StatementNode{
    constructor(result, from, where){
        super()
        this.variant = "select"
        this.result = result
        this.from = from
        this.where = where
    }
}

class CreateStatementNode extends StatementNode{
    constructor(format, name, definations, conditions) {
        super()
        this.variant = "create"
        this.format = format
        this.name = name
        this.definations = definations
        this.conditions = conditions
    }
}

class UseStatementNode extends StatementNode{
    constructor(name) {
        this.variant = "use"
        this.name = name
    }
}

class InsertStatementNode extends StatementNode{
    constructor(intoTable, intoColumns, results) {
        super()
        this.variant = "insert"
        this.intoTable = intoTable
        this.intoColumns = intoColumns
        this.results = results
    }
}

class UpdateStatementNode extends StatementNode {
    constructor(intoTable, set, where) {
        super()
        this.variant = "update"
        this.intoTable = intoTable
        this.set = set
        this.where = where
    }
}

class DeleteStatementNode extends StatementNode {
    constructor(from, where){
        super()
        this.variant = "delete"
        this.from = from
        this.where = where
    }
}

class DropStatementNode extends StatementNode {
    constructor(form, name) {
        super()
        this.variant = "drop"
        this.form = form
        this.name = name
    }
}



class Identifier {
    constructor(variant, name){
        this.type = "identifier"
        this.variant = variant
        this.name = name
    }
}




class DefinitionNode {
    constructor(variant, name, datatype){
        this.type = 'definitionNode'
        this.variant = variant
        this.name = name
        this.datatype = datatype
    }
}


class DataTypeNode {
    constructor() {
        this.type = "datatype"
    }
}

class IntDataTypeNode extends DataTypeNode {
    constructor() {
        super()
        this.variant = "int"
        this.affinity = "integer"
    }
}

class CharDataTypeNode extends DataTypeNode {
    constructor(args) {
        super()
        this.variant = "char"
        this.affinity = "text"
        this.args = args
    }
}

class ExpressNode {
    constructor() {
        this.type = "express"
    }
}

class OpExpressNode extends ExpressNode {
    constructor(operation, left, right) {
        super()
        this.variant = "operation"
        this.operation = operation
        this.left = left
        this.right = right
    }
}

class LiteralNode {
    constructor(variant, value){
        this.type = 'literal'
        this.variant = variant
        this.value = value
    }
}

class AssignmentNode {
    constructor(target, value) {
        this.type = "assignment"
        this.target = target
        this.value = value
    }
}


function literalNodeFactory(value){
    if (value.match(/\d+/)){
        return new LiteralNode('digit', parseInt(value))
    }else {
        return new LiteralNode('text', value)
    }
}

function dropStmtNodeFactory(form, name){
    let normalizedForm
    if(form.match(/table/i)){
        normalizedForm = table
    }else if(form.match(/databse/i)){
        normalizedForm = database
    }
    return new DropStatementNode(normalizedForm, name)
}


module.exports =  {
    ListStatementNode,
    SelectStatementNode,
    CreateStatementNode,
    UseStatementNode,
    InsertStatementNode,
    UpdateStatementNode,
    DeleteStatementNode,
    DropStatementNode,
    Identifier,
    DefinitionNode,
    IntDataTypeNode,
    CharDataTypeNode,
    LiteralNode,
    OpExpressNode,
    AssignmentNode,
    literalNodeFactory,
    dropStmtNodeFactory
}

