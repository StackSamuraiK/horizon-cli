import parsedArgs from "./parser.js"
import router from "./router.js"

function main(){
	const parsed = parsedArgs()
	router(parsed)
}

main()