
const datatypeChecker = (definition, value) => {

    switch (definition.datatype){
        case "int":
            return typeof value === 'number'
        case "char":
            return typeof value === 'string' && value.length <= definition.args
        default:
            console.log("unknown datatype")
            return false;
    }
}

const dataSelector = (dataList, filter, needs) => {
    const results = []
    for(let data of dataList) {
        const op = filter.operation
        let result;
        const finalRes = {}
        switch (op) {
            case "=":
                if (data[filter.key] === filter.value) result = data;
            case ">":
                if (data[filter.key] > filter.value) result = data;
            case "<":
                if (data[filter.key] < filter.value) result = data;
        }
        needs.forEach(neededDataName => {
            finalRes[neededDataName] = result[neededDataName]
        })
        results.push(finalRes)
    }
    return results
}

module.exports = {datatypeChecker, dataSelector}