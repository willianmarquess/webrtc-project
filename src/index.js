import Application from "./Application.js";

function main() {
    try {
        new Application()
            .setup()
            .start();
    } catch (error) {
        console.log(('error: ', error));
        process.exit(1);
    }
}

main();