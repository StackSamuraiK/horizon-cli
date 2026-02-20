
function parsedArgs() {
    const args = process.argv.slice(2);

    let positionals = [];
    let flags = {};


    for (let arg of args) {

        //--template=react
        if (arg.startsWith("--") && arg.includes("=")) {
            const [key, value] = arg.slice(2).split("=");
            flags[key] = value;
        }

        // --force
        else if (arg.startsWith("--")) {
            flags[arg.slice(2)] = true;
        }

        //-v
        else if (arg.startsWith("-")) {
            flags[arg.slice(1)] = true;
        }

        // create myApp
        else {
            positionals.push(arg)
        }
    }
    return {
        command: positionals[0],
        positionals,
        flags
    }
}

export default parsedArgs;