import commands from "./commands.js"


function router (parsed){
const handler = commands[parsed.command]

if(!handler){
    console.log("❌ Command not found")
    process.exit(1)
}

handler(parsed)
}

export default router