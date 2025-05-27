import logger from "../utils/logger.js";


const setupErrorHandling = (client) => {
    client.on("shardError", (error) => {
        logger.error(`A websocket connection encountered an error: ${error.message}`, {
            errorStack: error.stack
        });
    });
    
    client.on("error", (error) => {
        logger.error(`Client connection error: ${error.message}`, {
            errorStack: error.stack
        });
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled Rejection at:', reason);
        console.log(reason)
        if (reason instanceof Error && reason.fatal) {
            process.exit(1);
        }
    });
};

export default setupErrorHandling;