const commands = {
    create: ({ positionals, flags }) => {
        const projectName = positionals[1];

        if (!projectName) {
            console.log("❌ Project name required");
            return;
        }

        console.log(`Creating project: ${projectName}`);
        console.log("Flags:", flags);
        setTimeout(()=>{console.log(`Successfully created ${projectName} with template: ${flags.template}`)},5000)
    },

    delete: ({ positionals }) => {
        const projectName = positionals[1];

        if (!projectName) {
            console.log("❌ Project name required");
            return;
        }

        console.log(`Deleting project: ${projectName}`);
    },

    help: () => {
        console.log(`
Available Commands:
  create <name>   Create a new project
  delete <name>   Delete a project
  help            Show help
    `);
    }
}

export default commands