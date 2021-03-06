/**
 * Made by Patrick Pissurno
 * https://patrickpissurno.com.br
 * https://github.com/patrickpissurno
*/
const fs = require('fs');

const outerIfPattern = /if[\s\S]+?}[\n|}]*\n*(else[\s\S]+?}[\n|}]*)*/gm;

const INST_PATTERNS = {
    int : /^int [A-Za-z_]+[A-Za-z0-9_]* *= *[0-9]+$/,
    if : /if\( *(([A-Za-z_]+[A-Za-z0-9_]*)|[0-9]+) *(==|!=|<=|>=|>|<) *(([A-Za-z_]+[A-Za-z0-9_]*)|[0-9]+) *\)\n*{(.|\n)*}\n*(else\n*{(.|\n)*})?/
}


const code = fs.readFileSync('input.c').toString().replace(/\r/g, '').replace(/(?:^[ \t]+[^\w]*)|(?:^\/\/.*$)|(\n$)/gm, '');

const compiled = compile(code);
const result = replaceTokens(compiled.env.tokens, compiled.code);
console.log(result);
fs.writeFileSync('output.txt', result.replace(/\n/g, '\r\n'));

function compile(code, env){
    if(code.substr(code.length - 1, 1) == ';')
        code = code.substr(0, code.length - 1);

    let instArr = getInstArr(code);
    
    let nullEnv = env == null;
    if(nullEnv)
        env = 
        {
            vars : {},
            tokens : [],
            memAddr : 0
        }

    let result = '';

    for(let i = 0; i<instArr.length; i++)
    {
        let inst = instArr[i];
        // console.log(JSON.stringify(inst, ' ', 4) + "\n");
        
        if(INST_PATTERNS.int.test(inst.replace(/\n/g, '').trim()))
        {
            inst = inst.substring(4, inst.length).replace(/ /g, '').split('=');
            env.vars[inst[0]] = env.tokens.length;

            let format = getInstFormat('int');
            result += format.replace('{0}', inst[1]).replace('{1}', `{[${env.tokens.length}]}`);
            env.tokens.push(env.memAddr);

            env.memAddr += 4;
        }
        else if(INST_PATTERNS.if.test(inst.replace(/\n/g, '').trim()))
        {
            
            let cond = inst.substring(3, inst.indexOf(')'));
            if(cond.indexOf('==') != -1)
            {
                cond = cond.split(/ *== */);

                let format = getInstFormat('if');
                let part = format.replace(/\{0\}/g, `{[${env.vars[cond[0]]}]}`).replace(/\{1\}/g, `{[${env.vars[cond[1]]}]}`).replace(/\{2\}/g, i);

                let ifC = getClosing(inst, inst.indexOf('if'));
                let elseS = inst.indexOf('else', ifC);
                _if = inst.substring(inst.indexOf('{', inst.indexOf('if')) + 1, ifC - 1);

                if(elseS != -1)
                    _else = inst.substring(inst.indexOf('{', elseS) + 1, getClosing(inst, elseS) - 1);
                else
                    _else = "";

                _if = compile(_if, env);
                _else = compile(_else, env);
                
                result += part.replace(/\{3\}/g, '\n' + _if.code.trim()).replace(/\{4\}/g, (_else.code.length == 0 ? '' : '\n') + _else.code.trim()).trim() + '\n';
            }
            else
            {
                console.log(`\nFAILED: The instruction contained a condition that isn't implemented yet\n'${inst}'`);
                process.exit(1);
            }
        }
        else
        {
            console.log(`\nFAILED: Unknown instruction\n'${inst}'`);
            process.exit(1);
        }
    }

    if(nullEnv)
        result += 'EOF:\nj EOF'

    return {code: result, env : env};
}

function replaceTokens(tokens, code){
    let mipsInstrNum = (code.match(/\r?\n/g) || '').length;
    
    for(let i = 0; i<tokens.length; i++)
    {
        let pattern = new RegExp(`\\{\\[${i}\\]\\}`, 'g');

        code = code.replace(pattern, tokens[i] + (mipsInstrNum * 4));
    }
    return code;
}

function getInstArr(code){
    const exp = /(((?!;+\n}).{0}|^.{0,3});.*)|((?!}\n*else).{0}|^.{0,4})}(?!\n*})/g;
    split = [];
    
    ind = 0;
    while ((match = outerIfPattern.exec(code)) != null) {
    
        split = split.concat(code.substring(ind, match.index).replace(exp, '\\z\\').split('\\z\\'));
        split.push(match[0].trim());
    
        ind = match.index + match[0].length;
    }
    split = split.concat(code.substring(ind, code.length).replace(exp, '\\z\\').split('\\z\\'));
    split = split.filter(x => x.trim().length > 0);
    return split;
}

function getInstFormat(instType){
    let format;
    switch(instType)
    {
        case 'int':
            format =
`sub $0, $0, $0
addi $0, $0, {0}
sub $1, $1, $1
addi $1, $1, {1}
sw $0, 0($1)
`;
            return format;

        case 'if':
            format =
`sub $0, $0, $0
lw $0, {0}($0)
sub $1, $1, $1
lw $1, {1}($1)
beq $0, $1, IF{2}
ELSE{2}:{4}
j THEN{2}
IF{2}:{3}
THEN{2}:
`
            return format;

        default:
            return null;
    }
}



function getClosing(code, sI){
    let limit = 2000;
    let index = sI;
    let nest = 0;
    while(index < code.length)
    {
        let open = code.indexOf('{', index);
        let close = code.indexOf('}', index);

        if(close == -1)
            return index;
        else if(open == -1)
            open = close + 1;

        index = open < close ? open : close;
        nest += open < close ? 1 : -1;

        index ++;

        if(nest <= 0)
            return index;

        limit -= 1;
        if(limit < 0)
            return -9;
    }
    return index;
}