import { DependencyContainer, injectable } from "tsyringe";
import { RouteAction } from "../../../di/Router";
import { StaticRouterMod } from "./StaticRouterMod";

@injectable()
export class StaticRouterModService 
{
    constructor(protected container: DependencyContainer) 
    {}
    public registerStaticRouter(
        name: string,
        routes: RouteAction[],
        topLevelRoute: string
    ): void 
    {
        this.container.register(name, {useValue: new StaticRouterMod(routes, topLevelRoute)});
        this.container.registerType("StaticRoutes", name);
    }
}