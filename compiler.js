/**
 * Made by Patrick Pissurno
 * https://patrickpissurno.com.br
 * https://github.com/patrickpissurno
*/
const fs = require('fs');


const INST_PATTERNS = {
    int : /int [A-Za-z]+[A-Za-z0-9_]* *= *[0-9]+/
}


const code = fs.readFileSync('input.txt').toString();
const result = compile(code);
console.log(result);

function compile(code){
    let instArr = code.substr(0, code.length - 1).split(';\r\n');
    let vars = {};
    let tokens = [];
    let memAddr = 0;

    let result = '';

    for(let i = 0; i<instArr.length; i++)
    {
        let inst = instArr[i].trim();
        if(INST_PATTERNS.int.test(inst))
        {
            inst = inst.substring(4, inst.length).replace(/ /g, '').split('=');
            vars[inst[0]] = memAddr;

            let format = getInstFormat('int');
            result += format.replace('{0}', inst[1]).replace('{1}', `{${tokens.length}}`);
            tokens.push(memAddr);

            memAddr += 4;
        }
    }

    result += 'EOF:\nj EOF'
    
    let mipsInstrNum = (result.match(/\r?\n/g) || '').length;

    for(let i = 0; i<tokens.length; i++)
        result = result.replace(`{${i}}`, tokens[i] + (mipsInstrNum * 4));

    return result;
}

function getInstFormat(instType){
    switch(instType)
    {
        case 'int':
            let format =
`sub $0, $0, $0
addi $0, $0, {0}
sub $1, $1, $1
addi $1, $1, {1}
sw $0, 0($1)
`;
            return format;
    }
}