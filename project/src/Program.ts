import { container } from "tsyringe";
import { App } from "./utils/App";
import { Container } from "./di/Container";
import type { PreAkiModLoader } from "./loaders/PreAkiModLoader";
import { Watermark } from "./utils/Watermark";
import { ErrorHandler } from "./ErrorHandler";

export class Program
{

    private errorHandler: ErrorHandler;
    constructor() 
    {
        // set window properties
        process.stdout.setEncoding("utf8");
        process.title = "SPT-AKI Server";
        this.errorHandler = new ErrorHandler();
    }
    
    public start(): void 
    {
        try
        {
            Container.registerTypes(container);
            const childContainer = container.createChildContainer();
            childContainer.resolve<Watermark>("Watermark");
            const preAkiModLoader = childContainer.resolve<PreAkiModLoader>("PreAkiModLoader");
            Container.registerListTypes(childContainer);
            preAkiModLoader.load(childContainer)
                .then(() => 
                {
                    Container.registerPostLoadTypes(container, childContainer);
                    childContainer.resolve<App>("App").load();
                }).catch(rej => this.errorHandler.handleCriticalError(rej));
            
        }
        catch (e)
        {
            this.errorHandler.handleCriticalError(e);
        }
    }
}
